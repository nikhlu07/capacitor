// Use KERIA's exact configured passcode for ALL operations
const { SignifyClient, ready, Tier } = require('signify-ts');

const KERIA_PASSCODE = "0123456789abcdefghij1"; // From docker env

async function useKeriaConfiguredPasscode() {
  console.log('🔧 Using KERIA\'s configured passcode for ALL operations...');
  
  try {
    await ready();
    console.log('✅ SignifyTS ready');
    
    // Use KERIA's EXACT configured passcode (not random)
    const client = new SignifyClient(
      'http://127.0.0.1:3904',  
      KERIA_PASSCODE,          // Use configured passcode, not random!
      Tier.low,
      'http://127.0.0.1:3906'   
    );
    
    console.log('🔑 Using KERIA configured passcode:', KERIA_PASSCODE);
    
    // Try connecting to existing agent first (no boot)
    try {
      await client.connect();
      console.log('✅ Connected to existing agent with configured passcode');
    } catch (connectError) {
      // If connect fails, try boot then connect
      console.log('🔄 Connect failed, trying boot with configured passcode...');
      await client.boot();
      await client.connect();
      console.log('✅ Booted and connected with configured passcode');
    }
    
    console.log('🔍 Client state:', {
      authn: !!client.authn,
      controller: client.controller?.pre,
      agent: client.agent?.pre
    });
    
    if (!client.authn) {
      throw new Error('Authentication failed with configured passcode');
    }
    
    console.log('✅ Authentication confirmed with KERIA passcode');
    
    // Test identifier creation with configured passcode
    const aidName = 'keria-passcode-issuer';
    console.log('🆔 Creating identifier with KERIA configured passcode...');
    
    try {
      // Try to get existing first
      const existingId = await client.identifiers().get(aidName);
      console.log(`✅ Using existing identifier: ${existingId.prefix}`);
      
      // Create registry if needed
      let registries;
      try {
        registries = await client.registries().list(aidName);
        if (!registries || registries.length === 0) throw new Error('No registry');
        console.log(`✅ Using existing registry: ${registries[0].regk}`);
      } catch (regError) {
        console.log('🏛️ Creating registry...');
        const regResult = await client.registries().create({
          name: aidName,
          registryName: "KeriaPasscodeRegistry"
        });
        await new Promise(r => setTimeout(r, 2000));
        registries = await client.registries().list(aidName);
        console.log(`✅ Registry created: ${registries[0].regk}`);
      }
      
      // Schema resolution
      console.log('📋 Resolving schema with configured passcode...');
      try {
        await client.oobis().resolve('http://travlr-schema:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
        await new Promise(r => setTimeout(r, 2000));
        console.log('✅ Schema resolved with configured passcode');
      } catch (e) {
        console.log('⚠️ Schema resolution issue, continuing...');
      }
      
      // CREATE THE CREDENTIAL with configured passcode
      console.log('🎫 Creating REAL ACDC credential with KERIA configured passcode...');
      
      const credentialData = {
        i: existingId.prefix,
        employeeId: "KERIA-PASS-001",
        seatPreference: "window",
        mealPreference: "vegetarian", 
        airlines: "KERIA Passcode Airways",
        emergencyContact: "KERIA Emergency",
        allergies: "None"
      };
      
      console.log('📝 Creating credential with attributes:');
      console.log(`   🆔 Holder: ${credentialData.i}`);
      console.log(`   🏢 Employee: ${credentialData.employeeId}`);
      
      const credResult = await client.credentials().issue(aidName, {
        ri: registries[0].regk,
        s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
        a: credentialData
      });
      
      console.log('✅ Credential issuance initiated with configured passcode!');
      await new Promise(r => setTimeout(r, 3000));
      
      const credentialId = credResult.acdc.ked.d;
      console.log(`🎉 CREDENTIAL CREATED: ${credentialId}`);
      
      // Verify
      const stored = await client.credentials().get(credentialId);
      console.log(`✅ VERIFIED: ${stored.sad.d}`);
      console.log(`👤 Holder: ${stored.sad.a.i}`);
      console.log(`🏢 Employee: ${stored.sad.a.employeeId}`);
      
      console.log('\n🎯 SUCCESS WITH KERIA CONFIGURED PASSCODE!');
      console.log('✅ Using KERIA\'s environment passcode resolved authentication');
      console.log('✅ Real ACDC credential created and verified');
      
      return credentialId;
      
    } catch (idError) {
      // If getting existing fails, create new
      console.log('🆕 Creating new identifier with configured passcode...');
      
      const result = await client.identifiers().create(aidName, {
        algo: 'randy',
        count: 1,
        ncount: 1,
        transferable: true
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      const createdId = await client.identifiers().get(aidName);
      console.log(`✅ Created identifier with configured passcode: ${createdId.prefix}`);
      
      // Continue with registry and credential creation...
      console.log('🏛️ Creating registry with configured passcode...');
      const regResult = await client.registries().create({
        name: aidName,
        registryName: "KeriaPasscodeRegistry"
      });
      
      await new Promise(r => setTimeout(r, 2000));
      const registries = await client.registries().list(aidName);
      console.log(`✅ Registry created with configured passcode: ${registries[0].regk}`);
      
      // Schema and credential creation continues...
      console.log('📋 Resolving schema...');
      try {
        await client.oobis().resolve('http://travlr-schema:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {}
      
      console.log('🎫 Creating credential with configured passcode...');
      
      const credentialData = {
        i: createdId.prefix,
        employeeId: "NEW-KERIA-001",
        seatPreference: "window",
        mealPreference: "vegetarian", 
        airlines: "New KERIA Airways",
        emergencyContact: "New KERIA Emergency",
        allergies: "None"
      };
      
      const credResult = await client.credentials().issue(aidName, {
        ri: registries[0].regk,
        s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
        a: credentialData
      });
      
      await new Promise(r => setTimeout(r, 3000));
      
      const credentialId = credResult.acdc.ked.d;
      console.log(`🎉 NEW CREDENTIAL CREATED: ${credentialId}`);
      
      const stored = await client.credentials().get(credentialId);
      console.log(`✅ VERIFIED: ${stored.sad.d}`);
      
      console.log('\n🎯 SUCCESS WITH NEW IDENTIFIER AND KERIA PASSCODE!');
      return credentialId;
    }
    
  } catch (error) {
    console.error('❌ Configured passcode approach failed:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

useKeriaConfiguredPasscode().then(credId => {
  if (credId) {
    console.log(`\n🏆 FINAL SUCCESS! ACDC credential: ${credId}`);
    console.log('🔧 KERIA configured passcode resolved all issues');
    console.log('✅ Real ACDC credential successfully created!');
  } else {
    console.log('\n❌ Even KERIA configured passcode did not work');
  }
});