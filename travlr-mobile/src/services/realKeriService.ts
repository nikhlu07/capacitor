/**
 * Real KERI Service using SignifyTS 
 * Direct communication: Mobile → SignifyTS → KERIA → Witnesses
 * No Python backend involved in KERI operations
 */

import { SignifyClient, ready, randomPasscode } from 'signify-ts';
import { storageService } from './storage';
import 'react-native-get-random-values'; // Essential for crypto

interface KERIConfig {
  keriaUrl: string;
  agentName: string;
  witnesses: string[];
}

interface KERIIdentity {
  aid: string;
  name: string;
  oobi: string;
  created: string;
}

interface ACDCCredential {
  said: string;
  issuer: string;
  recipient: string;
  schema: string;
  data: any;
}

class RealKERIService {
  private client: SignifyClient | null = null;
  private config: KERIConfig;
  private initialized: boolean = false;

  constructor() {
    this.config = {
      keriaUrl: __DEV__ ? 'http://192.168.31.172:3904' : 'https://keria.travlr-id.com',
      agentName: 'travlr-mobile-agent',
      witnesses: [
        'http://localhost:5642/oobi/witness1',
        'http://localhost:5643/oobi/witness2', 
        'http://localhost:5644/oobi/witness3'
      ]
    };
  }

  /**
   * Initialize SignifyTS client - REAL KERI
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing REAL KERI via SignifyTS...');
      
      // Wait for SignifyTS to be ready
      await ready();
      console.log('✅ SignifyTS ready');

      // Get or generate agent credentials
      let bran = await storageService.getItem('keri_bran');
      if (!bran) {
        bran = randomPasscode(); // Real KERI random passphrase
        await storageService.setItem('keri_bran', bran);
        console.log('🔑 Generated new KERI bran (passphrase)');
      }

      // Create SignifyTS client
      this.client = new SignifyClient({
        url: this.config.keriaUrl,
        bran: bran,  // Real cryptographic seed
        tier: 'low'  // For mobile devices
      });

      // Connect to KERIA
      await this.client.connect();
      console.log('🔗 Connected to KERIA via SignifyTS');

      this.initialized = true;
      return true;

    } catch (error) {
      console.error('❌ KERI initialization failed:', error);
      return false;
    }
  }

  /**
   * Create REAL KERI identity via inception event
   * This generates cryptographic AID from Ed25519 keypair
   */
  async createIdentity(employeeId: string, displayName: string): Promise<KERIIdentity> {
    if (!this.initialized || !this.client) {
      throw new Error('KERI service not initialized');
    }

    try {
      console.log(`🆔 Creating REAL KERI identity for ${employeeId}...`);

      // Create REAL KERI identifier via inception event
      const identifierName = `employee-${employeeId}-${Date.now()}`;
      
      const result = await this.client.identifiers().create(identifierName, {
        toad: 2,  // Threshold of acceptable duplicity
        wits: this.config.witnesses  // Real witnesses
      });

      // Wait for inception to complete
      await result.op();
      
      // Get the REAL AID (derived from Ed25519 public key)
      const realAID = result.serder.ked.i;
      console.log(`✅ REAL AID created: ${realAID}`);

      // Generate OOBI (Out-Of-Band Introduction)
      const oobi = await this.client.oobis().get(realAID);
      
      const identity: KERIIdentity = {
        aid: realAID,  // REAL cryptographic AID
        name: displayName,
        oobi: oobi.oobis[0] || `${this.config.keriaUrl}/oobi/${realAID}`,
        created: new Date().toISOString()
      };

      // Store locally
      await storageService.setItem('keri_identity', JSON.stringify(identity));
      
      console.log('🎉 REAL KERI identity created successfully!');
      return identity;

    } catch (error) {
      console.error('❌ KERI identity creation failed:', error);
      throw error;
    }
  }

  /**
   * Issue ACDC credential via KERI
   */
  async issueCredential(recipientAID: string, credentialData: any, schema: string): Promise<ACDCCredential> {
    if (!this.initialized || !this.client) {
      throw new Error('KERI service not initialized');
    }

    try {
      console.log(`📜 Issuing ACDC credential to ${recipientAID}...`);

      // Get issuer identity
      const identities = await this.client.identifiers().list();
      if (identities.aids.length === 0) {
        throw new Error('No issuer identity found');
      }
      
      const issuerAID = identities.aids[0].prefix;

      // Issue ACDC credential
      const credential = await this.client.credentials().issue({
        ri: recipientAID,
        s: schema,
        a: credentialData
      });

      const acdcCredential: ACDCCredential = {
        said: credential.sad.d,  // SAID of the credential
        issuer: issuerAID,
        recipient: recipientAID,
        schema: schema,
        data: credentialData
      };

      console.log('✅ ACDC credential issued successfully!');
      return acdcCredential;

    } catch (error) {
      console.error('❌ Credential issuance failed:', error);
      throw error;
    }
  }

  /**
   * Get current identity
   */
  async getCurrentIdentity(): Promise<KERIIdentity | null> {
    const stored = await storageService.getItem('keri_identity');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Create presentation for data sharing
   */
  async createPresentation(credentialSAID: string, fields: string[]): Promise<any> {
    if (!this.initialized || !this.client) {
      throw new Error('KERI service not initialized');
    }

    try {
      console.log('📋 Creating KERI presentation...');
      
      // Create presentation via KERI exchange
      const presentation = await this.client.exchanges().send({
        // KERI exchange message for credential presentation
        said: credentialSAID,
        fields: fields
      });

      console.log('✅ KERI presentation created');
      return presentation;

    } catch (error) {
      console.error('❌ Presentation creation failed:', error);
      throw error;
    }
  }

  /**
   * Verify incoming credential or presentation
   */
  async verifyCredential(credentialSAID: string): Promise<boolean> {
    if (!this.initialized || !this.client) {
      throw new Error('KERI service not initialized');
    }

    try {
      // Verify credential via KERI
      const verification = await this.client.credentials().get(credentialSAID);
      return !!verification;

    } catch (error) {
      console.error('❌ Credential verification failed:', error);
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; hasClient: boolean; keriaUrl: string } {
    return {
      initialized: this.initialized,
      hasClient: this.client !== null,
      keriaUrl: this.config.keriaUrl
    };
  }
}

// Export singleton instance
export const realKERIService = new RealKERIService();
export default realKERIService;