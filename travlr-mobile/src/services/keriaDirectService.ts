// Direct KERIA HTTP API service (React Native compatible)
// Bypasses SignifyTS Node.js dependencies entirely

interface KERIAConfig {
  adminUrl: string;
  agentUrl: string; 
  bootUrl: string;
  passcode: string;
}

interface KERIIdentifier {
  name: string;
  prefix: string;
  state: any;
}

interface KERICredential {
  said: string;
  schema: string;
  issuer: string;
  data: any;
}

class KERIADirectService {
  private config: KERIAConfig;
  private agentController?: string;

  constructor() {
    this.config = {
      adminUrl: __DEV__ ? 'http://192.168.31.172:3904' : 'https://keria.travlr-id.com',
      agentUrl: __DEV__ ? 'http://192.168.31.172:3905' : 'https://keria-agent.travlr-id.com',
      bootUrl: __DEV__ ? 'http://192.168.31.172:3906' : 'https://keria-boot.travlr-id.com',
      passcode: 'TravlrDevPass123'
    };
  }

  // Initialize KERIA agent via HTTP API
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing KERIA agent via HTTP API...');
      
      // Try to get existing agent first
      try {
        const response = await fetch(`${this.config.adminUrl}/agent/${this.config.passcode}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const agentInfo = await response.json();
          this.agentController = agentInfo.controller;
          console.log('✅ Connected to existing KERIA agent');
          return true;
        }
      } catch (connectError) {
        console.log('🔄 No existing agent found, creating new one...');
      }

      // Create new agent via boot API
      const bootResponse = await fetch(`${this.config.bootUrl}/boot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'travlr-mobile-agent',
          passcode: this.config.passcode,
          salt: this.generateSalt()
        })
      });

      if (bootResponse.ok) {
        const bootResult = await bootResponse.json();
        this.agentController = bootResult.controller;
        console.log('✅ KERIA agent created via HTTP API');
        return true;
      }

      throw new Error(`Boot failed: ${bootResponse.status}`);
      
    } catch (error) {
      console.error('❌ KERIA initialization failed:', error);
      return false;
    }
  }

  // Create KERI identifier via HTTP API
  async createIdentifier(name: string): Promise<{ aid: string; oobi: string }> {
    if (!this.agentController) {
      throw new Error('KERIA agent not initialized');
    }

    try {
      console.log(`🆔 Creating identifier: ${name}`);

      // Create identifier via KERIA HTTP API
      const response = await fetch(`${this.config.agentUrl}/identifiers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.passcode}`
        },
        body: JSON.stringify({
          name: name,
          icount: 1,
          ncount: 1,
          isith: 1,
          nsith: 1,
          toad: 0,
          wits: [],
          cuts: [],
          adds: []
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create identifier: ${response.status}`);
      }

      const result = await response.json();
      const aid = result.prefix || result.i;

      // Generate OOBI
      const oobiResponse = await fetch(`${this.config.agentUrl}/oobis/${name}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.config.passcode}` }
      });

      let oobi = `${this.config.agentUrl}/oobi/${aid}`;
      if (oobiResponse.ok) {
        const oobiResult = await oobiResponse.json();
        oobi = oobiResult.oobis?.[0] || oobi;
      }

      console.log(`✅ Identifier created: ${aid}`);
      return { aid, oobi };

    } catch (error) {
      console.error('❌ Failed to create identifier:', error);
      throw error;
    }
  }

  // Issue credential via HTTP API
  async issueCredential(
    issuerName: string, 
    recipientAid: string, 
    schema: string, 
    data: any
  ): Promise<{ said: string }> {
    if (!this.agentController) {
      throw new Error('KERIA agent not initialized');
    }

    try {
      console.log(`🎫 Issuing credential from ${issuerName} to ${recipientAid}`);

      const response = await fetch(`${this.config.agentUrl}/credentials/${issuerName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.passcode}`
        },
        body: JSON.stringify({
          recipient: recipientAid,
          schema: schema,
          data: data,
          privacy: false
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to issue credential: ${response.status}`);
      }

      const result = await response.json();
      const said = result.sad?.d || result.said;

      if (!said) {
        throw new Error('No SAID returned from credential issuance');
      }

      console.log(`✅ Credential issued: ${said}`);
      return { said };

    } catch (error) {
      console.error('❌ Failed to issue credential:', error);
      throw error;
    }
  }

  // List identifiers via HTTP API
  async listIdentifiers(): Promise<KERIIdentifier[]> {
    if (!this.agentController) {
      throw new Error('KERIA agent not initialized');
    }

    try {
      const response = await fetch(`${this.config.agentUrl}/identifiers`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.config.passcode}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to list identifiers: ${response.status}`);
      }

      const result = await response.json();
      return result.aids || [];

    } catch (error) {
      console.error('❌ Failed to list identifiers:', error);
      throw error;
    }
  }

  // Generate random salt
  private generateSalt(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.adminUrl}/`, {
        method: 'GET',
        timeout: 5000
      });
      return response.status === 401 || response.status === 200; // 401 is expected
    } catch {
      return false;
    }
  }
}

// Export singleton
export const keriaDirectService = new KERIADirectService();
export type { KERIIdentifier, KERICredential };