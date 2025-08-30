/**
 * Veridian-Style Credential Service
 * Integrates your existing AID logic with Veridian's credential server pattern
 */

export interface TravelPreferences {
  employeeId: string;
  seatPreference: 'window' | 'aisle' | 'middle' | 'any';
  mealPreference: 'standard' | 'vegetarian' | 'vegan' | 'kosher' | 'halal' | 'gluten-free' | 'none';
  airlines?: string;
  emergencyContact?: string;
  allergies?: string;
}

export interface TravlrIdentity {
  aid: string;
  displayName: string;
  employeeId: string;
  created: string;
}

export interface CredentialResponse {
  success: boolean;
  data?: {
    credential: any;
    message: string;
    oobiResolution: string;
  };
  error?: string;
}

class VeridianCredentialService {
  private readonly serverUrl: string;
  private readonly schemaId = 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU';

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;
  }

  /**
   * Test server connectivity
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/ping`);
      const result = await response.json();
      console.log('🏥 Server Health:', result);
      return result.success;
    } catch (error) {
      console.error('❌ Server not reachable:', error);
      return false;
    }
  }

  /**
   * Verify schema is available via OOBI
   */
  async verifySchemaAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/oobi/${this.schemaId}`);
      if (response.ok) {
        const schema = await response.json();
        console.log('✅ Schema available:', schema.title);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Schema not available:', error);
      return false;
    }
  }

  /**
   * Issue travel preferences credential using your existing AID
   */
  async issueTravelPreferencesCredential(
    identity: TravlrIdentity, 
    preferences: TravelPreferences
  ): Promise<CredentialResponse> {
    try {
      console.log('🎫 Issuing credential for:', identity.displayName);
      console.log('📋 Preferences:', preferences);

      const response = await fetch(`${this.serverUrl}/credentials/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holderAid: identity.aid,
          travelPreferences: {
            employeeId: preferences.employeeId || identity.employeeId,
            seatPreference: preferences.seatPreference,
            mealPreference: preferences.mealPreference,
            airlines: preferences.airlines || '',
            emergencyContact: preferences.emergencyContact || '',
            allergies: preferences.allergies || ''
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Credential issued successfully:', result.data);
        return result;
      } else {
        console.error('❌ Credential issuance failed:', result.error);
        return result;
      }
    } catch (error: any) {
      console.error('❌ Network error:', error);
      return {
        success: false,
        error: `Network error: ${error.message}`
      };
    }
  }

  /**
   * Test integration with your frontend identity system
   */
  async testFrontendIntegration(
    identity: TravlrIdentity,
    preferences: TravelPreferences
  ): Promise<any> {
    try {
      console.log('🧪 Testing frontend integration...');
      
      const response = await fetch(`${this.serverUrl}/test-with-frontend-aid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity,
          preferences
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('❌ Integration test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get schema information
   */
  async getSchemaInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/schemas`);
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get schema info:', error);
      return { success: false, error: error.message };
    }
  }
}

export default VeridianCredentialService;