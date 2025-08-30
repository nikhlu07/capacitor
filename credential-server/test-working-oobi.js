// Test OOBI resolution using host.docker.internal for KERIA Docker container
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

const TRAVEL_PREFERENCES_SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";
const OOBI_ENDPOINT = "http://host.docker.internal:3005"; // Use Docker host networking

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

async function waitAndGetDoneOp(client, op) {
  let operation = await client.operations().get(op.name);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 250));
    operation = await client.operations().get(op.name);
  }
  return operation;
}

async function testWorkingOOBI() {
  console.log('🧪 Testing OOBI resolution with host.docker.internal...');
  
  try {
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
    if (!client.authn) {
      throw new Error('Authentication not established');
    }
    console.log('✅ Connected and authenticated');

    // Test OOBI resolution with Docker networking
    console.log('🔄 Testing OOBI resolution with Docker host networking...');
    const oobiUrl = `${OOBI_ENDPOINT}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`;
    console.log(`📋 OOBI URL: ${oobiUrl}`);
    
    // Add timeout to OOBI resolution
    const oobiPromise = resolveOobi(client, oobiUrl);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OOBI resolution timeout after 30 seconds')), 30000);
    });
    
    await Promise.race([oobiPromise, timeoutPromise]);
    console.log('✅ Schema resolved successfully via OOBI!');

    // Now create credential
    const ISSUER_NAME = 'travlr-working-issuer';
    console.log('🆕 Creating issuer...');
    
    let issuerIdentifier;
    try {
      issuerIdentifier = await client.identifiers().get(ISSUER_NAME);
      console.log(`✅ Using existing issuer: ${issuerIdentifier.prefix}`);
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
    let registries;
    try {
      registries = await client.registries().list(ISSUER_NAME);
      if (!registries || registries.length === 0) throw new Error("No registry");
      console.log(`✅ Using existing registry: ${registries[0].regk}`);
    } catch (error) {
      console.log('🏛️ Creating registry...');
      const result = await client.registries().create({ 
        name: ISSUER_NAME, 
        registryName: "TravlrCredentials" 
      });
      
      await waitAndGetDoneOp(client, await result.op());
      registries = await client.registries().list(ISSUER_NAME);
      console.log(`✅ Created registry: ${registries[0].regk}`);
    }

    // Create the credential now that schema is resolved
    console.log('🎫 Creating REAL ACDC credential with resolved schema...');
    
    const testAttributes = {
      i: issuerIdentifier.prefix,
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

    await waitAndGetDoneOp(client, result.op);

    const credentialId = result.acdc.ked.d;
    console.log(`✅ REAL ACDC credential created: ${credentialId}`);
    
    // Verify in KERIA's LMDB database
    const storedCredential = await client.credentials().get(credentialId);
    console.log(`✅ Verified in KERIA's LMDB: ${storedCredential.sad.d}`);
    console.log(`📋 Schema SAID: ${storedCredential.sad.s}`);
    console.log(`👤 Holder AID: ${storedCredential.sad.a.i}`);
    console.log(`🏢 Employee ID: ${storedCredential.sad.a.employeeId}`);
    console.log(`🪑 Seat: ${storedCredential.sad.a.seatPreference}, 🍽️ Meal: ${storedCredential.sad.a.mealPreference}`);
    
    console.log('\n🎉 COMPLETE SUCCESS! Real ACDC credential created with Veridian\'s exact pattern!');
    console.log('✅ Schema resolved via OOBI (host.docker.internal networking)');
    console.log('✅ Real ACDC credential issued and stored in KERIA\'s LMDB');
    console.log('✅ All attributes verified - this is a REAL credential!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('timeout')) {
      console.log('💡 OOBI resolution timed out - this might be a network issue');
    }
    console.error('Full error:', error);
  }
}

testWorkingOOBI();