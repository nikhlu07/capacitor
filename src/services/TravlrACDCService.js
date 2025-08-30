/**
 * Travlr ACDC Service - Creates REAL ACDC credentials using our schema server
 * Integrates with main frontend src/
 */

class TravlrACDCService {
  constructor() {
    this.credentialServerUrl = 'http://localhost:3008';
    this.travelSchemaId = 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU';
  }

  /**
   * Create a real ACDC travel preferences credential
   * Same logic as your frontend - just calls our credential server
   */
  async createTravelCredential(issuerAid, holderAid, travelPreferences) {
    try {
      console.log('🎫 Creating REAL ACDC travel credential...');
      console.log('👤 Issuer AID:', issuerAid);
      console.log('👤 Holder AID:', holderAid);
      console.log('📋 Travel Preferences:', travelPreferences);

      const response = await fetch(`${this.credentialServerUrl}/issueAcdcCredential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schemaSaid: this.travelSchemaId,
          aid: holderAid,
          issuerAid: issuerAid,
          attribute: {
            employeeId: travelPreferences.employeeId || 'TRAVLR-001',
            seatPreference: travelPreferences.seatPreference || 'window',
            mealPreference: travelPreferences.mealPreference || 'vegetarian',
            airlines: travelPreferences.airlines || 'Travlr Airways',
            emergencyContact: travelPreferences.emergencyContact || 'Emergency Contact',
            allergies: travelPreferences.allergies || 'None'
          }
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ REAL ACDC credential created successfully!');
        console.log('🆔 Credential ID:', result.data.credentialId);
        
        return {
          success: true,
          credentialId: result.data.credentialId,
          schemaId: this.travelSchemaId,
          issuer: issuerAid,
          holder: holderAid,
          data: result.data
        };
      } else {
        console.error('❌ Failed to create credential:', result);
        throw new Error(result.data || 'Failed to create credential');
      }
    } catch (error) {
      console.error('❌ Credential creation error:', error.message);
      throw error;
    }
  }

  /**
   * Test if our credential server is working
   */
  async testCredentialServer() {
    try {
      const response = await fetch(`${this.credentialServerUrl}/ping`);
      const result = await response.text();
      return result === 'pong';
    } catch (error) {
      console.error('❌ Credential server not available:', error);
      return false;
    }
  }

  /**
   * Get our travel schema via OOBI
   */
  async getTravelSchema() {
    try {
      const response = await fetch(`${this.credentialServerUrl}/oobi/${this.travelSchemaId}`);
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get schema:', error);
      throw error;
    }
  }

  /**
   * Get available schemas from our server
   */
  async getAvailableSchemas() {
    try {
      const response = await fetch(`${this.credentialServerUrl}/schemas`);
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to get schemas:', error);
      throw error;
    }
  }

  /**
   * Integration with your existing frontend logic
   * Call this from your React components
   */
  async createCredentialFromForm(formData) {
    try {
      // Test server first
      const serverReady = await this.testCredentialServer();
      if (!serverReady) {
        throw new Error('Credential server not available');
      }

      // You need to provide these from your existing AID management
      const issuerAid = formData.issuerAid || 'YOUR_ISSUER_AID_HERE';
      const holderAid = formData.holderAid || 'YOUR_HOLDER_AID_HERE';

      // Create the credential
      const credential = await this.createTravelCredential(
        issuerAid,
        holderAid,
        formData.travelPreferences
      );

      return credential;
    } catch (error) {
      console.error('❌ Form submission failed:', error);
      throw error;
    }
  }
}

// Export for use in your frontend
export default TravlrACDCService;

// Also make it available globally if needed
window.TravlrACDCService = TravlrACDCService;