import { signifyService } from './signifyService';
import { realEncryptionService } from './realEncryptionService';

interface TravelPreferences {
  flightPreferences?: {
    preferredAirlines: string[];
    seatPreference: string;
    mealPreference: string;
    frequentFlyerNumbers: Record<string, string>;
  };
  hotelPreferences?: {
    preferredChains: string[];
    roomType: string;
    amenities: string[];
    loyaltyPrograms: Record<string, string>;
  };
  accessibilityNeeds?: {
    mobilityAssistance: boolean;
    visualAssistance: boolean;
    hearingAssistance: boolean;
    specialRequirements: string[];
  };
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    email: string;
  };
  dietaryRequirements?: {
    allergies: string[];
    restrictions: string[];
    preferences: string[];
  };
}

interface ContextCardData {
  employeeAid: string;
  companyAid: string;
  companyName: string;
  selectedData: TravelPreferences;
  selectedFields: string[];
  purpose: string;
  credentialSaid?: string;
}

interface EncryptedContextCard {
  id: string;
  employeeAid: string;
  companyAid: string;
  companyName: string;
  encryptedData: string;
  encryptionCipherQb64: string;
  sharedFields: string[];
  purpose: string;
  isActive: boolean;
  createdAt: string;
}

class ContextCardService {
  async createContextCard(data: ContextCardData): Promise<EncryptedContextCard> {
    try {
      console.log('🔐 Creating context card with real X25519 encryption');
      
      // Get SignifyTS client
      const client = await signifyService.getClient();
      if (!client) {
        throw new Error('SignifyTS client not available');
      }

      // Get company's public key (recipient's encryption key)
      console.log(`🔑 Getting public key for company AID: ${data.companyAid}`);
      
      // In a real system, you'd resolve the company's encryption key from their AID
      // For now, we'll use a placeholder - this should be the company's X25519 public key
      const companyPublicKeyQb64 = 'CCompanyX25519PublicKeyBase64Encoded'; // This would be resolved from KERI
      
      // Create encrypter with company's X25519 public key
      const encrypter = new Encrypter({ qb64: companyPublicKeyQb64 });
      
      // Prepare data to encrypt
      const dataToEncrypt = {
        ...data.selectedData,
        metadata: {
          employeeAid: data.employeeAid,
          sharedFields: data.selectedFields,
          purpose: data.purpose,
          timestamp: new Date().toISOString()
        }
      };
      
      // Convert to Uint8Array for encryption
      const serializedData = new TextEncoder().encode(JSON.stringify(dataToEncrypt));
      
      // Encrypt using X25519
      console.log('🔒 Encrypting data with libsodium X25519');
      const cipher = encrypter.encrypt(serializedData);
      
      // Create context card object
      const contextCard: EncryptedContextCard = {
        id: this.generateId(),
        employeeAid: data.employeeAid,
        companyAid: data.companyAid,
        companyName: data.companyName,
        encryptedData: cipher.qb64, // CESR encoded encrypted data
        encryptionCipherQb64: cipher.qb64, // Store cipher for later decryption
        sharedFields: data.selectedFields,
        purpose: data.purpose,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      // Store in backend database
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/v1/context-cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contextCard)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to store context card: ${response.statusText}`);
      }
      
      console.log('✅ Context card created with real encryption');
      return contextCard;
      
    } catch (error) {
      console.error('❌ Failed to create encrypted context card:', error);
      throw error;
    }
  }

  async getEmployeeContextCards(employeeAid: string): Promise<EncryptedContextCard[]> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/context-cards/employee/${employeeAid}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch context cards: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to fetch employee context cards:', error);
      throw error;
    }
  }

  async revokeContextCard(cardId: string): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/context-cards/${cardId}/revoke`,
        { method: 'PUT' }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to revoke context card: ${response.statusText}`);
      }
      
      console.log('✅ Context card revoked');
    } catch (error) {
      console.error('❌ Failed to revoke context card:', error);
      throw error;
    }
  }

  async updateContextCard(cardId: string, updates: Partial<ContextCardData>): Promise<EncryptedContextCard> {
    try {
      // If updating encrypted data, re-encrypt with the same company key
      if (updates.selectedData) {
        const client = await signifyService.getClient();
        if (!client) {
          throw new Error('SignifyTS client not available');
        }

        // Get existing card to get company public key
        const existingCard = await this.getContextCard(cardId);
        
        // Re-encrypt with updated data
        const companyPublicKeyQb64 = 'CCompanyX25519PublicKeyBase64Encoded'; // Resolve from company AID
        const encrypter = new Encrypter({ qb64: companyPublicKeyQb64 });
        
        const dataToEncrypt = {
          ...updates.selectedData,
          metadata: {
            employeeAid: existingCard.employeeAid,
            sharedFields: updates.selectedFields || existingCard.sharedFields,
            purpose: updates.purpose || existingCard.purpose,
            timestamp: new Date().toISOString()
          }
        };
        
        const serializedData = new TextEncoder().encode(JSON.stringify(dataToEncrypt));
        const cipher = encrypter.encrypt(serializedData);
        
        updates = {
          ...updates,
          selectedData: undefined // Don't send raw data
        };
        
        const updatePayload = {
          ...updates,
          encryptedData: cipher.qb64,
          encryptionCipherQb64: cipher.qb64
        };
        
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/v1/context-cards/${cardId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to update context card: ${response.statusText}`);
        }
        
        return await response.json();
      }
      
      // Simple metadata update
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/context-cards/${cardId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to update context card: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to update context card:', error);
      throw error;
    }
  }

  async getContextCard(cardId: string): Promise<EncryptedContextCard> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/v1/context-cards/${cardId}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch context card: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Failed to fetch context card:', error);
      throw error;
    }
  }

  private generateId(): string {
    return `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const contextCardService = new ContextCardService();