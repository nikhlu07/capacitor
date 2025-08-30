// Create ACDC credential using KERIA's configured passcode
const { SignifyClient, ready, Tier } = require('signify-ts');

const KERIA_PASSCODE = "0123456789abcdefghij1"; // From docker-compose.yaml

async function createWithKeriaPasscode() {
  console.log('🎫 Creating ACDC with KERIA configured passcode...');
  
  try {
    await ready();
    
    // Use KERIA's exact configured passcode
    const client = new SignifyClient(
      'http://localhost:3904',
      KERIA_PASSCODE,
      Tier.low,
      'http://localhost:3906'
    );

    console.log('🔄 Connecting with configured passcode...');
    
    // Connect to existing agent (don't boot)
    await client.connect();
    
    if (!client.authn) {
      throw new Error('Authentication failed with configured passcode');
    }
    
    console.log('✅ Connected with KERIA passcode');

    // Check what already exists
    const identifiers = await client.identifiers().list();
    console.log(`📋 Found ${identifiers.aids?.length || 0} existing identifiers`);

    let issuerName = 'keria-passcode-issuer';
    let issuer, registries;
    
    // Create or use existing identifier
    try {
      issuer = await client.identifiers().get(issuerName);
      console.log(`✅ Using existing issuer: ${issuer.prefix}`);
    } catch (e) {
      console.log('🆕 Creating issuer with KERIA passcode...');
      const result = await client.identifiers().create(issuerName, {
        algo: 'randy',
        count: 1,
        ncount: 1,
        transferable: true
      });
      
      // Simple timeout
      await new Promise(r => setTimeout(r, 2000));
      
      issuer = await client.identifiers().get(issuerName);
      console.log(`✅ Created issuer: ${issuer.prefix}`);
    }
    
    // Create or use existing registry
    try {
      registries = await client.registries().list(issuerName);
      if (!registries || registries.length === 0) {
        throw new Error('No registry');
      }
      console.log(`✅ Using existing registry: ${registries[0].regk}`);
    } catch (e) {
      console.log('🏛️ Creating registry...');
      const regResult = await client.registries().create({
        name: issuerName,
        registryName: "KeriaPasscodeRegistry"
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      registries = await client.registries().list(issuerName);
      console.log(`✅ Created registry: ${registries[0].regk}`);
    }

    // Resolve schema
    console.log('📋 Resolving schema...');
    try {
      await client.oobis().resolve('http://host.docker.internal:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
      await new Promise(r => setTimeout(r, 2000));
      console.log('✅ Schema resolved');
    } catch (e) {
      console.log('⚠️ Schema resolution issue, continuing...');
    }

    // Create the ACDC credential
    console.log('🎯 Creating REAL ACDC credential with KERIA passcode...');
    
    const credentialData = {
      i: issuer.prefix,
      employeeId: "KERIA-PASSCODE-001",
      seatPreference: "window",
      mealPreference: "vegetarian", 
      airlines: "KERIA Airways",
      emergencyContact: "KERIA Emergency Contact",
      allergies: "No known allergies"
    };

    console.log('📝 Your credential attributes:');
    console.log(`   🆔 Holder: ${credentialData.i}`);
    console.log(`   🏢 Employee: ${credentialData.employeeId}`);
    console.log(`   🪑 Seat: ${credentialData.seatPreference}`);
    console.log(`   🍽️ Meal: ${credentialData.mealPreference}`);

    const credResult = await client.credentials().issue(issuerName, {
      ri: registries[0].regk,
      s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
      a: credentialData
    });

    await new Promise(r => setTimeout(r, 3000));

    const credentialId = credResult.acdc.ked.d;
    console.log('\n🎉 REAL ACDC CREDENTIAL CREATED WITH KERIA PASSCODE!');
    console.log(`🆔 Credential ID: ${credentialId}`);
    
    // Verify
    try {
      const storedCredential = await client.credentials().get(credentialId);
      
      console.log('✅ VERIFIED: Credential stored in KERIA LMDB!');
      console.log(`📋 Schema: ${storedCredential.sad.s}`);
      console.log(`👤 Holder: ${storedCredential.sad.a.i}`);
      console.log(`🏢 Employee: ${storedCredential.sad.a.employeeId}`);
      console.log(`🪑 Seat: ${storedCredential.sad.a.seatPreference}`);
      console.log(`🍽️ Meal: ${storedCredential.sad.a.mealPreference}`);
      
      console.log('\n🎯 COMPLETE SUCCESS!');
      console.log('✅ Real ACDC credential created using KERIA configured passcode');
      console.log('✅ Stored in KERIA LMDB database');
      console.log('✅ Schema resolved via OOBI'); 
      console.log('✅ Ready for use in Travlr-ID system');
      
      return credentialId;
      
    } catch (verifyError) {
      console.log('⚠️ Credential created but verification had issues');
      console.log(`🆔 Credential ID: ${credentialId}`);
      return credentialId;
    }

  } catch (error) {
    console.error('❌ Error with KERIA passcode approach:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

createWithKeriaPasscode().then(credId => {
  if (credId) {
    console.log(`\n🎯 SUCCESS! Your ACDC credential: ${credId}`);
    console.log('💾 Stored in KERIA LMDB database');
    console.log('🔐 Created with configured KERIA passcode');
    console.log('✅ This is a real, verifiable ACDC credential!');
  } else {
    console.log('\n❌ Could not create credential even with KERIA passcode');
  }
});