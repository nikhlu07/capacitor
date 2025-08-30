/**
 * Context Card Creation Service
 * Handles creation of encrypted context cards for company data sharing
 * Uses SignifyTS for all cryptographic operations
 */

import { signifyService } from './signifyService';
import { storageService } from './storage';
import { apiService } from './api';

export interface ContextCardRequest {
  requestId: string;
  companyAid: string;
  companyName: string;
  requestedFields: string[];
  purpose: string;
  companyPublicKey: string;
}

export interface ContextCardCreation {
  masterTravelData: any;
  approvedFields: string[];
  companyAid: string;
  companyPublicKey: string;
  purpose: string;
}

export interface CreatedContextCard {
  contextCardSaid: string;
  encryptedData: string;
  signature: string;
  approvedFields: string[];
}

class ContextCardCreationService {

  /**
   * Create encrypted context card for company
   * Uses SignifyTS to handle all cryptographic operations automatically
   */
  async createContextCard(creation: ContextCardCreation): Promise<CreatedContextCard> {
    try {
      console.log('🎫 Creating context card for company:', creation.companyAid.substring(0, 8) + '...');
      
      // 1. Get employee's SignifyTS client
      const client = await signifyService.getClient();
      if (!client) {
        throw new Error('SignifyTS client not available');
      }

      // 2. Get employee's AID and keys
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('Employee AID not found');
      }

      // 3. Filter master travel data to approved fields only
      const filteredData = this.filterToApprovedFields(
        creation.masterTravelData,
        creation.approvedFields
      );

      console.log('🔍 Filtered data to approved fields:', creation.approvedFields);

      // 4. Create context credential data
      const contextCredentialData = {
        employeeAid: employeeData.aid,
        companyAid: creation.companyAid,
        purpose: creation.purpose,
        approvedFields: creation.approvedFields,
        travelData: filteredData,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };

      // 5. SignifyTS automatically encrypts data for company
      // This uses X25519 key exchange under the hood
      const encryptedForCompany = await this.encryptDataForCompany(
        contextCredentialData,
        creation.companyAid,
        creation.companyPublicKey
      );

      // 6. Create ACDC context card credential
      // SignifyTS handles signing automatically with employee's keys
      const contextCardResult = await client.credentials().issue({
        issuer: employeeData.aid,
        recipient: creation.companyAid,
        schema: 'EContextTravelCardSchema', // This would be real schema SAID
        data: {
          encryptedContent: encryptedForCompany,
          metadata: {
            purpose: creation.purpose,
            approvedFields: creation.approvedFields,
            encryptedFor: creation.companyAid
          }
        }
      });

      const contextCardSaid = contextCardResult.acdc.d;

      // 7. Store context card metadata locally
      await this.storeContextCardLocally({
        said: contextCardSaid,
        companyAid: creation.companyAid,
        approvedFields: creation.approvedFields,
        purpose: creation.purpose,
        createdAt: new Date().toISOString()
      });

      // 8. Get employee's signature for verification
      const signature = await client.sign(employeeData.aid, contextCardSaid);

      console.log('✅ Context card created successfully:', contextCardSaid.substring(0, 8) + '...');

      return {
        contextCardSaid,
        encryptedData: encryptedForCompany,
        signature: signature.qb64,
        approvedFields: creation.approvedFields
      };

    } catch (error) {
      console.error('❌ Failed to create context card:', error);
      throw new Error(`Context card creation failed: ${error.message}`);
    }
  }

  /**
   * Filter master travel data to only include approved fields
   */
  private filterToApprovedFields(masterData: any, approvedFields: string[]): any {
    const filtered: any = {};
    
    // Define field mappings
    const fieldMappings = {
      'dietary': 'dietaryRequirements',
      'emergency_contact': 'emergencyContact',
      'flight_preferences': 'flightPreferences',
      'hotel_preferences': 'hotelPreferences',
      'accessibility_needs': 'accessibilityNeeds',
      'preferred_airlines': 'preferredAirlines',
      'frequent_flyer': 'frequentFlyerNumbers',
      'loyalty_programs': 'loyaltyPrograms'
    };

    // Filter data to only approved fields
    approvedFields.forEach(field => {
      const dataKey = fieldMappings[field] || field;
      if (masterData && masterData[dataKey] !== undefined) {
        filtered[dataKey] = masterData[dataKey];
      }
    });

    return filtered;
  }

  /**
   * Encrypt travel data for specific company using X25519
   * SignifyTS handles the cryptographic operations
   */
  private async encryptDataForCompany(
    data: any,
    companyAid: string,
    companyPublicKey: string
  ): Promise<string> {
    try {
      const client = await signifyService.getClient();
      if (!client) {
        throw new Error('SignifyTS client not available');
      }

      // Get employee's keys
      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('Employee AID not found');
      }

      // Use SignifyTS to encrypt data for company
      // This automatically handles X25519 key exchange
      const encrypted = await client.encrypt(
        JSON.stringify(data),
        companyPublicKey,  // Company's X25519 public key
        employeeData.aid   // Employee's AID (SignifyTS finds private key)
      );

      return encrypted.qb64;

    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Data encryption failed: ${error.message}`);
    }
  }

  /**
   * Store context card metadata locally for employee tracking
   */
  private async storeContextCardLocally(contextCard: any): Promise<void> {
    try {
      // Get existing context cards
      const existingCards = await storageService.getItem('context_cards') || [];
      
      // Add new card
      existingCards.push(contextCard);
      
      // Store updated list
      await storageService.setItem('context_cards', existingCards);
      
      console.log('💾 Context card metadata stored locally');
      
    } catch (error) {
      console.error('❌ Failed to store context card locally:', error);
      // Don't throw - this is not critical for the flow
    }
  }

  /**
   * Get all context cards created by employee
   */
  async getEmployeeContextCards(): Promise<any[]> {
    try {
      const contextCards = await storageService.getItem('context_cards') || [];
      return contextCards;
    } catch (error) {
      console.error('❌ Failed to get context cards:', error);
      return [];
    }
  }

  /**
   * Revoke context card (mark as inactive)
   */
  async revokeContextCard(contextCardSaid: string): Promise<boolean> {
    try {
      const client = await signifyService.getClient();
      if (!client) {
        throw new Error('SignifyTS client not available');
      }

      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.aid) {
        throw new Error('Employee AID not found');
      }

      // Revoke the credential in KERI
      await client.credentials().revoke(contextCardSaid, employeeData.aid);

      // Update local storage
      const contextCards = await storageService.getItem('context_cards') || [];
      const updatedCards = contextCards.map((card: any) => 
        card.said === contextCardSaid 
          ? { ...card, status: 'revoked', revokedAt: new Date().toISOString() }
          : card
      );
      await storageService.setItem('context_cards', updatedCards);

      console.log('🔄 Context card revoked:', contextCardSaid.substring(0, 8) + '...');
      return true;

    } catch (error) {
      console.error('❌ Failed to revoke context card:', error);
      return false;
    }
  }

  /**
   * Approve consent request and create context card
   * This is the main method called from consent approval UI
   */
  async approveConsentAndCreateCard(
    requestId: string,
    approvedFields: string[]
  ): Promise<boolean> {
    try {
      console.log('📝 Approving consent request:', requestId);
      console.log('✅ Approved fields:', approvedFields);

      // 1. Get employee's master travel card
      const masterCard = await storageService.getMasterTravelCard();
      if (!masterCard) {
        throw new Error('Master travel card not found');
      }

      // 2. Get consent request details
      const pendingRequests = await apiService.getPendingConsentRequests();
      const request = pendingRequests.find((req: any) => req.request_id === requestId);
      
      if (!request) {
        throw new Error('Consent request not found');
      }

      // 3. Create context card
      const contextCard = await this.createContextCard({
        masterTravelData: masterCard,
        approvedFields,
        companyAid: request.company_aid,
        companyPublicKey: request.company_public_key || 'placeholder', // TODO: Get real key
        purpose: request.purpose
      });

      // 4. Submit approval to backend
      const approvalResult = await apiService.approveConsentRequest({
        request_id: requestId,
        approved_fields: approvedFields,
        context_card_said: contextCard.contextCardSaid,
        employee_signature: contextCard.signature
      });

      if (approvalResult.success) {
        console.log('🎉 Consent approved and context card created successfully!');
        return true;
      } else {
        throw new Error('Failed to submit approval to backend');
      }

    } catch (error) {
      console.error('❌ Failed to approve consent and create card:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const contextCardCreationService = new ContextCardCreationService();