/**
 * Real KERIA Direct HTTP API Service
 * NO SignifyTS - Direct HTTP calls to KERIA like real production apps
 */

import { storageService } from './storage';
import 'react-native-get-random-values';

interface KERIAConfig {
  adminUrl: string;
  agentUrl: string; 
  bootUrl: string;
}

interface KERIAAgent {
  controller: string;
  passcode: string;
}

interface KERIIdentity {
  aid: string;           // Real AID from KERIA
  name: string;
  prefix: string;
  oobi: string;
  created: string;
}

interface ACDCCredential {
  said: string;          // Real SAID from KERIA
  schema: string;
  issuer: string;
  subject: string;
  data: any;
}

class RealKeriaDirectService {
  private config: KERIAConfig;
  private agent: KERIAAgent | null = null;
  private initialized = false;

  constructor() {
    this.config = {
      adminUrl: __DEV__ ? 'http://192.168.31.172:3904' : 'https://keria.travlr-id.com',
      agentUrl: __DEV__ ? 'http://192.168.31.172:3905' : 'https://keria-agent.travlr-id.com',
      bootUrl: __DEV__ ? 'http://192.168.31.172:3906' : 'https://keria-boot.travlr-id.com'
    };
  }

  /**
   * Initialize KERIA agent via HTTP API (no SignifyTS)
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing KERIA via direct HTTP API...');
      
      // Get or create agent credentials
      let storedAgent = await storageService.getItem('keria_agent');
      if (storedAgent) {
        this.agent = JSON.parse(storedAgent);
        console.log('🔄 Using existing KERIA agent');
      } else {
        // Create new agent
        const passcode = this.generatePasscode();
        
        const response = await fetch(`${this.config.bootUrl}/boot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'travlr-mobile-agent',
            passcode: passcode,
            salt: this.generateSalt()
          })
        });

        if (!response.ok) {
          throw new Error(`KERIA boot failed: ${response.status}`);
        }

        const bootResult = await response.json();
        this.agent = {
          controller: bootResult.controller,
          passcode: passcode
        };

        // Store agent credentials
        await storageService.setItem('keria_agent', JSON.stringify(this.agent));
        console.log('✅ New KERIA agent created');
      }

      this.initialized = true;
      return true;

    } catch (error) {
      console.error('❌ KERIA initialization failed:', error);
      return false;
    }
  }

  /**
   * Create KERI identity via KERIA HTTP API
   */
  async createIdentity(employeeId: string, displayName: string): Promise<KERIIdentity> {
    if (!this.initialized || !this.agent) {
      throw new Error('KERIA service not initialized');
    }

    try {
      console.log(`🆔 Creating KERI identity via KERIA API...`);

      const identifierName = `travlr-employee-${employeeId}`;
      
      // Create identifier via KERIA API
      const response = await fetch(`${this.config.agentUrl}/identifiers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.agent.passcode}`
        },
        body: JSON.stringify({
          name: identifierName,
          toad: 2,  // Threshold of acceptable duplicity
          wits: [   // Witness network
            'BBilc4-L3tFUnfM_wJr4S4OJanAv_VmF_dJNN25mGlKq',
            'BLskRTInXnMxWaGqcpSyMgo0nYbalW99cGZESrz3zapM',
            'BIKKuvBwpmDVA4Ds-EpL5bt9OqPzWPja2LigFYZN2YfX'
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Identity creation failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Extract real AID from KERIA response
      const realAID = result.i || result.prefix || result.aid;
      
      if (!realAID) {
        throw new Error('No AID returned from KERIA');
      }

      console.log(`✅ Real KERI identity created: ${realAID}`);

      const identity: KERIIdentity = {
        aid: realAID,  // Real AID from KERIA
        name: identifierName,
        prefix: realAID,
        oobi: `${this.config.agentUrl}/oobi/${realAID}`,
        created: new Date().toISOString()
      };

      // Store identity
      await storageService.setItem('keria_identity', JSON.stringify(identity));
      
      return identity;

    } catch (error) {
      console.error('❌ Identity creation failed:', error);
      throw error;
    }
  }

  /**
   * Issue ACDC credential via KERIA API
   */
  async issueCredential(issuerAID: string, credentialData: any): Promise<ACDCCredential> {
    if (!this.initialized || !this.agent) {
      throw new Error('KERIA service not initialized');
    }

    try {
      console.log('📜 Issuing ACDC credential via KERIA API...');

      const response = await fetch(`${this.config.agentUrl}/credentials`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.agent.passcode}`
        },
        body: JSON.stringify({
          issuer: issuerAID,
          recipient: issuerAID, // Self-issued
          schema: 'EBIFDhtSE0cM4nbTnaMqiV1vUIlcnbsqBMeVMmeGmXOu',
          data: credentialData
        })
      });

      if (!response.ok) {
        throw new Error(`Credential issuance failed: ${response.status}`);
      }

      const result = await response.json();
      
      const credential: ACDCCredential = {
        said: result.said || result.d,
        schema: result.schema || 'travel-preferences',
        issuer: issuerAID,
        subject: issuerAID,
        data: credentialData
      };

      console.log('✅ ACDC credential issued via KERIA');
      return credential;

    } catch (error) {
      console.error('❌ Credential issuance failed:', error);
      throw error;
    }
  }

  /**
   * Get current identity
   */
  async getCurrentIdentity(): Promise<KERIIdentity | null> {
    const stored = await storageService.getItem('keria_identity');
    return stored ? JSON.parse(stored) : null;
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; hasAgent: boolean; keriaUrl: string } {
    return {
      initialized: this.initialized,
      hasAgent: this.agent !== null,
      keriaUrl: this.config.adminUrl
    };
  }

  // Helper methods
  private generatePasscode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateSalt(): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

export const realKeriaDirectService = new RealKeriaDirectService();
export default realKeriaDirectService;