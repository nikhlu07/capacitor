/**
 * Travlr-ID Identity Service
 * Based on Veridian patterns - simplified for employee travel identity
 * Handles: Ed25519 keypair → Inception → AID generation → ACDC credentials
 */

import { SignifyClient, ready, randomPasscode, Tier } from 'signify-ts';
import { storageService } from './storage';
import 'react-native-get-random-values';

interface TravlrIdentity {
  aid: string;           // Real AID from Ed25519 public key
  employeeId: string;    // Business identifier
  displayName: string;   // Employee name
  oobi: string;          // Out-of-band introduction
  created: string;       // Creation timestamp
  status: 'pending' | 'active' | 'error';
}

interface TravlrCredential {
  said: string;          // ACDC credential SAID
  schema: string;        // Credential schema
  issuer: string;        // Issuer AID
  subject: string;       // Subject AID
  data: any;            // Credential data
  issued: string;       // Issue timestamp
}

class TravlrIdentityService {
  private client: SignifyClient | null = null;
  private identity: TravlrIdentity | null = null;
  private initialized = false;

  private config = {
    keriaUrl: __DEV__ ? 'http://192.168.31.172:3904' : 'https://keria.travlr-id.com',
    witnessUrls: [
      'http://localhost:5642',
      'http://localhost:5643', 
      'http://localhost:5644'
    ],
    agentName: 'travlr-employee-agent'
  };

  /**
   * Initialize SignifyTS client (like Veridian Agent.boot())
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Travlr Identity Service...');
      
      // Wait for SignifyTS to be ready
      await ready();
      console.log('✅ SignifyTS ready');

      // Get or create bran (cryptographic seed)
      let bran = await storageService.getItem('travlr_bran');
      if (!bran) {
        bran = randomPasscode(); // 16-byte random passphrase for Ed25519 key derivation
        await storageService.setItem('travlr_bran', bran);
        console.log('🔑 Generated new cryptographic bran (seed for Ed25519 keys)');
      }

      // Create SignifyTS client (like Veridian)
      this.client = new SignifyClient({
        url: this.config.keriaUrl,
        bran: bran,  // This generates the Ed25519 keypair internally
        tier: Tier.low // Optimized for mobile
      });

      // Connect to KERIA agent
      await this.client.connect();
      console.log('🔗 Connected to KERIA');

      // Try to load existing identity
      await this.loadExistingIdentity();

      this.initialized = true;
      console.log('✅ Travlr Identity Service initialized');
      return true;

    } catch (error) {
      console.error('❌ Initialization failed:', error);
      return false;
    }
  }

  /**
   * Create employee KERI identity (like Veridian createIdentifier)
   * This does the real KERI inception with Ed25519 keys
   */
  async createEmployeeIdentity(employeeId: string, displayName: string): Promise<TravlrIdentity> {
    if (!this.initialized || !this.client) {
      throw new Error('Identity service not initialized');
    }

    try {
      console.log(`🆔 Creating KERI identity for employee: ${employeeId}`);

      // Get witness config (like Veridian getAvailableWitnesses)
      const witnesses = this.config.witnessUrls;
      const toad = Math.floor(witnesses.length / 2); // Threshold of acceptable duplicity

      // Create identifier name (like Veridian naming pattern)
      const identifierName = `travlr-employee-${employeeId}-${Date.now()}`;

      // REAL KERI INCEPTION EVENT - This generates Ed25519 keypair and derives AID
      console.log('🔐 Creating inception event with Ed25519 keypair...');
      const result = await this.client.identifiers().create(identifierName, {
        toad: toad,
        wits: witnesses  // Witness network for consensus
      });

      // Wait for inception to complete
      await result.op();
      
      // Get the REAL AID - derived from Ed25519 public key by SignifyTS
      const realAID = result.serder.ked.i;
      console.log(`✅ Real AID created from Ed25519 public key: ${realAID}`);

      // Add agent role (like Veridian)
      const addRoleOp = await this.client.identifiers().addEndRole(
        realAID, 
        'agent', 
        this.client.agent!.pre
      );
      await addRoleOp.op();

      // Create OOBI for sharing
      const oobi = `${this.config.keriaUrl}/oobi/${realAID}`;

      // Create identity record
      const identity: TravlrIdentity = {
        aid: realAID,  // Real cryptographic AID from Ed25519 public key
        employeeId,
        displayName,
        oobi,
        created: new Date().toISOString(),
        status: 'active'
      };

      // Store identity
      await storageService.setItem('travlr_identity', JSON.stringify(identity));
      this.identity = identity;

      console.log('🎉 Employee KERI identity created successfully!');
      console.log(`   AID: ${realAID}`);
      console.log(`   Employee: ${displayName} (${employeeId})`);
      
      return identity;

    } catch (error) {
      console.error('❌ Identity creation failed:', error);
      throw error;
    }
  }

