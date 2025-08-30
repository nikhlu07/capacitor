// React Native compatible KERI service using direct KERIA HTTP API
import { storageService } from './storage';
import { keriaDirectService } from './keriaDirectService';
import 'react-native-get-random-values'; // Required for crypto

import { cryptoConfig } from './cryptoConfig';
import { secureStorage } from './secureStorage';
import { witnessService } from './witnessService';

// KERI Configuration
const KERI_CONFIG = {
  // Backend API for business logic (not direct KERI operations)
  backendUrl: __DEV__ ? 'http://192.168.31.172:8000' : 'https://api.travlr-id.com',
  
  // Agent configuration for real KERI integration
  agentName: 'travlr-mobile-agent',
  
  // KERIA endpoints (mobile talks to KERIA directly via SignifyTS)
  keriaAdminUrl: __DEV__ ? 'http://192.168.31.172:3904' : 'https://keria-admin.travlr-id.com',
  keriaBootUrl: __DEV__ ? 'http://192.168.31.172:3906' : 'https://keria-boot.travlr-id.com'
};

// React Native compatible KERI Service using direct KERIA HTTP API
class KERIService {
  private initialized: boolean = false;
  private aid: string | null = null;
  private oobi: string | null = null;
  private agentName: string = 'travlr-mobile-agent';

  // Initialize KERI service with enhanced security
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing Secure KERI Service...');
      
      // Initialize secure storage first
      const storageInit = await secureStorage.initialize();
      if (!storageInit) {
        throw new Error('Secure storage initialization failed');
      }
      
      // Initialize crypto configuration
      await cryptoConfig.initialize();
      
      // Validate witness network health
      console.log('🔍 Validating witness network...');
      const witnessStats = await witnessService.getWitnessStats();
      console.log(`📊 Witness stats: ${witnessStats.healthy}/${witnessStats.total} healthy`);
      
      if (witnessStats.healthy < 2) {
        console.warn('⚠️ Insufficient healthy witnesses, attempting to continue...');
      }
      
      // Initialize KERIA agent via HTTP API
      const success = await keriaDirectService.initialize();
      if (!success) {
        throw new Error('KERIA agent initialization failed');
      }
      
      this.initialized = true;
      
      // Load existing AID if available
      await this.loadExistingAID();
      
