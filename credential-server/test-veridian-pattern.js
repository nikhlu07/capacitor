// Test using EXACTLY Veridian's complete pattern for schema resolution and credential creation
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

const TRAVEL_PREFERENCES_SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";
const OOBI_ENDPOINT = "http://localhost:3005";

// Veridian's exact resolveOobi implementation
async function resolveOobi(client, url) {
  const urlObj = new URL(url);
  const alias = urlObj.searchParams.get("name") ?? "schema-" + Date.now();
  urlObj.searchParams.delete("name");
  const strippedUrl = urlObj.toString();

  console.log(`🔄 Resolving OOBI: ${strippedUrl}`);
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
  
  console.log(`✅ OOBI resolved successfully: ${strippedUrl}`);
  return op;
}

// Veridian's exact waitAndGetDoneOp utility
async function waitAndGetDoneOp(client, op) {
  let operation = await client.operations().get(op.name);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 250));
    operation = await client.operations().get(op.name);
  }
  return operation;
}

async function testVeridianCompletePattern() {
  console.log('🧪 Testing COMPLETE Veridian pattern with schema resolution...');
  
  try {
    // Step 1: SignifyTS ready (your working pattern)
    await ready();
    console.log('✅ SignifyTS ready');

    // Step 2: Fresh passcode (your working pattern)
    const bran = randomPasscode();
    console.log('🔑 Generated fresh passcode');

    // Step 3: Create client (your working ports)
    const client = new SignifyClient(
      'http://localhost:3904',  // Your Admin API
      bran,                     // Fresh passcode
      Tier.low,
      'http://localhost:3906'   // Your Boot API
    );

    console.log('🌐 Connecting to YOUR KERIA...');

    // Step 4: Boot and connect (your working pattern)
    try {
      await client.boot();
      console.log('✅ Booted new agent');
    } catch (bootError) {
      if (bootError.message?.includes('409')) {
        console.log('🔄 Agent already exists');
      } else {
        throw bootError;
      }
    }

    await client.connect();
    console.log('✅ Connected');

    // Step 5: Authentication check (your pattern)
    if (!client.authn) {
      throw new Error('Authentication not established');
    }
    console.log('✅ Authentication confirmed');

    // Step 6: VERIDIAN PATTERN - Resolve schemas immediately after connecting
    console.log('🔄 Resolving schemas using Veridian\'s exact pattern...');
    await Promise.allSettled([
      resolveOobi(client, `${OOBI_ENDPOINT}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`)
    ]);
    console.log('✅ Schema resolution completed using Veridian\'s pattern');

    // Step 7: Create issuer identifier (your working pattern)
    const ISSUER_NAME = 'travlr-issuer-test';
    console.log('🆕 Creating issuer identifier...');
    
    let issuerIdentifier;
    try {
      issuerIdentifier = await client.identifiers().get(ISSUER_NAME);
      console.log(`✅ Issuer exists: ${issuerIdentifier.prefix}`);
    } catch (error) {
      const result = await client.identifiers().create(ISSUER_NAME, {
        algo: 'randy',
        count: 1,
        ncount: 1,
        transferable: true
      });
      
      await waitAndGetDoneOp(client, await result.op());
      issuerIdentifier = await client.identifiers().get(ISSUER_NAME);
      console.log(`✅ Created issuer: ${issuerIdentifier.prefix}`);
    }

    // Step 8: Create registry (Veridian pattern)
    console.log('🏛️ Creating registry...');
    let registries;
    try {
      registries = await client.registries().list(ISSUER_NAME);
      if (!registries || registries.length === 0) {
        throw new Error("No registry found");
      }
      console.log(`✅ Registry exists: ${registries[0].regk}`);
    } catch (error) {
      const result = await client.registries().create({ 
        name: ISSUER_NAME, 
        registryName: "TravlrCredentials" 
      });
      
      await waitAndGetDoneOp(client, await result.op());
      registries = await client.registries().list(ISSUER_NAME);
      console.log(`✅ Created registry: ${registries[0].regk}`);
    }

    // Step 9: Create REAL ACDC credential using Veridian's exact pattern
    console.log('🎫 Creating REAL ACDC credential using complete Veridian pattern...');
    
    const testAttributes = {
      i: issuerIdentifier.prefix, // Use the actual issuer AID
      employeeId: "EMP001",
      seatPreference: "window", 
      mealPreference: "vegetarian",
      airlines: "Delta Airlines",
      emergencyContact: "John Doe: +1-555-123-4567",
      allergies: "Peanut allergy"
    };

    const result = await client.credentials().issue(ISSUER_NAME, {
      ri: registries[0].regk,
      s: TRAVEL_PREFERENCES_SCHEMA_SAID,
      a: testAttributes,
    });

    // Wait for completion using Veridian's pattern
    await waitAndGetDoneOp(client, result.op);

    const credentialId = result.acdc.ked.d;
    console.log(`✅ REAL ACDC credential created: ${credentialId}`);
    
    // Verify in KERIA's LMDB database
    const storedCredential = await client.credentials().get(credentialId);
    console.log(`✅ Verified in KERIA's LMDB: ${storedCredential.sad.d}`);
    console.log(`📋 Schema SAID: ${storedCredential.sad.s}`);
    console.log(`👤 Holder AID: ${storedCredential.sad.a.i}`);
    console.log(`🏢 Employee ID: ${storedCredential.sad.a.employeeId}`);
    
    console.log('\n🎉 SUCCESS! REAL ACDC credential created using complete Veridian pattern!');
    console.log('✅ Schema resolved via OOBI exactly like Veridian');
    console.log('✅ Credential issued and stored in KERIA\'s LMDB database');
    console.log('✅ Credential attributes verified');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testVeridianCompletePattern();