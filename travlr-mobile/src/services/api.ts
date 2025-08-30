import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration - Fixed for mobile device access
// Using your computer's IP address for mobile device connectivity
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.31.172:8001/api/v1'  // Use computer's IP for mobile device access  
  : 'https://api.travlr-id.com/api/v1';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Employee Registration Types
export interface EmployeeRegistration {
  employee_id: string;
  full_name: string;
  department: string;
  email: string;
  phone?: string;
}

export interface EmployeeAIDResponse {
  success: boolean;
  employee_id: string;
  aid: string;
  oobi: string;
  qr_code_data: string;
  created_at: string;
}

// Travel Preferences Types
export interface TravelPreferences {
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
}

// Credential Types
export interface CredentialResponse {
  success: boolean;
  credential_id: string;
  employee_id: string;
  aid: string;
  credential_type: string;
  issued_at: string;
  expires_at: string;
  status: string;
}

export interface CredentialListItem {
  credential_id: string;
  credential_type: string;
  issued_at: string;
  expires_at: string;
  status: string;
  has_flight_prefs: boolean;
  has_hotel_prefs: boolean;
  has_accessibility_needs: boolean;
  has_emergency_contact: boolean;
}

// Dashboard Types
export interface MobileDashboard {
  employee_id: string;
  aid: string;
  credentials_count: number;
  active_sharing: {
    scania: boolean;
    flight_prefs: boolean;
    hotel_prefs: boolean;
    accessibility_needs: boolean;
    emergency_contact: boolean;
    ai_processing: boolean;
  };
  recent_access: Array<{
    requester: string;
    purpose: string;
    fields_accessed: string[];
    timestamp: string;
    access_granted: boolean;
  }>;
  consent_status: string;
  last_updated: string;
}

// Consent Types
export interface ConsentUpdate {
  employee_id: string;
  share_with_scania: boolean;
  share_flight_prefs: boolean;
  share_hotel_prefs: boolean;
  share_accessibility_needs: boolean;
  share_emergency_contact: boolean;
  ai_processing_consent: boolean;
  reason?: string;
}

// Consent Request Types
export interface PendingConsentRequest {
  request_id: string;
  company_aid: string;
  company_name?: string;
  requested_fields: string[];
  purpose: string;
  created_at: string;
  expires_at: string;
}

export interface ConsentApproval {
  request_id: string;
  approved_fields: string[];
  employee_signature: string;
  context_card_said: string;
}

export interface ConsentDenial {
  reason?: string;
}

// QR Code Types
export interface QRCodeRequest {
  employee_id: string;
  data_to_share: string[];
  expires_in_minutes: number;
}