      console.log('✅ Secure KERI Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize KERI service:', error);
      throw new Error(`KERI service initialization failed: ${error.message}`);
    }
  }

  // Initialize SignifyTS client with secure configuration
  private async initializeSignifyClient(): Promise<void> {
    try {
      await signifyReady();
      
      // Get cryptographically secure bran from crypto config
      const bran = cryptoConfig.getBran();
      
      // Validate bran strength
      const validation = cryptoConfig.validateBranStrength(bran);
      if (!validation.isValid) {
        throw new Error(`Insecure bran detected: ${validation.issues.join(', ')}`);
      }
      
      console.log(`✅ Using secure bran (strength: ${validation.score}/100)`);
      
      this.signifyClient = new SignifyClient(
        KERI_CONFIG.keriaAdminUrl,
        bran,
        Tier.low,
        KERI_CONFIG.keriaBootUrl
      );
      
      // Connect with retry logic and error handling
      await this.connectWithRetry();
      
    } catch (error) {
      console.error('❌ SignifyTS initialization failed:', error);
      throw new Error(`SignifyTS initialization failed: ${error.message}`);
    }
  }

  // Connect to KERIA with retry logic and enhanced error handling
  private async connectWithRetry(maxRetries: number = 3): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Connection attempt ${attempt}/${maxRetries}...`);
        
        // Try connecting first
        try {
          await this.signifyClient.connect();
          console.log('✅ SignifyTS connected to KERIA');
          return;
        } catch (connectError) {
          console.log('📦 Connection failed, attempting to boot agent...');
          
          // If connect fails, try booting
          await this.signifyClient.boot();
          await this.signifyClient.connect();
          console.log('✅ SignifyTS booted and connected to KERIA');
          return;
        }
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    throw new Error(`Failed to connect to KERIA after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  // Get initialized SignifyTS client - MUST be available
  async getClient(): Promise<SignifyClient> {
    if (!this.signifyClient) {
      throw new Error('SignifyTS client not initialized - call initialize() first');
    }
    return this.signifyClient;
  }

  // Issue ACDC credential via SignifyTS
  async issueCredential(
    recipientAid: string,
    credentialData: any,
    schema: { said: string; title?: string }
  ): Promise<{ said: string }> {
    const client = await this.getClient();
    if (!this.aid) throw new Error('Issuer AID not available');
    const result: any = await (client as any).credentials().issue({
      issuer: this.aid,
      recipient: recipientAid,
      schema: schema.said,
      data: credentialData
    });
    const said = result?.acdc?.d || result?.acdc?.ked?.d || result?.said;
    if (!said) throw new Error('Failed to obtain credential SAID');
    return { said };
  }

  // Load existing AID from storage
  private async loadExistingAID(): Promise<void> {
    try {
      const employeeData = await storageService.getEmployeeData();
      if (employeeData?.aid) {
        this.aid = employeeData.aid;
        console.log('📋 Loaded existing AID:', this.aid);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load existing AID:', error);
    }
  }

  // Check if service is initialized
  isInitialized(): boolean {
    return this.initialized;
  }

  // Get current AID
  getAID(): string | null {
    return this.aid;
  }

  // Create KERI employee AID using SignifyTS ONLY
  async createEmployeeAID(employeeId: string, fullName: string): Promise<{aid: string, oobi: string}> {
    try {
      if (!this.initialized) {
        throw new Error('KERI service not initialized');
      }

      console.log('🆔 Creating REAL KERI AID via SignifyTS for employee:', employeeId);
      return await this.createRealKERIAID(employeeId, fullName);
    } catch (error) {
      console.error('❌ Failed to create employee AID:', error);
      throw error;
    }
  }
  
  // Create KERI AID using SignifyTS directly (NO fallbacks)
  private async createRealKERIAID(employeeId: string, fullName: string): Promise<{aid: string, oobi: string}> {
    console.log('🔑 Creating REAL KERI AID with SignifyTS...');
    
    const client = await this.getClient();
    
    // Create identifier using SignifyTS
    const identifierName = `${this.agentName}-${employeeId}`;
    
    try {
      const result = await client.identifiers().create(identifierName, {
        toad: 2,  // threshold
        wits: []  // witnesses (will be added by KERIA)
      });
      await result.op();  // Wait for operation to complete
      
      const aid = result.serder.ked.i;
      const oobi = await client.oobis().get(identifierName);
      
      this.aid = aid;
      this.oobi = oobi.oobis[0] || `${KERI_CONFIG.keriaAdminUrl}/oobi/${aid}`;
      
      console.log('✅ REAL KERI AID created via SignifyTS:', this.aid);
      console.log('📡 REAL OOBI generated:', this.oobi);
      
      return {
        aid: this.aid,
        oobi: this.oobi
      };
      
    } catch (createError: any) {
      // Handle "already exists" error
      if (createError.message && createError.message.includes('already incepted')) {
        console.log('🔄 Identifier already exists, retrieving...');
        const existingIdentifier = await client.identifiers().get(identifierName);
        const aid = existingIdentifier.prefix;
        const oobi = await client.oobis().get(identifierName);
        
        this.aid = aid;
        this.oobi = oobi.oobis[0] || `${KERI_CONFIG.keriaAdminUrl}/oobi/${aid}`;
        
        console.log('✅ Retrieved existing REAL KERI AID:', this.aid);
        return {
          aid: this.aid,
          oobi: this.oobi
        };
      }
      throw createError;
    }
  }
  
  
  // Get current AID and OOBI
  getCurrentAID(): {aid: string | null, oobi: string | null} {
    return {
      aid: this.aid,
      oobi: this.oobi
    };
  }

  // Create travel preferences credential via SignifyTS directly (Veridian pattern)
  async createTravelPreferencesCredential(travelPreferences: any): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('KERI service not initialized');
      }

      if (!this.aid) {
        throw new Error('No AID available - employee not registered');
      }

      console.log('🎫 Creating travel preferences credential via SignifyTS...');
      
      const client = await this.getClient();

      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee data not found');
      }

      // Travel preferences schema SAID (hardcoded for now, should come from schema registry)
      const travelPrefsSchema = {
        said: "EBfdlu8R27Fbx-ehrqwImnK-8Cm79sqbAQ4MmvEAYqao", // Example schema SAID
        title: "Travel Preferences"
      };

      // Issue credential directly via SignifyTS
      const credentialData = {
        employee_id: employeeData.employee_id,
        full_name: employeeData.full_name,
        ...travelPreferences,
        issued_at: new Date().toISOString()
      };

      const result = await this.issueCredential(this.aid, credentialData, travelPrefsSchema);
      
      console.log('✅ Travel preferences credential created via SignifyTS:', result.said);
      return result.said;
    } catch (error) {
      console.error('❌ Failed to create travel preferences credential:', error);
      throw error;
    }
  }

  // Create context card for company via SignifyTS directly (Veridian pattern)
  async createContextCard(companyAID: string, dataFields: string[]): Promise<string> {
    try {
      if (!this.initialized) {
        throw new Error('KERI service not initialized');
      }

      if (!this.aid) {
        throw new Error('No AID available - employee not registered');
      }

      console.log('📄 Creating context card via SignifyTS...');
      
      const client = await this.getClient();

      const employeeData = await storageService.getEmployeeData();
      if (!employeeData) {
        throw new Error('Employee data not found');
      }

      // Context card schema SAID 
      const contextCardSchema = {
        said: "EL9oOWU_7zQn_rD--Xsgi3giCWnFDaNvFMUGTOZx1ARO", // Example schema SAID
        title: "Employee Context Card"
      };

      // Issue context card credential directly via SignifyTS
      const contextCardData = {
        employee_aid: this.aid,
        employee_id: employeeData.employee_id,
        company_aid: companyAID,
        authorized_data_fields: dataFields,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      };

      const result = await this.issueCredential(companyAID, contextCardData, contextCardSchema);
      
      console.log('✅ Context card created via SignifyTS:', result.said);
      return result.said;
    } catch (error) {
      console.error('❌ Failed to create context card:', error);
      throw error;
    }
  }

  // Approve consent request via API
  async approveConsentRequest(requestId: string, approvedFields: string[]): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('KERI service not initialized');
      }

      console.log('✅ Approving consent request via API...');
      
      const response = await fetch(`${KERI_CONFIG.backendUrl}/api/consent/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          approved_fields: approvedFields
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      console.log('✅ Consent request approved');
    } catch (error) {
      console.error('❌ Failed to approve consent request:', error);
      throw error;
    }
  }

  // Deny consent request via API
  async denyConsentRequest(requestId: string): Promise<void> {
    try {
      if (!this.initialized) {
        throw new Error('KERI service not initialized');
      }

      console.log('❌ Denying consent request via API...');
      
      const response = await fetch(`${KERI_CONFIG.backendUrl}/api/consent/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      console.log('✅ Consent request denied');
    } catch (error) {
      console.error('❌ Failed to deny consent request:', error);
      throw error;
    }
  }

  // Get pending consent requests via API
  async getPendingConsentRequests(): Promise<any[]> {
    try {
      if (!this.initialized) {
        console.warn('⚠️ KERI service not initialized, returning empty array');
        return [];
      }

      const employeeData = await storageService.getEmployeeData();
      if (!employeeData?.employee_id) {
        console.warn('⚠️ No employee data found, returning empty array');
        return [];
      }

      const response = await fetch(`${KERI_CONFIG.backendUrl}/api/consent/pending?employee_id=${employeeData.employee_id}`);
      
      if (!response.ok) {
        console.warn('⚠️ Failed to fetch consent requests, returning empty array');
        return [];
      }

      const requests = await response.json();
      console.log('📋 Fetched pending consent requests:', requests.length);
      return requests;
    } catch (error) {
      console.warn('⚠️ Failed to get pending consent requests:', error);
      return [];
    }
  }
}

// Export singleton instance
export const signifyService = new KERIService();