  /**
   * Issue travel preferences ACDC credential
   */
  async issueTravelPreferencesCredential(travelData: any): Promise<TravlrCredential> {
    if (!this.identity || !this.client) {
      throw new Error('No identity or client available');
    }

    try {
      console.log('📜 Issuing travel preferences ACDC credential...');

      const schema = 'EBIFDhtSE0cM4nbTnaMqiV1vUIlcnbsqBMeVMmeGmXOu'; // Travel preferences schema
      
      // Issue ACDC credential via KERI
      const credential = await this.client.credentials().issue({
        issuerAid: this.identity.aid,
        recipientAid: this.identity.aid, // Self-issued
        schemaAid: schema,
        credentialData: {
          employeeId: this.identity.employeeId,
          preferences: travelData,
          issuedBy: 'Travlr-ID System',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      const acdcCredential: TravlrCredential = {
        said: credential.sad.d,
        schema,
        issuer: this.identity.aid,
        subject: this.identity.aid,
        data: travelData,
        issued: new Date().toISOString()
      };

      // Store credential reference
      const credentials = await this.getStoredCredentials();
      credentials.push(acdcCredential);
      await storageService.setItem('travlr_credentials', JSON.stringify(credentials));

      console.log('✅ Travel preferences ACDC credential issued!');
      return acdcCredential;

    } catch (error) {
      console.error('❌ Credential issuance failed:', error);
      throw error;
    }
  }

  /**
   * Create data sharing presentation for company
   */
  async createDataSharingPresentation(credentialSAID: string, sharedFields: string[]): Promise<any> {
    if (!this.identity || !this.client) {
      throw new Error('No identity available');
    }

    try {
      console.log('📋 Creating data sharing presentation...');

      // Create KERI exchange message for data sharing
      const presentation = await this.client.exchanges().send({
        from: this.identity.aid,
        credential: credentialSAID,
        fields: sharedFields,
        purpose: 'Travel booking data sharing'
      });

      console.log('✅ Data sharing presentation created');
      return presentation;

    } catch (error) {
      console.error('❌ Presentation creation failed:', error);
      throw error;
    }
  }

  // Helper methods
  async getCurrentIdentity(): Promise<TravlrIdentity | null> {
    return this.identity;
  }

  async getStoredCredentials(): Promise<TravlrCredential[]> {
    const stored = await storageService.getItem('travlr_credentials');
    return stored ? JSON.parse(stored) : [];
  }

  private async loadExistingIdentity(): Promise<void> {
    try {
      const stored = await storageService.getItem('travlr_identity');
      if (stored) {
        this.identity = JSON.parse(stored);
        console.log(`🔄 Loaded existing identity: ${this.identity?.aid.substring(0, 12)}...`);
      }
    } catch (error) {
      console.log('No existing identity found');
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  hasIdentity(): boolean {
    return this.identity !== null;
  }
}

// Export singleton
export const travlrIdentityService = new TravlrIdentityService();
export default travlrIdentityService;