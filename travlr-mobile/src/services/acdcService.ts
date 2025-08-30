import { apiService } from './api';
import { storageService } from './storage';

// ACDC Credential Types
export interface ACDCCredential {
  said: string;  // Self-Addressing Identifier
  issuer_aid: string;
  recipient_aid: string;
  schema_said: string;
  credential_data: {
    employee_info: {
      employee_id: string;
      full_name: string;
      department: string;
      email: string;
      phone?: string;
    };
    travel_preferences: {
      flight_preferences?: {
        preferred_airlines?: string[];
        seating_preference?: string;
        meal_preference?: string;
        frequent_flyer_numbers?: Record<string, string>;
      };
      hotel_preferences?: {
        preferred_chains?: string[];
        room_type?: string;
        amenities?: string[];
        loyalty_programs?: Record<string, string>;
      };
      accessibility_needs?: {
        mobility_assistance?: boolean;
        dietary_restrictions?: string[];
        special_accommodations?: string[];
      };
      emergency_contact?: {
        name: string;
        relationship: string;
        phone: string;
        email?: string;
      };
      dietary_requirements?: string[];
      special_requests?: string;
    };
    metadata: {
      issued_via: string;
      credential_type: string;
      version: string;
      issued_at: string;
      expires_at: string;
    };
  };
  issued_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'revoked';
  verification_methods: string[];
  selective_disclosure: boolean;
}

export interface VerificationResult {
  credential_said: string;
  overall_status: 'valid' | 'invalid' | 'unknown';
  verification_level: string;
  checks: Array<{
    check_name: string;
    status: 'valid' | 'invalid';
    details?: string;
    error_message?: string;
  }>;
  trust_score: number;
  confidence_level?: string;
  warnings?: string[];
  recommendations?: string[];
  mobile_verification?: {
    employee_id: string;
    credential_type: string;
    issued_via: string;
    local_status: string;
    expires_at: string;
    selective_disclosure_enabled?: boolean;
  };
}

export interface SharingResult {
  success: boolean;
  sharing_id: string;
  credential_said: string;
  recipient_aid: string;
  disclosed_fields: string[];
  expires_at: string;
  access_url: string;
  qr_data: {
    type: string;
    sharing_id: string;
    credential_said: string;
    recipient_aid: string;
    access_url: string;
    expires_at: string;
  };
}

export interface SharedCredentialAccess {
  success: boolean;
  credential_said: string;
  disclosed_data: any;
  metadata: {
    issuer_aid: string;
    schema_said: string;
    issued_at: string;
    expires_at: string;
    verification_methods: string[];
  };
  sharing_info: {
    sharing_id: string;
    permission: string;
    expires_at: string;
    disclosed_fields: string[];
  };
}

class ACDCService {
  // Verify ACDC Credential
  async verifyCredential(
    credentialSaid: string,
    verificationLevel: 'basic' | 'standard' | 'comprehensive' = 'standard',
    verifyWitnesses: boolean = false
  ): Promise<VerificationResult> {
    try {
      const response = await apiService.api.post(
        `/mobile/credential/${credentialSaid}/verify`,
        {
          verification_level: verificationLevel,
          verify_witnesses: verifyWitnesses,
        }
      );

      const result: VerificationResult = response.data;

      // Store verification result locally for caching
      await storageService.setItem(`verification_${credentialSaid}`, {
        result,
        verified_at: new Date().toISOString(),
      });

      return result;
    } catch (error: any) {
      console.error('Failed to verify credential:', error);
      throw new Error(error.response?.data?.detail || 'Failed to verify credential');
    }
  }

  // Share ACDC Credential with Selective Disclosure
  async shareCredential(
    credentialSaid: string,
    recipientAid: string,
    disclosedFields?: string[],
    permission: string = 'read',
    expiresInHours: number = 24
  ): Promise<SharingResult> {
    try {
      const response = await apiService.api.post(
        `/mobile/credential/${credentialSaid}/share`,
        {
          recipient_aid: recipientAid,
          permission,
          disclosed_fields: disclosedFields,
          expires_in_hours: expiresInHours,
        }
      );

      const result: SharingResult = response.data;

      // Store sharing record locally
      await storageService.setItem(`sharing_${result.sharing_id}`, {
        ...result,
        created_at: new Date().toISOString(),
      });

      return result;
    } catch (error: any) {
      console.error('Failed to share credential:', error);
      throw new Error(error.response?.data?.detail || 'Failed to share credential');
    }
  }

