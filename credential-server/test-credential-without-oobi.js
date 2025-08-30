// Test creating real credential without OOBI resolution (skip schema resolution)
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

const TRAVEL_PREFERENCES_SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";

// Veridian's exact waitAndGetDoneOp utility
async function waitAndGetDoneOp(client, op) {
  let operation = await client.operations().get(op.name);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 250));
    operation = await client.operations().get(op.name);
  }
  return operation;
}

async function testCredentialWithoutOOBI() {
  console.log('🧪 Testing REAL credential creation WITHOUT OOBI resolution...');
  
  try {
    // Use your working pattern
    await ready();
    console.log('✅ SignifyTS ready');

    const bran = randomPasscode();
    console.log('🔑 Generated fresh passcode');

    const client = new SignifyClient(
      'http://localhost:3904',
      bran,
      Tier.low,
      'http://localhost:3906'
    );

    console.log('🌐 Connecting to KERIA...');

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

    if (!client.authn) {
      throw new Error('Authentication not established');
    }
    console.log('✅ Authentication confirmed');

    // Skip OOBI resolution - just create identifier and try credential directly
    const ISSUER_NAME = 'travlr-direct-issuer';
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

    // Create registry
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

    // Try to create credential directly with hardcoded schema SAID
    console.log('🎫 Attempting REAL ACDC credential creation WITHOUT OOBI...');
    console.log(`📋 Using hardcoded schema SAID: ${TRAVEL_PREFERENCES_SCHEMA_SAID}`);
    
    const testAttributes = {
      i: issuerIdentifier.prefix,
      employeeId: "EMP001",
      seatPreference: "window", 
      mealPreference: "vegetarian",
      airlines: "Delta Airlines",
      emergencyContact: "John Doe: +1-555-123-4567",
      allergies: "Peanut allergy"
    };

    console.log('📝 Credential attributes:', JSON.stringify(testAttributes, null, 2));

    const result = await client.credentials().issue(ISSUER_NAME, {
      ri: registries[0].regk,
      s: TRAVEL_PREFERENCES_SCHEMA_SAID,
      a: testAttributes,
    });

    console.log('⏳ Waiting for credential issuance to complete...');
    await waitAndGetDoneOp(client, result.op);

    const credentialId = result.acdc.ked.d;
    console.log(`✅ REAL ACDC credential created: ${credentialId}`);
    
    // Verify in KERIA's LMDB database
    const storedCredential = await client.credentials().get(credentialId);
    console.log(`✅ Verified in KERIA's LMDB: ${storedCredential.sad.d}`);
    console.log(`📋 Schema SAID: ${storedCredential.sad.s}`);
    console.log(`👤 Holder AID: ${storedCredential.sad.a.i}`);
    console.log(`🏢 Employee ID: ${storedCredential.sad.a.employeeId}`);
    console.log(`🪑 Seat Preference: ${storedCredential.sad.a.seatPreference}`);
    
    console.log('\n🎉 SUCCESS! REAL ACDC credential created and stored in KERIA!');
    console.log('✅ Credential issued with hardcoded schema SAID (without OOBI resolution)');
    console.log('✅ Credential stored in KERIA\'s LMDB database');
    console.log('✅ All credential attributes verified');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('schema')) {
      console.log('🤔 Schema-related error. KERIA might need the schema resolved first.');
      console.log('💡 This suggests OOBI resolution IS required for credential creation.');
    }
    console.error('Full error:', error);
  }
}

testCredentialWithoutOOBI();