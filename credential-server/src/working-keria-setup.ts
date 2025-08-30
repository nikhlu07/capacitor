import { SignifyClient, ready as signifyReady, Tier, randomPasscode } from "signify-ts";
import { log } from "./log";
import { config } from "./config";
import { TRAVEL_PREFERENCES_SCHEMA_SAID } from "./consts";

// Veridian's exact resolveOobi implementation
async function resolveOobi(client: SignifyClient, url: string): Promise<any> {
  const urlObj = new URL(url);
  const alias = urlObj.searchParams.get("name") ?? "schema-" + Date.now();
  urlObj.searchParams.delete("name");
  const strippedUrl = urlObj.toString();

  log(`🔄 Resolving OOBI: ${strippedUrl}`);
  const operation = await client.oobis().resolve(strippedUrl);
  
  // Veridian's exact completion waiting pattern
  let op = operation;
  while (!op.done) {
    await new Promise(resolve => setTimeout(resolve, 250));
    op = await client.operations().get(op.name);
  }
  
  if (!op.done) {
    throw new Error(`Failed to resolve OOBI: ${url}`);
  }
  
  log(`✅ OOBI resolved successfully: ${strippedUrl}`);
  return op;
}

// Veridian's exact waitAndGetDoneOp utility
async function waitAndGetDoneOp(client: SignifyClient, op: any): Promise<any> {
  let operation = await client.operations().get(op.name);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 250));
    operation = await client.operations().get(op.name);
  }
  return operation;
}

/**
 * Use YOUR FRONTEND'S working KERIA connection pattern
 * This is proven to work with your current KERIA setup
 */

export async function createWorkingKERIAClient(): Promise<SignifyClient | null> {
  try {
    log("🔄 Using YOUR frontend's working KERIA pattern...");
    
    // Wait for SignifyTS (your frontend pattern)
    await signifyReady();
    log("✅ SignifyTS ready");

    // Generate fresh passcode like your frontend
    const bran = randomPasscode();
    log(`🔑 Generated fresh passcode (your frontend pattern)`);

    // Use YOUR KERIA ports (not Veridian's)
    const client = new SignifyClient(
      'http://localhost:3904',  // Your KERIA Admin API 
      bran,                     // Fresh passcode like your frontend
      Tier.low,
      'http://localhost:3906'   // Your KERIA Boot API
    );

    log(`🌐 Connecting to YOUR KERIA at Admin:3904, Boot:3906`);

    try {
      // Boot first (your frontend pattern)
      await client.boot();
      log("✅ Booted new KERIA agent (your frontend pattern)");
    } catch (bootError: any) {
      if (bootError.message?.includes('409')) {
        log("🔄 Agent already exists, connecting to existing (your pattern)");
      } else {
        throw bootError;
      }
    }

    // Connect to existing or new agent
    await client.connect();
    log("✅ Connected to KERIA agent successfully");

    // CRITICAL: Check authentication like your Ionic app does
    if (!client.authn) {
      throw new Error('Authentication not established after connect(). KERIA connection failed.');
    }
    log("✅ Authentication confirmed - ready for KERI operations");

    // VERIDIAN PATTERN: Resolve schemas immediately after connecting
    log("🔄 Resolving schemas using Veridian's pattern...");
    await Promise.allSettled([
      resolveOobi(client, `${config.oobiEndpoint}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`)
    ]);
    log("✅ Schema resolution completed (Veridian pattern)");

    // Verify connection works
    const state = await client.state();
    log(`✅ KERIA agent confirmed: ${state.controller.pre}`);
    
    return client;

  } catch (error: any) {
    log(`❌ KERIA setup failed: ${error.message}`);
    return null;
  }
}

/**
 * Setup using your frontend's proven pattern
 */
export async function setupWorkingInfrastructure(client: SignifyClient): Promise<boolean> {
  try {
    log("🏗️ Setting up infrastructure (your frontend pattern)...");
    
    const ISSUER_NAME = "travlr-issuer";  // Different name to avoid conflicts
    
    // Create issuer identifier like your frontend
    try {
      const identifier = await client.identifiers().get(ISSUER_NAME);
      log(`✅ Issuer '${ISSUER_NAME}' exists: ${identifier.prefix}`);
    } catch (error) {
      log(`🆕 Creating issuer identifier '${ISSUER_NAME}' (your pattern)...`);
      const result = await client.identifiers().create(ISSUER_NAME, {
        algo: 'randy' as any,
        count: 1,
        ncount: 1,
        transferable: true
      });
      
      // Wait for completion using Veridian's pattern
      await waitAndGetDoneOp(client, await result.op());
      
      const identifier = await client.identifiers().get(ISSUER_NAME);
      log(`✅ Created issuer: ${identifier.prefix}`);
    }

    // Create registry like your frontend
    try {
      const registries = await client.registries().list(ISSUER_NAME);
      if (registries && registries.length > 0) {
        log(`✅ Registry exists: ${registries[0].regk}`);
      } else {
        throw new Error("No registry found");
      }
    } catch (error) {
      log(`🆕 Creating registry (your pattern)...`);
      const result = await client.registries().create({ 
        name: ISSUER_NAME, 
        registryName: "TravlrCredentials" 
      });
      
      await waitAndGetDoneOp(client, await result.op());
      
      const registries = await client.registries().list(ISSUER_NAME);
      log(`✅ Created registry: ${registries[0].regk}`);
    }

    log("✅ Infrastructure ready using YOUR working pattern");
    return true;

  } catch (error: any) {
    log(`❌ Infrastructure setup failed: ${error.message}`);
    return false;
  }
}

/**
 * Test credential creation using your working KERIA
 */
export async function testWorkingCredentialCreation(client: SignifyClient): Promise<boolean> {
  try {
    log("🧪 Testing credential creation with YOUR working KERIA...");
    
    const ISSUER_NAME = "travlr-issuer";
    const SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";
    
    // Get registry
    const registries = await client.registries().list(ISSUER_NAME);
    const registryKey = registries[0].regk;
    
    // Test with your AID format
    const testAttributes = {
      i: "EKS5pEzx-bEsKUJJhYKkbxtaAJwBJJHb68Mj8d_z6E0", 
      employeeId: "EMP001",
      seatPreference: "window",
      mealPreference: "vegetarian",
      airlines: "Delta Airlines",
      emergencyContact: "John Doe: +1-555-123-4567",
      allergies: "Peanut allergy"
    };

    log("🎫 Creating REAL ACDC credential using YOUR KERIA...");
    
    // Issue credential using YOUR working KERIA
    const result = await client.credentials().issue(ISSUER_NAME, {
      ri: registryKey,
      s: SCHEMA_SAID,
      a: testAttributes,
    });

    // Wait for completion using Veridian's pattern
    await waitAndGetDoneOp(client, result.op);

    const credentialId = result.acdc.ked.d;
    log(`✅ REAL ACDC credential created with YOUR KERIA: ${credentialId}`);
    
    // Verify in YOUR KERIA's LMDB database
    const storedCredential = await client.credentials().get(credentialId);
    log(`✅ Verified in YOUR KERIA's LMDB: ${storedCredential.sad.d}`);
    log(`📋 Schema: ${storedCredential.sad.s}`);
    log(`👤 Holder: ${storedCredential.sad.a.i}`);
    
    return true;

  } catch (error: any) {
    log(`❌ Credential test failed: ${error.message}`);
    return false;
  }
}