  // Access Shared Credential
  async accessSharedCredential(
    sharingId: string,
    recipientAid: string
  ): Promise<SharedCredentialAccess> {
    try {
      const response = await apiService.api.get(
        `/mobile/shared-credential/${sharingId}`,
        {
          params: { recipient_aid: recipientAid },
        }
      );

      const result: SharedCredentialAccess = response.data;

      // Store accessed credential data locally (with expiry)
      await storageService.setItem(`accessed_${sharingId}`, {
        ...result,
        accessed_at: new Date().toISOString(),
      });

      return result;
    } catch (error: any) {
      console.error('Failed to access shared credential:', error);
      throw new Error(error.response?.data?.detail || 'Failed to access shared credential');
    }
  }

  // Generate QR Code for Credential Sharing
  async generateSharingQR(
    credentialSaid: string,
    recipientAid: string,
    disclosedFields?: string[],
    expiresInHours: number = 1
  ): Promise<{
    qr_data: any;
    sharing_url: string;
    expires_at: string;
  }> {
    try {
      // First share the credential
      const sharingResult = await this.shareCredential(
        credentialSaid,
        recipientAid,
        disclosedFields,
        'read',
        expiresInHours
      );

      // Generate QR code data
      const qrData = {
        type: 'travlr_acdc_access',
        version: '1.0',
        sharing_id: sharingResult.sharing_id,
        credential_said: credentialSaid,
        recipient_aid: recipientAid,
        access_url: sharingResult.access_url,
        disclosed_fields: sharingResult.disclosed_fields,
        expires_at: sharingResult.expires_at,
        verification_required: true,
      };

      return {
        qr_data: qrData,
        sharing_url: sharingResult.access_url,
        expires_at: sharingResult.expires_at,
      };
    } catch (error: any) {
      console.error('Failed to generate sharing QR:', error);
      throw new Error(error.message || 'Failed to generate sharing QR');
    }
  }

