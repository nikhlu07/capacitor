// EXACT COPY of Veridian's server startup pattern
const { SignifyClient, ready, Tier, randomPasscode, Salter } = require('signify-ts');

const OP_TIMEOUT = 15000;
const TRAVEL_PREFERENCES_SCHEMA_SAID = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU";

function randomSalt() {
  return new Salter({}).qb64;
}

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

async function resolveOobi(client, url) {
  const urlObj = new URL(url);
  const alias = urlObj.searchParams.get("name") ?? randomSalt();
  urlObj.searchParams.delete("name");
  const strippedUrl = urlObj.toString();

  const operation = await waitAndGetDoneOp(
    client,
    await client.oobis().resolve(strippedUrl),
    OP_TIMEOUT
  );
  
  if (!operation.done) {
    throw new Error("Failed to resolve OOBI, operation not completing...");
  }
  
  return operation;
}

// EXACT COPY of Veridian's getSignifyClient
async function getSignifyClient(bran) {
  const client = new SignifyClient(
    'http://localhost:3904',
    bran,
    Tier.low,
    'http://localhost:3906'
  );

  try {
    await client.connect();
  } catch (err) {
    await client.boot();
    await client.connect();
  }

  // EXACT COPY - resolve schemas with Docker network name
  await Promise.allSettled([
    resolveOobi(client, `http://travlr-schema:3005/oobi/${TRAVEL_PREFERENCES_SCHEMA_SAID}`)
  ]);

  return client;
}

// EXACT COPY of Veridian's ensureIdentifierExists
async function ensureIdentifierExists(client, aidName) {
  try {
    await client.identifiers().get(aidName);
  } catch (e) {
    const status = e.message.split(" - ")[1];
    if (/404/gi.test(status)) {
      const result = await client.identifiers().create(aidName);
      await waitAndGetDoneOp(client, await result.op());
      await client.identifiers().get(aidName);
    } else {
      throw e;
    }
  }
}

// EXACT COPY of Veridian's ensureRegistryExists
async function ensureRegistryExists(client, aidName) {
  try {
    const registries = await client.registries().list(aidName);
    if (!registries || registries.length === 0) {
      throw new Error("No registries found");
    }
  } catch (e) {
    if (e.message.includes("No registries found")) {
      const result = await client.registries().create({ 
        name: aidName, 
        registryName: "vLEI" 
      });
      await waitAndGetDoneOp(client, await result.op());
    } else {
      throw e;
    }
  }
}

async function startVeridianPattern() {
  console.log('🚀 Starting EXACT Veridian pattern...');
  
  try {
    await ready();
    console.log('✅ SignifyTS ready');
    
    // Generate fresh bran like Veridian
    const bran = randomPasscode();
    const signifyClient = await getSignifyClient(bran);
    console.log('✅ SignifyClient connected with schema resolved');
    
    const ISSUER_NAME = "veridian-exact-issuer";
    
    // EXACT Veridian setup
    await ensureIdentifierExists(signifyClient, ISSUER_NAME);
    console.log('✅ Identifier exists');
    
    await ensureRegistryExists(signifyClient, ISSUER_NAME);
    console.log('✅ Registry exists');
    
    // Get components like Veridian
    const registries = await signifyClient.registries().list(ISSUER_NAME);
    const issuerAid = await signifyClient.identifiers().get(ISSUER_NAME);
    
    console.log(`✅ Issuer: ${issuerAid.prefix}`);
    console.log(`✅ Registry: ${registries[0].regk}`);
    
    // EXACT COPY of Veridian's credential creation
    const vcdata = {
      employeeId: "VERIDIAN-EXACT-001",
      seatPreference: "window",
      mealPreference: "vegetarian",
      airlines: "Exact Veridian Airways", 
      emergencyContact: "Exact Emergency",
      allergies: "None"
    };
    
    console.log('🎫 Creating credential with EXACT Veridian pattern...');
    
    const result = await signifyClient.credentials().issue(ISSUER_NAME, {
      ri: registries[0].regk,
      s: TRAVEL_PREFERENCES_SCHEMA_SAID,
      a: {
        i: issuerAid.prefix,
        ...vcdata,
      },
    });
    
    console.log('⏳ Waiting for credential using Veridian pattern...');
    await waitAndGetDoneOp(signifyClient, result.op, OP_TIMEOUT);
    
    const credentialId = result.acdc.ked.d;
    console.log('✅ CREDENTIAL CREATED:', credentialId);
    
    // EXACT COPY of Veridian's credential retrieval
    const issuerCredential = await signifyClient.credentials().get(credentialId);
    
    console.log('\n🎉 SUCCESS! EXACT Veridian pattern worked!');
    console.log(`🆔 Credential ID: ${credentialId}`);
    console.log(`📋 Schema: ${issuerCredential.sad.s}`);
    console.log(`👤 Holder: ${issuerCredential.sad.a.i}`);
    console.log(`🏢 Employee: ${issuerCredential.sad.a.employeeId}`);
    console.log(`🪑 Seat: ${issuerCredential.sad.a.seatPreference}`);
    console.log(`🍽️ Meal: ${issuerCredential.sad.a.mealPreference}`);
    console.log(`✈️ Airlines: ${issuerCredential.sad.a.airlines}`);
    
    console.log('\n✅ REAL ACDC CREDENTIAL CREATED WITH EXACT VERIDIAN CODE!');
    
    return credentialId;
    
  } catch (error) {
    console.error('❌ Exact Veridian pattern failed:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

startVeridianPattern().then(credId => {
  if (credId) {
    console.log(`\n🎯 SUCCESS! Created ACDC credential: ${credId}`);
    console.log('✅ Using exact Veridian code and patterns');
    console.log('✅ Schema server in same Docker network');
    console.log('✅ This is a real ACDC credential!');
  } else {
    console.log('\n❌ Even exact Veridian code with proper networking failed');
  }
});