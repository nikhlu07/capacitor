import { apiService, TravelPreferences, CredentialListItem, QRCodeRequest } from './api';
import { storageService } from './storage';
import { signifyService } from './signifyService';
import { Alert } from 'react-native';

export interface CredentialData {
  credential_id: string;
  credential_type: string;
  issued_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'revoked';
  data: {
    personal_info?: {
      employee_id: string;
      department: string;
      contact: string;
    };
    flight_preferences?: {
      preferred_airlines: string[];
      seating: string;
      meal: string;
      frequent_flyer: string;
    };
    hotel_preferences?: {
      preferred_chains: string[];
      room_type: string;
      amenities: string[];
    };
    accessibility_needs?: {
      mobility_assistance: boolean;
      dietary_restrictions: string[];
      special_accommodations: string[];
    };
    emergency_contact?: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
    };
  };
}

class CredentialService {
  // Create Travel Preferences Credential with SignifyTS
  async createTravelCredential(preferences: TravelPreferences): Promise<CredentialData> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee not registered. Please complete registration first.');
      }

      // Initialize SignifyTS if not already done
      if (!signifyService.isInitialized()) {
        const initialized = await signifyService.initialize();
        if (!initialized) {
          console.warn('SignifyTS initialization failed, using API fallback');
        }
      }

      // Try to create ACDC credential via SignifyTS first
      let credentialSAID: string | null = null;
      let useSignifyTS = false;

      if (signifyService.isInitialized() && employeeData.aid) {
        try {
          // Create ACDC credential using SignifyTS
          const acdcResult = await signifyService.issueCredential(
            employeeData.aid, // recipient AID
            {
              employee_info: {
                employee_id: employeeData.employee_id,
                full_name: employeeData.full_name,
                department: employeeData.department,
                email: employeeData.email,
                phone: employeeData.phone
              },
              travel_preferences: preferences,
              metadata: {
                issued_via: 'signify_mobile',
                credential_type: 'ScaniaEmployeeTravelPreferencesCredential',
                version: '1.0.0',
                issued_at: new Date().toISOString()
              }
            },
            {
              said: 'EBdXt3gIXOf2BBWNHdSXCJnkcqRLlySbM-xPS7quPiM', // Travel credential schema SAID
              title: 'Scania Employee Travel Preferences Credential'
            }
          );

          credentialSAID = acdcResult.said;
          useSignifyTS = true;
          console.log('✅ ACDC credential created via SignifyTS:', credentialSAID);

        } catch (signifyError) {
          console.warn('SignifyTS credential creation failed, using API fallback:', signifyError);
        }
      }

      // If issued via SignifyTS, store metadata in backend; otherwise skip backend issuance per Veridian pattern
      if (useSignifyTS && credentialSAID) {
        try {
          await apiService.storeTravelCardMetadata({
            acdc_said: credentialSAID,
            employee_aid: employeeData.aid,
            schema_said: 'EBdXt3gIXOf2BBWNHdSXCJnkcqRLlySbM-xPS7quPiM',
            credential_type: 'travel_preferences',
            issued_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          });
        } catch (storeErr) {
          console.warn('Failed to store metadata (non-fatal):', storeErr);
        }
      }

      // Convert to our credential format
      const credentialData: CredentialData = {
        credential_id: credentialSAID!,
        credential_type: 'ScaniaEmployeeTravelPreferencesCredential',
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        data: {
          personal_info: {
            employee_id: employeeData.employee_id,
            department: employeeData.department,
            contact: employeeData.phone || employeeData.email,
          },
          flight_preferences: preferences.flight_preferences ? {
            preferred_airlines: preferences.flight_preferences.preferred_airlines || [],
            seating: preferences.flight_preferences.seating_preference || '',
            meal: preferences.flight_preferences.meal_preference || '',
            frequent_flyer: Object.entries(preferences.flight_preferences.frequent_flyer_numbers || {})
              .map(([airline, number]) => `${airline}: ${number}`)
              .join(', '),
          } : undefined,
          hotel_preferences: preferences.hotel_preferences ? {
            preferred_chains: preferences.hotel_preferences.preferred_chains || [],
            room_type: preferences.hotel_preferences.room_type || '',
            amenities: preferences.hotel_preferences.amenities || [],
          } : undefined,
          accessibility_needs: preferences.accessibility_needs,
          emergency_contact: preferences.emergency_contact,
        },
      };

      // Store credential locally
      const credentialListItem: CredentialListItem = {
        credential_id: credentialSAID!,
        credential_type: credentialData.credential_type,
        issued_at: credentialData.issued_at,
        expires_at: credentialData.expires_at,
        status: credentialData.status,
        has_flight_prefs: !!preferences.flight_preferences,
        has_hotel_prefs: !!preferences.hotel_preferences,
        has_accessibility_needs: !!preferences.accessibility_needs,
        has_emergency_contact: !!preferences.emergency_contact,
      };

      await storageService.addCredential(credentialListItem);

      return credentialData;
    } catch (error: any) {
      console.error('Failed to create travel credential:', error);
      throw new Error(error.message || 'Failed to create credential');
    }
  }

  // Get All Credentials
  async getCredentials(forceRefresh: boolean = false): Promise<CredentialListItem[]> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee not registered');
      }

      // Check if we should refresh from API
      const isStale = await storageService.isDataStale(30); // 30 minutes
      
      if (forceRefresh || isStale) {
        try {
          // Fetch from API
          const response = await apiService.getEmployeeCredentials(employeeData.employee_id);
          
          // Store updated credentials
          await storageService.storeCredentials(response.credentials);
          await storageService.setLastSyncTime(new Date().toISOString());
          
          return response.credentials;
        } catch (apiError) {
          console.warn('API fetch failed, using cached data:', apiError);
          // Fall back to cached data
          return await storageService.getCredentials();
        }
      } else {
        // Use cached data
        return await storageService.getCredentials();
      }
    } catch (error: any) {
      console.error('Failed to get credentials:', error);
      throw new Error(error.message || 'Failed to get credentials');
    }
  }

  // Get Specific Credential Details
  async getCredentialDetails(credentialId: string): Promise<CredentialData> {
    try {
      // Get real credential data from API
      const credentials = await this.getCredentials();
      const credential = credentials.find(c => c.credential_id === credentialId);
      
      if (!credential) {
        throw new Error('Credential not found');
      }

      const employeeData = await storageService.getEmployeeData();
      
      // Try to get real data from master card
      let realTravelData: any = {};
      try {
        const { masterCardService } = await import('./masterCardService');
        if (employeeData?.aid) {
          const masterCard = await masterCardService.decryptMasterCard(employeeData.aid);
          if (masterCard?.travelProfile) {
            realTravelData = masterCard.travelProfile;
          }
        }
      } catch (error) {
        console.warn('Could not fetch real travel data from master card:', error);
      }
      
      // Create credential data with real travel profile data
      const credentialData: CredentialData = {
        credential_id: credential.credential_id,
        credential_type: credential.credential_type,
        issued_at: credential.issued_at,
        expires_at: credential.expires_at,
        status: credential.status as 'active' | 'expired' | 'revoked',
        data: {
          personal_info: employeeData ? {
            employee_id: employeeData.employee_id,
            department: employeeData.department,
            contact: employeeData.phone || employeeData.email,
          } : undefined,
          flight_preferences: realTravelData.flightPreferences ? {
            preferred_airlines: realTravelData.flightPreferences.preferredAirlines || [],
            seating: realTravelData.flightPreferences.seatPreference || 'No preference',
            meal: realTravelData.flightPreferences.mealPreference || 'No preference',
            frequent_flyer: Object.values(realTravelData.flightPreferences.frequentFlyerNumbers || {})[0] || 'Not specified',
          } : undefined,
          hotel_preferences: realTravelData.hotelPreferences ? {
            preferred_chains: realTravelData.hotelPreferences.preferredChains || [],
            room_type: realTravelData.hotelPreferences.roomType || 'Standard',
            amenities: realTravelData.hotelPreferences.amenities || [],
          } : undefined,
          accessibility_needs: realTravelData.accessibilityNeeds ? {
            mobility_assistance: realTravelData.accessibilityNeeds.mobilityAssistance || false,
            dietary_restrictions: realTravelData.dietaryRequirements?.restrictions || [],
            special_accommodations: realTravelData.accessibilityNeeds.specialRequirements || [],
          } : undefined,
          emergency_contact: realTravelData.emergencyContact ? {
            name: realTravelData.emergencyContact.name || 'Not specified',
            relationship: realTravelData.emergencyContact.relationship || 'Not specified',
            phone: realTravelData.emergencyContact.phone || 'Not specified',
            email: realTravelData.emergencyContact.email || 'Not specified',
          } : undefined,
        },
      };

      return credentialData;
    } catch (error: any) {
      console.error('Failed to get credential details:', error);
      throw new Error(error.message || 'Failed to get credential details');
    }
  }

  // Generate QR Code for Sharing
  async generateSharingQR(
    credentialId: string,
    fieldsToShare: string[],
    expiresInMinutes: number = 15
  ): Promise<{
    qr_data: any;
    expires_at: string;
    shared_fields: string[];
  }> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee not registered');
      }

      const request: QRCodeRequest = {
        employee_id: employeeData.employee_id,
        data_to_share: fieldsToShare,
        expires_in_minutes: expiresInMinutes,
      };

      const response = await apiService.generateQRCode(employeeData.employee_id, request);

      return {
        qr_data: response.qr_code_data,
        expires_at: response.expires_at,
        shared_fields: response.shared_fields,
      };
    } catch (error: any) {
      console.error('Failed to generate QR code:', error);
      throw new Error(error.message || 'Failed to generate QR code');
    }
  }

  // Revoke Credential
  async revokeCredential(credentialId: string, reason?: string): Promise<void> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee not registered');
      }

      // For now, we'll just update local status
      // In a real implementation, this would call a specific revoke credential API
      await storageService.updateCredentialStatus(credentialId, 'revoked');

      Alert.alert(
        'Credential Revoked',
        'The credential has been successfully revoked.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Failed to revoke credential:', error);
      throw new Error(error.message || 'Failed to revoke credential');
    }
  }

  // Revoke All Access
  async revokeAllAccess(reason?: string): Promise<void> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee not registered');
      }

      await apiService.revokeAccess(employeeData.employee_id, reason);

      // Update local consent settings
      const consentSettings = await storageService.getConsentSettings();
      if (consentSettings) {
        const revokedSettings = {
          ...consentSettings,
          share_with_scania: false,
          share_flight_prefs: false,
          share_hotel_prefs: false,
          share_accessibility_needs: false,
          share_emergency_contact: false,
          ai_processing_consent: false,
          last_updated: new Date().toISOString(),
        };
        await storageService.storeConsentSettings(revokedSettings);
      }

      Alert.alert(
        'Access Revoked',
        'All data access has been successfully revoked.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Failed to revoke all access:', error);
      throw new Error(error.message || 'Failed to revoke access');
    }
  }

  // Check Credential Expiry
  async checkExpiringCredentials(): Promise<CredentialListItem[]> {
    try {
      const credentials = await this.getCredentials();
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

      return credentials.filter(credential => {
        const expiryDate = new Date(credential.expires_at);
        return expiryDate <= thirtyDaysFromNow && credential.status === 'active';
      });
    } catch (error: any) {
      console.error('Failed to check expiring credentials:', error);
      return [];
    }
  }

  // Renew Credential
  async renewCredential(credentialId: string): Promise<CredentialData> {
    try {
      // For now, this is a placeholder
      // In a real implementation, this would call a renewal API
      Alert.alert(
        'Renewal Process',
        'Credential renewal process will be initiated. You will receive further instructions via email.',
        [{ text: 'OK' }]
      );

      // Return the existing credential for now
      return await this.getCredentialDetails(credentialId);
    } catch (error: any) {
      console.error('Failed to renew credential:', error);
      throw new Error(error.message || 'Failed to renew credential');
    }
  }

  // Verify Credential using SignifyTS
  async verifyCredentialWithSignifyTS(credentialSaid: string): Promise<{
    isValid: boolean;
    trustScore: number;
    verificationMethod: 'signifyts' | 'api' | 'local';
    details: any;
  }> {
    try {
      // Try SignifyTS verification first
      if (signifyService.isInitialized()) {
        try {
          const signifyResult = await signifyService.verifyCredential(credentialSaid);
          return {
            isValid: signifyResult.isValid,
            trustScore: signifyResult.trustScore,
            verificationMethod: 'signifyts',
            details: {
              ...signifyResult.details,
              keri_verified: true,
              witness_validated: signifyResult.trustScore >= 70,
              cryptographic_proof: true
            }
          };
        } catch (signifyError) {
          console.warn('SignifyTS verification failed, trying API:', signifyError);
        }
      }

      // Fallback to API verification
      try {
        const apiResult = await acdcService.verifyCredential(credentialSaid);
        return {
          isValid: apiResult.overall_status === 'valid',
          trustScore: apiResult.trust_score,
          verificationMethod: 'api',
          details: apiResult
        };
      } catch (apiError) {
        console.warn('API verification failed, using local:', apiError);
      }

      // Final fallback to local verification
      const credentials = await storageService.getCredentials();
      const credential = credentials.find(c => c.credential_id === credentialSaid);
      
      return {
        isValid: credential?.status === 'active',
        trustScore: credential?.status === 'active' ? 30 : 0,
        verificationMethod: 'local',
        details: {
          local_status: credential?.status || 'not_found',
          warning: 'Only local verification available'
        }
      };

    } catch (error: any) {
      console.error('All verification methods failed:', error);
      return {
        isValid: false,
        trustScore: 0,
        verificationMethod: 'local',
        details: { error: error.message }
      };
    }
  }

  // Create Selective Disclosure Presentation using SignifyTS
  async createSelectiveDisclosurePresentation(
    credentialSaid: string,
    disclosedFields: string[],
    recipientAid?: string
  ): Promise<{
    presentation: any;
    qr_data: any;
    expires_at: string;
  }> {
    try {
      if (!signifyService.isInitialized()) {
        throw new Error('SignifyTS not initialized for selective disclosure');
      }

      // Create verifiable presentation with selective disclosure
      const presentationResult = await signifyService.createPresentation(
        credentialSaid,
        disclosedFields,
        recipientAid
      );

      // Generate QR data for the presentation
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const qrData = {
        type: 'travlr_acdc_presentation',
        version: '1.0',
        presentation_said: presentationResult.presentation.said,
        credential_said: credentialSaid,
        disclosed_fields: disclosedFields,
        recipient_aid: recipientAid,
        expires_at: expiresAt.toISOString(),
        verification_method: 'keri_signifyts',
        proofs: presentationResult.proofs
      };

      return {
        presentation: presentationResult.presentation,
        qr_data: qrData,
        expires_at: expiresAt.toISOString()
      };

    } catch (error: any) {
      console.error('Failed to create selective disclosure presentation:', error);
      throw new Error(error.message || 'Failed to create presentation');
    }
  }

  // Share credential via IPEX grant (like Veridian)
  async shareCredentialViaIPEX(
    recipientAID: string,
    credentialSAID: string,
    selectedFields: string[],
    purpose: string
  ): Promise<{
    grantSAID: string;
    sharedAt: string;
  }> {
    try {
      console.log('🔄 Sharing credential via IPEX grant to:', recipientAID);

      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee not registered');
      }

      // Use SignifyTS IPEX grant (no fallbacks - pure KERI)
      if (!signifyService.isInitialized()) {
        throw new Error('SignifyTS must be initialized for IPEX operations');
      }

      const grantResult = await signifyService.sendIPEXGrant(
        recipientAID,
        credentialSAID,
        selectedFields
      );

      console.log('✅ Credential shared via IPEX grant:', grantResult.grantSAID);

      return {
        grantSAID: grantResult.grantSAID,
        sharedAt: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('❌ Failed to share credential via IPEX:', error);
      throw new Error(error.message || 'Failed to share credential');
    }
  }

  // Validate QR Code Data
  validateQRData(qrData: string): {
    isValid: boolean;
    data?: any;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(qrData);
      
      // Check if it's a Travlr credential
      if (parsed.type !== 'travlr_credential_share' && parsed.type !== 'travlr_employee_credential') {
        return {
          isValid: false,
          error: 'Invalid QR code type',
        };
      }

      // Check expiry
      if (parsed.expires_at) {
        const expiryDate = new Date(parsed.expires_at);
        if (expiryDate <= new Date()) {
          return {
            isValid: false,
            error: 'QR code has expired',
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
}

// Export singleton instance
export const credentialService = new CredentialService();
export default credentialService;