  // Validate ACDC QR Code
  validateACDCQR(qrData: string): {
    isValid: boolean;
    data?: any;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(qrData);

      // Check if it's an ACDC credential QR
      if (parsed.type !== 'travlr_acdc_access' && parsed.type !== 'travlr_employee_aid') {
        return {
          isValid: false,
          error: 'Invalid ACDC QR code type',
        };
      }

      // Check required fields
      const requiredFields = ['sharing_id', 'credential_said', 'access_url'];
      for (const field of requiredFields) {
        if (!parsed[field]) {
          return {
            isValid: false,
            error: `Missing required field: ${field}`,
          };
        }
      }

      // Check expiry
      if (parsed.expires_at) {
        const expiryDate = new Date(parsed.expires_at);
        if (expiryDate <= new Date()) {
          return {
            isValid: false,
            error: 'ACDC access has expired',
          };
        }
      }

      return {
        isValid: true,
        data: parsed,
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid QR code format',
      };
    }
  }

  // Get Credential Trust Score
  async getCredentialTrustScore(credentialSaid: string): Promise<{
    trust_score: number;
    confidence_level: string;
    factors: string[];
  }> {
    try {
      // Check if we have a cached verification result
      const cachedVerification = await storageService.getItem<{
        result: VerificationResult;
        verified_at: string;
      }>(`verification_${credentialSaid}`);

      if (cachedVerification) {
        const ageMinutes = (Date.now() - new Date(cachedVerification.verified_at).getTime()) / (1000 * 60);
        
        // Use cached result if less than 30 minutes old
        if (ageMinutes < 30) {
          const result = cachedVerification.result;
          return {
            trust_score: result.trust_score,
            confidence_level: result.confidence_level || 'medium',
            factors: result.checks.map(check => check.check_name),
          };
        }
      }

      // Perform fresh verification
      const verification = await this.verifyCredential(credentialSaid, 'comprehensive', true);
      
      return {
        trust_score: verification.trust_score,
        confidence_level: verification.confidence_level || 'medium',
        factors: verification.checks.map(check => check.check_name),
      };
    } catch (error: any) {
      console.error('Failed to get trust score:', error);
      return {
        trust_score: 0,
        confidence_level: 'unknown',
        factors: ['verification_failed'],
      };
    }
  }

  // Check Credential Expiry Status
  async checkCredentialExpiry(credentialSaid: string): Promise<{
    is_expired: boolean;
    expires_at: string;
    days_until_expiry: number;
    renewal_recommended: boolean;
  }> {
    try {
      const credentials = await storageService.getCredentials();
      const credential = credentials.find(c => c.credential_id === credentialSaid);

      if (!credential) {
        throw new Error('Credential not found');
      }

      const expiryDate = new Date(credential.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        is_expired: expiryDate <= now,
        expires_at: credential.expires_at,
        days_until_expiry: daysUntilExpiry,
        renewal_recommended: daysUntilExpiry <= 30,
      };
    } catch (error: any) {
      console.error('Failed to check credential expiry:', error);
      throw new Error(error.message || 'Failed to check credential expiry');
    }
  }

  // Get Selective Disclosure Options
  getSelectiveDisclosureOptions(): {
    category: string;
    fields: Array<{
      path: string;
      label: string;
      description: string;
      sensitive: boolean;
    }>;
  }[] {
    return [
      {
        category: 'Employee Information',
        fields: [
          {
            path: 'employee_info.full_name',
            label: 'Full Name',
            description: 'Employee full name',
            sensitive: false,
          },
          {
            path: 'employee_info.department',
            label: 'Department',
            description: 'Employee department',
            sensitive: false,
          },
          {
            path: 'employee_info.email',
            label: 'Email',
            description: 'Employee email address',
            sensitive: true,
          },
          {
            path: 'employee_info.phone',
            label: 'Phone',
            description: 'Employee phone number',
            sensitive: true,
          },
        ],
      },
      {
        category: 'Flight Preferences',
        fields: [
          {
            path: 'travel_preferences.flight_preferences.preferred_airlines',
            label: 'Preferred Airlines',
            description: 'Preferred airline companies',
            sensitive: false,
          },
          {
            path: 'travel_preferences.flight_preferences.seating_preference',
            label: 'Seating Preference',
            description: 'Preferred seating type',
            sensitive: false,
          },
          {
            path: 'travel_preferences.flight_preferences.meal_preference',
            label: 'Meal Preference',
            description: 'Preferred meal type',
            sensitive: false,
          },
          {
            path: 'travel_preferences.flight_preferences.frequent_flyer_numbers',
            label: 'Frequent Flyer Numbers',
            description: 'Airline loyalty program numbers',
            sensitive: true,
          },
        ],
      },
      {
        category: 'Hotel Preferences',
        fields: [
          {
            path: 'travel_preferences.hotel_preferences.preferred_chains',
            label: 'Preferred Hotel Chains',
            description: 'Preferred hotel companies',
            sensitive: false,
          },
          {
            path: 'travel_preferences.hotel_preferences.room_type',
            label: 'Room Type',
            description: 'Preferred room type',
            sensitive: false,
          },
          {
            path: 'travel_preferences.hotel_preferences.amenities',
            label: 'Amenities',
            description: 'Required hotel amenities',
            sensitive: false,
          },
        ],
      },
      {
        category: 'Emergency Contact',
        fields: [
          {
            path: 'travel_preferences.emergency_contact.name',
            label: 'Emergency Contact Name',
            description: 'Emergency contact person name',
            sensitive: true,
          },
          {
            path: 'travel_preferences.emergency_contact.phone',
            label: 'Emergency Contact Phone',
            description: 'Emergency contact phone number',
            sensitive: true,
          },
        ],
      },
    ];
  }
}

// Export singleton instance
export const acdcService = new ACDCService();
export default acdcService;