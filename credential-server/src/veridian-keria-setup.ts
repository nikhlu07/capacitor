import { SignifyClient, ready as signifyReady, Tier } from "signify-ts";
import { config } from "./config";
import { log } from "./log";

/**
 * Veridian's exact KERIA connection pattern
 * Uses their specific passcode and initialization sequence
 */

// Use Veridian's default passcode
const VERIDIAN_PASSCODE = process.env.KERIA_PASSCODE || "DLDRW3f108LaQB2qscJOd";

export async function createVeridianKERIAClient(): Promise<SignifyClient | null> {
  try {
    log("🔄 Initializing KERIA with Veridian's pattern...");
    
    // Wait for SignifyTS
    await signifyReady();
    log("✅ SignifyTS ready");

    // Use Veridian's exact passcode
    log(`🔑 Using Veridian's passcode pattern`);

    // Create client with Veridian's configuration
    const client = new SignifyClient(
      config.keria.url,
      VERIDIAN_PASSCODE,  // Use Veridian's passcode instead of random
      Tier.low,
      config.keria.bootUrl
    );

    log(`🌐 Connecting to KERIA at ${config.keria.url}`);

    try {
      // Try connect first (Veridian pattern)
      await client.connect();
      log("✅ Connected to existing KERIA agent (Veridian style)");
    } catch (connectError) {
      log("⚠️ No existing agent, booting new one...");
      
      try {
        // Boot then connect (Veridian pattern)
        await client.boot();
        await client.connect();
        log("✅ Booted and connected to KERIA agent");
      } catch (bootError) {
        log(`❌ Boot failed: ${bootError.message}`);
        throw bootError;
      }
    }

    // Verify connection
    const state = await client.state();
    log(`✅ KERIA agent confirmed: ${state.controller.pre}`);
    
    return client;

  } catch (error: any) {
    log(`❌ Veridian KERIA setup failed: ${error.message}`);
    return null;
  }
}

/**
 * Setup identifiers and registry using Veridian's pattern
 */
export async function setupVeridianInfrastructure(client: SignifyClient): Promise<boolean> {
  try {
    log("🏗️ Setting up Veridian-style infrastructure...");
    
    const ISSUER_NAME = "issuer";
    
    // 1. Ensure issuer identifier exists
    try {
      const identifier = await client.identifiers().get(ISSUER_NAME);
      log(`✅ Issuer '${ISSUER_NAME}' exists: ${identifier.prefix}`);
    } catch (error) {
      log(`🆕 Creating issuer identifier '${ISSUER_NAME}'...`);
      const result = await client.identifiers().create(ISSUER_NAME);
      
      // Wait for completion (Veridian style)
      const op = await result.op();
      let operation = await client.operations().get(op.name);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 250));
        operation = await client.operations().get(op.name);
      }
      
      const identifier = await client.identifiers().get(ISSUER_NAME);
      log(`✅ Created issuer: ${identifier.prefix}`);
    }

    // 2. Ensure registry exists
    try {
      const registries = await client.registries().list(ISSUER_NAME);
      if (registries && registries.length > 0) {
        log(`✅ Registry exists: ${registries[0].regk}`);
      } else {
        throw new Error("No registry found");
      }
    } catch (error) {
      log(`🆕 Creating registry for '${ISSUER_NAME}'...`);
      const result = await client.registries().create({ 
        name: ISSUER_NAME, 
        registryName: "TravlrCredentials" 
      });
      
      // Wait for completion
      const op = await result.op();
      let operation = await client.operations().get(op.name);
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 250));
        operation = await client.operations().get(op.name);
      }
      
      const registries = await client.registries().list(ISSUER_NAME);
      log(`✅ Created registry: ${registries[0].regk}`);
    }

    log("✅ Veridian infrastructure ready");
    return true;

  } catch (error: any) {
    log(`❌ Infrastructure setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Test real credential creation (Veridian style)
 */
export async function testVeridianCredentialCreation(client: SignifyClient): Promise<boolean> {
  try {
    log("🧪 Testing Veridian-style credential creation...");
    
    const ISSUER_NAME = "issuer";
    const SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";
    
    // Get registry
    const registries = await client.registries().list(ISSUER_NAME);
    const registryKey = registries[0].regk;
    
    // Test attributes (your travel preferences)
    const testAttributes = {
      i: "EKS5pEzx-bEsKUJJhYKkbxtaAJwBJJHb68Mj8d_z6E0", 
      employeeId: "EMP001",
      seatPreference: "window",
      mealPreference: "vegetarian",
      airlines: "Delta Airlines",
      emergencyContact: "John Doe: +1-555-123-4567",
      allergies: "Peanut allergy"
    };

    log("🎫 Issuing REAL ACDC credential (Veridian pattern)...");
    
    // Issue credential (exact Veridian API call)
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
    log(`✅ REAL ACDC credential created: ${credentialId}`);
    
    // Verify in KERIA database
    const storedCredential = await client.credentials().get(credentialId);
    log(`✅ Verified in KERIA LMDB: ${storedCredential.sad.d}`);
    log(`📋 Schema: ${storedCredential.sad.s}`);
    log(`👤 Holder: ${storedCredential.sad.a.i}`);
    
    return true;

  } catch (error: any) {
    log(`❌ Credential test failed: ${error.message}`);
    return false;
  }
}