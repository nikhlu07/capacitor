import { randomPasscode, ready, SignifyClient, Tier } from 'signify-ts';

class SimpleAIDService {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  async initialize() {
    if (this.isReady) return;
    
    try {
      await ready();
      console.log("✅ Agent is ready");
      
      const bran = randomPasscode();
      const url = 'http://127.0.0.1:3901';
      const boot_url = 'http://127.0.0.1:3903';
      
      // Connect client
      this.client = new SignifyClient(url, bran, Tier.low, boot_url);
      await this.client.boot();
      await this.client.connect();
      
      // Configure client timeout
      this.client.timeoutMs = 30000; // 30 seconds timeout
      
      this.isReady = true;
      console.log("✅ SignifyClient initialized");
    } catch (error) {
      console.error("❌ Failed to initialize SignifyClient:", error);
      throw error;
    }
  }

  async createAID(identityName = 'my-identity') {
    try {
      if (!this.isReady) {
        await this.initialize();
      }

      console.log(`🔄 Creating identifier: ${identityName}`);
      
      // 1. Create Identifier - exactly like your working code
      const newIdentifier = await this.client.identifiers().create(identityName, {
        algo: 'randy',
        count: 1,
        ncount: 1,
        transferable: true
      });
      
      console.log("✅ Identifier created");
      
      // Wait for a moment to ensure the identifier is fully registered
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 2. List identifiers to get the created one
      const ids = await this.client.identifiers().list();
      console.log("🔍 All identifiers:", JSON.stringify(ids, null, 2));
      
      if (!ids.aids || ids.aids.length === 0) {
        throw new Error("❌ No identifiers found");
      }
      
      const myIdentity = ids.aids.find(id => id.name === identityName);
      if (!myIdentity) throw new Error(`❌ Could not find identifier '${identityName}'`);
      
      console.log("🆔 Created Identity:", myIdentity);
      console.log("🆔 AID Name:", myIdentity.name);
      console.log("🆔 AID Prefix:", myIdentity.prefix);
      
      return {
        success: true,
        name: myIdentity.name,
        prefix: myIdentity.prefix,
        aid: myIdentity.prefix,
        data: myIdentity
      };
      
    } catch (error) {
      console.error("❌ Error creating AID:", error.message);
      throw error;
    }
  }

  async listIdentifiers() {
    try {
      if (!this.isReady) {
        await this.initialize();
      }

      const ids = await this.client.identifiers().list();
      return ids.aids || [];
    } catch (error) {
      console.error("❌ Error listing identifiers:", error);
      return [];
    }
  }
}

export default SimpleAIDService;