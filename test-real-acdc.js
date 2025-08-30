const { SignifyClient, ready, Tier } = require('signify-ts');
const fs = require('fs');

async function createRealACDC() {
  console.log('🎫 Creating REAL ACDC credential using your existing system...');
  
  await ready();
  
  // Use the same bran as your credential server
  const bransData = JSON.parse(fs.readFileSync('./travlr-ionic-app/credential-server/data/brans.json', 'utf8'));
  const bran = bransData.bran;
  console.log('🔑 Using existing bran from your system');
  
  const client = new SignifyClient(
    'http://127.0.0.1:3904',
    bran,
    Tier.low,
    'http://127.0.0.1:3904/boot'
  );

  try {
    // Connect (same as credential server)
    try {
      await client.connect();
    } catch (err) {
      console.log('🔄 Booting KERIA client...');
      await client.boot();
      await client.connect();
    }
    console.log('✅ Connected to KERIA');

    // List existing identifiers
    const identifiers = await client.identifiers().list();
    console.log(`📋 Found ${identifiers.aids.length} existing AIDs in KERIA`);
    
    let testAid = null;
    
    // Look for existing test AID or create one
    const existingTestAid = identifiers.aids.find(aid => aid.name.includes('test') || aid.name.includes('travlr'));
    
    if (existingTestAid) {
      testAid = existingTestAid;
      console.log(`✅ Using existing AID: ${testAid.name} (${testAid.prefix})`);
    } else {
      // Create a simple test AID
      console.log('🔄 Creating new test AID...');
      const aidName = 'test-travlr-employee';
      
      const result = await client.identifiers().create(aidName, {
        toad: 0,
        wits: []
      });
      
      // Wait for completion
      let op = result.op;
      while (!op.done) {
        await new Promise(resolve => setTimeout(resolve, 250));
        try {
          op = await client.operations().get(op.name);
        } catch (e) {
          break; // Operation might complete immediately
        }
      }
      
      testAid = await client.identifiers().get(aidName);
      console.log(`✅ Created new AID: ${testAid.name} (${testAid.prefix})`);
    }

    // Check/create registry
    let registries = await client.registries().list(testAid.name);
    
    if (registries.length === 0) {
      console.log('🔄 Creating registry...');
      const registryResult = await client.registries().create({
        name: testAid.name,
        registryName: 'test-registry'
      });
      
      let regOp = registryResult.op;
      while (!regOp.done) {
        await new Promise(resolve => setTimeout(resolve, 250));
        try {
          regOp = await client.operations().get(regOp.name);
        } catch (e) {
          break;
        }
      }
      
      registries = await client.registries().list(testAid.name);
      console.log('✅ Registry created');
    }

    console.log(`📋 Found ${registries.length} registries for ${testAid.name}`);

    // Now create ACDC credential using your credential server API
    console.log('🎫 Creating ACDC credential via your credential server...');
    
    const credentialData = {
      schemaSaid: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
      aid: testAid.prefix,  // holder
      issuerAid: testAid.name,  // issuer name
      attribute: {
        employeeId: 'TEST-001',
        seatPreference: 'window',
        mealPreference: 'vegetarian', 
        airlines: 'Test Airways',
        emergencyContact: 'Test Contact',
        allergies: 'None'
      }
    };

    console.log('📋 Credential data:', credentialData);

    const response = await fetch('http://localhost:3008/issueAcdcCredential', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentialData),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('🎉 SUCCESS! Real ACDC credential created!');
      console.log('🆔 Credential ID:', result.data.credentialId);
      console.log('📋 Schema:', result.data.schemaSaid);
      console.log('👤 Recipient:', result.data.recipient);
      
      // Verify credential exists in KERIA
      try {
        const credential = await client.credentials().get(result.data.credentialId);
        console.log('✅ Credential verified in KERIA LMDB!');
        console.log('📜 Credential attributes:', credential.sad.a);
      } catch (e) {
        console.log('⚠️ Could not verify credential in KERIA:', e.message);
      }
      
      return result;
    } else {
      console.error('❌ Failed to create credential:', result);
      return null;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

createRealACDC().then(result => {
  if (result) {
    console.log('\n🎯 REAL ACDC CREDENTIAL CREATED SUCCESSFULLY! 🎯');
    console.log('This credential is stored in KERIA\'s LMDB database.');
  } else {
    console.log('\n❌ Failed to create credential');
  }
}).catch(console.error);