// EXACT COPY of Veridian's credential creation pattern - NO MODIFICATIONS
const { SignifyClient, ready, Tier, randomPasscode, Salter } = require('signify-ts');

const OP_TIMEOUT = 15000;

function randomSalt() {
  return new Salter({}).qb64;
}

// EXACT COPY of Veridian's waitAndGetDoneOp
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

// EXACT COPY of Veridian's resolveOobi
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

// EXACT COPY of Veridian's getSignifyClient pattern
async function getSignifyClient(bran) {
  const client = new SignifyClient(
    'http://localhost:3904',  // Use our KERIA URL
    bran,
    Tier.low,
    'http://localhost:3906'   // Use our boot URL
  );

  try {
    await client.connect();
  } catch (err) {
    await client.boot();
    await client.connect();
  }

  // EXACT COPY - resolve schemas immediately
  await Promise.allSettled([
    resolveOobi(client, 'http://host.docker.internal:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU')
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

// EXACT COPY of Veridian's credential creation pattern
async function createVeridianCredential() {
  console.log('🎫 Using EXACT Veridian credential creation pattern...');
  
  try {
    await ready();
    
    const bran = randomPasscode();
    console.log('✅ Generated bran like Veridian');
    
    const signifyClient = await getSignifyClient(bran);
    console.log('✅ SignifyClient connected like Veridian');
    
    const ISSUER_NAME = "travlr-veridian-issuer";
    
    // EXACT Veridian setup pattern
    await ensureIdentifierExists(signifyClient, ISSUER_NAME);
    console.log('✅ Identifier ensured like Veridian');
    
    await ensureRegistryExists(signifyClient, ISSUER_NAME);
    console.log('✅ Registry ensured like Veridian');
    
    // Get registry exactly like Veridian
    const registries = await signifyClient.registries().list(ISSUER_NAME);
    const registryRegk = registries[0].regk;
    console.log('✅ Registry obtained like Veridian:', registryRegk);
    
    const issuerAid = await signifyClient.identifiers().get(ISSUER_NAME);
    console.log('✅ Issuer AID obtained like Veridian:', issuerAid.prefix);
    
    // EXACT COPY of Veridian's credentials().issue call
    const vcdata = {
      employeeId: "VERIDIAN-001",
      seatPreference: "window",
      mealPreference: "vegetarian",
      airlines: "Veridian Airways",
      emergencyContact: "Veridian Emergency",
      allergies: "None"
    };
    
    console.log('🎯 Creating credential with EXACT Veridian pattern...');
    
    const result = await signifyClient.credentials().issue(ISSUER_NAME, {
      ri: registryRegk,
      s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
      a: {
        i: issuerAid.prefix,
        ...vcdata,
      },
    });
    
    // EXACT COPY of Veridian's operation waiting
    await waitAndGetDoneOp(signifyClient, result.op, OP_TIMEOUT);
    
    const credentialId = result.acdc.ked.d;
    console.log('✅ CREDENTIAL CREATED like Veridian:', credentialId);
    
    // EXACT COPY of Veridian's credential retrieval
    const issuerCredential = await signifyClient.credentials().get(credentialId);
    
    console.log('\n🎉 SUCCESS! EXACT Veridian pattern worked!');
    console.log('🆔 Credential ID:', credentialId);
    console.log('📋 Schema:', issuerCredential.sad.s);
    console.log('👤 Holder:', issuerCredential.sad.a.i);
    console.log('🏢 Employee:', issuerCredential.sad.a.employeeId);
    console.log('✅ VERIFIED: Real ACDC credential created with exact Veridian code');
    
    return credentialId;
    
  } catch (error) {
    console.error('❌ Veridian pattern failed:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

createVeridianCredential().then(credId => {
  if (credId) {
    console.log(`\n🎯 SUCCESS! Veridian's exact pattern created credential: ${credId}`);
  } else {
    console.log('\n❌ Even exact Veridian copy failed');
  }
});