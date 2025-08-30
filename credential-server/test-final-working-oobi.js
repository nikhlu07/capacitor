// Test using EXACTLY Veridian's resolveOobi implementation with timeout
const { SignifyClient, ready, Tier, randomPasscode, Salter } = require('signify-ts');

const TRAVEL_PREFERENCES_SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";
const OOBI_ENDPOINT = "http://host.docker.internal:3005";
const OP_TIMEOUT = 15000; // Veridian's timeout

function randomSalt() {
  return new Salter({}).qb64;
}

// Veridian's EXACT waitAndGetDoneOp implementation
async function waitAndGetDoneOp(client, op, timeout = 10000, interval = 250) {
  const startTime = new Date().getTime();
  while (!op.done && new Date().getTime() < startTime + timeout) {
    op = await client.operations().get(op.name);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  if (!op.done) {
    throw new Error(`Operation not completing: ${JSON.stringify(op, null, 2)}`);
  }
  return op;
}

// Veridian's EXACT resolveOobi implementation
async function resolveOobi(client, url) {
  const urlObj = new URL(url);
  const alias = urlObj.searchParams.get("name") ?? randomSalt();
  urlObj.searchParams.delete("name");
  const strippedUrl = urlObj.toString();

  console.log(`🔄 Resolving OOBI: ${strippedUrl}`);
  const operation = await waitAndGetDoneOp(
    client,
    await client.oobis().resolve(strippedUrl),
    OP_TIMEOUT
  );
  
  if (!operation.done) {
    throw new Error("Failed to resolve OOBI, operation not completing...");
  }
  
  console.log(`✅ OOBI resolved: ${strippedUrl}`);
  return operation;
}

async function testFinalWorkingOOBI() {
  console.log('🧪 Testing FINAL working OOBI with Veridian\'s EXACT implementation...');
  
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

    try {
      await client.boot();
      console.log('✅ Booted');
    } catch (bootError) {
      if (bootError.message?.includes('409')) {
        console.log('🔄 Agent exists');
      } else {
        throw bootError;
      }
    }

    await client.connect();
    if (!client.authn) throw new Error('No auth');
    console.log('✅ Connected');

    // VERIDIAN'S EXACT OOBI RESOLUTION PATTERN
    console.log('🔄 Using Veridian\'s exact OOBI resolution...');
    const oobiUrl = `${OOBI_ENDPOINT}/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`;
    
    await resolveOobi(client, oobiUrl);
    console.log('✅ Schema resolved successfully!');

    // Create issuer
    const ISSUER_NAME = 'travlr-final-issuer';
    let issuerIdentifier;
    try {
      issuerIdentifier = await client.identifiers().get(ISSUER_NAME);
      console.log(`✅ Using issuer: ${issuerIdentifier.prefix}`);
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
      console.log(`✅ Using registry: ${registries[0].regk}`);
    } catch (error) {
      const result = await client.registries().create({ 
        name: ISSUER_NAME, 
        registryName: "TravlrCredentials" 
      });
      
      await waitAndGetDoneOp(client, await result.op());
      registries = await client.registries().list(ISSUER_NAME);
      console.log(`✅ Created registry: ${registries[0].regk}`);
    }

    // Create REAL ACDC credential
    console.log('🎫 Creating REAL ACDC credential...');
    
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

    await waitAndGetDoneOp(client, result.op, OP_TIMEOUT);

    const credentialId = result.acdc.ked.d;
    console.log(`✅ REAL ACDC credential created: ${credentialId}`);
    
    // Verify in KERIA LMDB
    const storedCredential = await client.credentials().get(credentialId);
    console.log(`✅ Verified in LMDB: ${storedCredential.sad.d}`);
    console.log(`📋 Schema: ${storedCredential.sad.s}`);
    console.log(`👤 Holder: ${storedCredential.sad.a.i}`);
    console.log(`🏢 Employee: ${storedCredential.sad.a.employeeId}`);
    console.log(`🪑 Seat: ${storedCredential.sad.a.seatPreference}`);
    console.log(`🍽️ Meal: ${storedCredential.sad.a.mealPreference}`);
    
    console.log('\n🎉 COMPLETE SUCCESS! REAL ACDC credential with Veridian\'s exact pattern!');
    console.log('✅ Schema resolved via OOBI using Veridian\'s exact implementation');
    console.log('✅ Real ACDC credential issued and stored in KERIA\'s LMDB database');
    console.log('✅ This is a fully functional ACDC credential!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

testFinalWorkingOOBI();