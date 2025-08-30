import { SignifyClient, ready as signifyReady, Tier } from "signify-ts";
import { config } from "./config";
import { loadBrans } from "./utils/utils";
import { log } from "./log";

/**
 * Initialize KERIA connection with proper agent creation
 * Based on Veridian's working pattern
 */
export async function initializeKERIA(): Promise<SignifyClient | null> {
  try {
    log("🔄 Initializing KERIA connection...");
    
    // Wait for SignifyTS to be ready
    await signifyReady();
    log("✅ SignifyTS ready");

    // Load or create brans (passcodes)
    const brans = await loadBrans();
    log(`🔑 Using bran: ${brans.bran.substring(0, 8)}...`);

    // Create SignifyTS client
    const client = new SignifyClient(
      config.keria.url,
      brans.bran,
      Tier.low,
      config.keria.bootUrl
    );

    log(`🌐 Connecting to KERIA at ${config.keria.url}`);

    try {
      // Try to connect first
      await client.connect();
      log("✅ Connected to existing KERIA agent");
    } catch (connectError) {
      log("⚠️ No existing agent found, creating new one...");
      
      try {
        // Boot new agent if connection fails
        await client.boot();
        await client.connect();
        log("✅ Created and connected to new KERIA agent");
      } catch (bootError) {
        log(`❌ Failed to boot KERIA agent: ${bootError.message}`);
        throw bootError;
      }
    }

    // Verify connection by getting agent state
    try {
      const state = await client.state();
      log(`✅ KERIA agent confirmed: ${state.controller.pre}`);
      return client;
    } catch (stateError) {
      log(`❌ Failed to get agent state: ${stateError.message}`);
      throw stateError;
    }

  } catch (error) {
    log(`❌ KERIA initialization failed: ${error.message}`);
    log("🔧 Check that KERIA is running and accessible");
    return null;
  }
}

/**
 * Setup complete KERI infrastructure
 */
export async function setupKERIInfrastructure(client: SignifyClient): Promise<boolean> {
  try {
    log("🏗️ Setting up KERI infrastructure...");
    
    const ISSUER_NAME = "issuer";
    
    // 1. Create issuer identifier if it doesn't exist
    try {
      await client.identifiers().get(ISSUER_NAME);
      log(`✅ Issuer identifier '${ISSUER_NAME}' already exists`);
    } catch (error) {
      log(`🆕 Creating issuer identifier '${ISSUER_NAME}'...`);
      const result = await client.identifiers().create(ISSUER_NAME);
      const op = await result.op();
      
      // Wait for operation to complete
      let operation = await client.operations().get(op.name);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 250));
        operation = await client.operations().get(op.name);
      }
      log(`✅ Created issuer identifier: ${ISSUER_NAME}`);
    }

    // 2. Create registry for credentials
    try {
      const registries = await client.registries().list(ISSUER_NAME);
      if (registries && registries.length > 0) {
        log(`✅ Registry already exists for '${ISSUER_NAME}'`);
      } else {
        throw new Error("No registry found");
      }
    } catch (error) {
      log(`🆕 Creating credential registry...`);
      const result = await client.registries().create({ 
        name: ISSUER_NAME, 
        registryName: "TravlrCredentials" 
      });
      const op = await result.op();
      
      // Wait for operation to complete
      let operation = await client.operations().get(op.name);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 250));
        operation = await client.operations().get(op.name);
      }
      log(`✅ Created credential registry`);
    }

    log("✅ KERI infrastructure setup complete");
    return true;

  } catch (error) {
    log(`❌ Infrastructure setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Test real credential creation
 */
export async function testCredentialCreation(client: SignifyClient): Promise<boolean> {
  try {
    log("🧪 Testing real credential creation...");
    
    const ISSUER_NAME = "issuer";
    const SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";
    
    // Get registry
    const registries = await client.registries().list(ISSUER_NAME);
    const registryKey = registries[0].regk;
    
    // Test credential data
    const testAttributes = {
      i: "EKS5pEzx-bEsKUJJhYKkbxtaAJwBJJHb68Mj8d_z6E0", // Test holder AID
      employeeId: "EMP001",
      seatPreference: "window",
      mealPreference: "vegetarian"
    };

    // Issue real ACDC credential
    log("🎫 Issuing real ACDC credential...");
    const result = await client.credentials().issue(ISSUER_NAME, {
      ri: registryKey,
      s: SCHEMA_SAID,
      a: testAttributes,
    });

    // Wait for completion
    let operation = await client.operations().get(result.op.name);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 250));
      operation = await client.operations().get(result.op.name);
    }

    const credentialId = result.acdc.ked.d;
    log(`✅ Real ACDC credential created: ${credentialId}`);
    
    // Verify it exists in KERIA's database
    const credential = await client.credentials().get(credentialId);
    log(`✅ Credential verified in KERIA LMDB: ${credential.sad.d}`);
    
    return true;

  } catch (error) {
    log(`❌ Credential creation test failed: ${error.message}`);
    return false;
  }
}