export interface QRCodeResponse {
  success: boolean;
  qr_code_data: {
    type: string;
    version: string;
    employee_id: string;
    aid: string;
    credential_id: string;
    oobi: string;
    shared_fields: string[];
    expires_at: string;
    generated_at: string;
    shared_data: Record<string, any>;
  };
  expires_at: string;
  shared_fields: string[];
  message: string;
}

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.timeout = 30000; // Increased to 30 seconds for slow connections
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await AsyncStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = 2
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const url = `${this.baseURL}${endpoint}`;
        const headers = await this.getAuthHeaders();
        
        // Create timeout handling for React Native compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, this.timeout);
        
        const response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            ...options.headers,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain errors
        if (error.name === 'AbortError' && attempt < retries) {
          console.warn(`API request aborted, retrying... (${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
        
        if (attempt === retries) {
          console.error('API Error after retries:', error.message);
          throw error;
        }
      }
    }
    
    throw lastError!;
  }

  // Employee Registration
  async registerEmployee(registration: EmployeeRegistration): Promise<EmployeeAIDResponse> {
    return await this.makeRequest<EmployeeAIDResponse>('/mobile/employee/register', {
      method: 'POST',
      body: JSON.stringify(registration),
    });
  }

  // Issue Travel Credential
  async issueTravelCredential(
    employeeId: string,
    preferences: TravelPreferences
  ): Promise<CredentialResponse> {
    return await this.makeRequest<CredentialResponse>(`/mobile/employee/${employeeId}/issue-credential`, {
      method: 'POST',
      body: JSON.stringify(preferences),
    });
  }

  // Get Employee Credentials
  async getEmployeeCredentials(employeeId: string): Promise<{
    employee_id: string;
    aid: string;
    total_credentials: number;
    credentials: CredentialListItem[];
  }> {
    return await this.makeRequest(`/mobile/employee/${employeeId}/credentials`);
  }

  // Get Mobile Dashboard
  async getMobileDashboard(employeeId: string): Promise<MobileDashboard> {
    return await this.makeRequest<MobileDashboard>(`/mobile/employee/${employeeId}/dashboard`);
  }

  // Update Consent
  async updateConsent(consent: ConsentUpdate): Promise<{
    success: boolean;
    employee_id: string;
    consent_id: string;
    updated_at: string;
    message: string;
  }> {
    return await this.makeRequest('/mobile/consent/update', {
      method: 'POST',
      body: JSON.stringify(consent),
    });
  }

  // Generate QR Code
  async generateQRCode(employeeId: string, request: QRCodeRequest): Promise<QRCodeResponse> {
    return await this.makeRequest<QRCodeResponse>(`/mobile/employee/${employeeId}/generate-qr`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Revoke Access
  async revokeAccess(employeeId: string, reason?: string): Promise<{
    success: boolean;
    employee_id: string;
    revoked_at: string;
    message: string;
  }> {
    return await this.makeRequest(`/mobile/employee/${employeeId}/revoke-access`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; service: string; version: string }> {
    return await this.makeRequest('/health');
  }

  // Store credential metadata (no crypto)
  async storeTravelCardMetadata(payload: {
    acdc_said: string;
    employee_aid: string;
    schema_said?: string;
    credential_type?: string;
    issued_at?: string;
    expires_at?: string;
  }): Promise<{ success: boolean; credential_said: string; status: string }> {
    return await this.makeRequest('/metadata/travel-card', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // === CONSENT WORKFLOW METHODS ===
  
  // Get pending consent requests for employee
  async getPendingConsentRequests(employeeAid: string): Promise<PendingConsentRequest[]> {
    return await this.makeRequest(`/consent/pending/${employeeAid}`);
  }
  
  // Approve consent request
  async approveConsentRequest(approval: ConsentApproval): Promise<{
    request_id: string;
    status: string;
    message: string;
  }> {
    return await this.makeRequest('/consent/approve', {
      method: 'POST',
      body: JSON.stringify(approval),
    });
  }
  
  // Deny consent request
  async denyConsentRequest(requestId: string, denial?: ConsentDenial): Promise<{
    request_id: string;
    status: string;
    message: string;
  }> {
    return await this.makeRequest(`/consent/deny/${requestId}`, {
      method: 'POST',
      body: JSON.stringify(denial || {}),
    });
  }
  
  // Get consent status
  async getConsentStatus(requestId: string): Promise<{
    request_id: string;
    status: string;
    created_at: string;
    expires_at: string;
    approved_fields?: string[];
    context_card_said?: string;
  }> {
    return await this.makeRequest(`/consent/status/${requestId}`);
  }
  
  // Revoke consent
  async revokeConsent(requestId: string): Promise<{
    request_id: string;
    status: string;
    message: string;
  }> {
    return await this.makeRequest(`/consent/revoke/${requestId}`, {
      method: 'DELETE',
    });
  }

  // Issue Credential to Recipient (for KERI ACDC issuance)
  async issueCredentialToRecipient(data: {
    recipient_aid: string;
    employee_id: string;
    credential_data: any;
  }): Promise<{
    credential_said: string;
    issued_at: string;
    expires_at: string;
  }> {
    return await this.makeRequest('/mobile/credential/issue-to-recipient', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;