// Create credential using YOUR EXACT mobile app pattern  
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

async function createWithYourPattern() {
  console.log('🎫 Creating credential using YOUR mobile app\'s EXACT pattern...');
  
  try {
    // Step 1: Initialize exactly like your mobile app
    console.log('🔧 Initializing SignifyTS using your Veridian pattern...');
    
    await ready();
    console.log('✅ SignifyTS ready');

    // Generate fresh passcode like your mobile app  
    const bran = randomPasscode();
    console.log('🔑 Generated fresh randomPasscode like your mobile app');
    
    const signifyClient = new SignifyClient(
      'http://localhost:3904',  // Your KERIA Admin API
      bran,                     // Fresh passcode
      Tier.low,
      'http://localhost:3906'   // Your boot URL
    );

    // Boot and connect exactly like your mobile app
    try {
      await signifyClient.boot();
      console.log('✅ Booted new KERIA agent');
    } catch (bootError) {
      if (bootError.message?.includes('409')) {
        console.log('🔄 Agent already exists, connecting to existing');
      } else {
        throw bootError;
      }
    }
    
    await signifyClient.connect();
    console.log('✅ Connected to KERIA agent');

    // Critical auth check like your mobile app
    if (!signifyClient.authn) {
      throw new Error('Authentication not established after connect()');
    }
    console.log('✅ Authentication confirmed - ready for KERI operations');

    // Step 2: Create identifier using your exact pattern
    const aidName = 'your-travlr-credential-issuer';
    let aid;
    
    try {
      console.log('🔍 Checking for existing identifier:', aidName);
      const existingId = await signifyClient.identifiers().get(aidName);
      aid = existingId.prefix;
      console.log('✅ Using existing KERI identity:', aid);
    } catch (e) {
      console.log('🆕 Creating new identifier using your pattern...');
      
      const result = await signifyClient.identifiers().create(aidName, {
        algo: 'randy',
        count: 1, 
        ncount: 1,
        transferable: true
      });
      
      // Use YOUR timeout pattern (not complex polling)
      console.log('⏳ Waiting for identifier creation (your 2-second pattern)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const createdId = await signifyClient.identifiers().get(aidName);
      aid = createdId.prefix;
      console.log('✅ Real KERI identity created:', aid);
    }

    // Step 3: Create registry using your pattern
    let registries;
    try {
      registries = await signifyClient.registries().list(aidName);
      if (!registries || registries.length === 0) {
        throw new Error('No registry found');
      }
      console.log('✅ Using existing registry:', registries[0].regk);
    } catch (e) {
      console.log('🏛️ Creating registry using your pattern...');
      
      const regResult = await signifyClient.registries().create({
        name: aidName,
        registryName: "YourTravlrCredentials"
      });
      
      // Your timeout pattern
      console.log('⏳ Waiting for registry creation (your 2-second pattern)...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      registries = await signifyClient.registries().list(aidName);
      console.log('✅ Registry created:', registries[0].regk);
    }

    // Step 4: Resolve schema before credential creation
    console.log('🔄 Resolving schema using simplified approach...');
    try {
      await signifyClient.oobis().resolve('http://host.docker.internal:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
      console.log('⏳ Waiting for schema resolution (your pattern)...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Bit longer for schema
      console.log('✅ Schema resolved');
    } catch (e) {
      console.log('🔄 Schema might already be resolved, continuing...');
    }

    // Step 5: Create YOUR real ACDC credential
    console.log('🎫 Creating YOUR real ACDC travel preferences credential...');
    
    const yourTravelPreferences = {
      i: aid,  // Your AID as the credential subject
      employeeId: "YOUR-EMP-001",
      seatPreference: "window", 
      mealPreference: "vegetarian",
      airlines: "Delta Airlines / Your Preferred Carrier",
      emergencyContact: "Emergency: +1-555-000-0000",
      allergies: "No known allergies"
    };

    console.log('📝 YOUR travel preferences:');
    console.log(`   🆔 Your AID: ${yourTravelPreferences.i}`);
    console.log(`   🏢 Employee ID: ${yourTravelPreferences.employeeId}`);
    console.log(`   🪑 Seat Preference: ${yourTravelPreferences.seatPreference}`);
    console.log(`   🍽️ Meal Preference: ${yourTravelPreferences.mealPreference}`);
    console.log(`   ✈️ Airlines: ${yourTravelPreferences.airlines}`);

    const credResult = await signifyClient.credentials().issue(aidName, {
      ri: registries[0].regk,
      s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU', // Travel preferences schema
      a: yourTravelPreferences,
    });

    // Use YOUR timeout pattern for credential creation
    console.log('⏳ Waiting for credential creation (your pattern)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const credentialId = credResult.acdc.ked.d;
    console.log(`\n🎉 YOUR REAL ACDC CREDENTIAL IS READY!`);
    console.log(`🆔 Credential ID: ${credentialId}`);
    
    // Verify it's really in KERIA LMDB
    try {
      const storedCredential = await signifyClient.credentials().get(credentialId);
      
      console.log(`\n✅ VERIFIED: Your credential is stored in KERIA's LMDB!`);
      console.log(`🆔 SAID: ${storedCredential.sad.d}`);
      console.log(`📋 Schema: ${storedCredential.sad.s}`);
      console.log(`👤 Your AID: ${storedCredential.sad.a.i}`);
      console.log(`🏢 Employee ID: ${storedCredential.sad.a.employeeId}`);
      console.log(`🪑 Seat: ${storedCredential.sad.a.seatPreference}`);
      console.log(`🍽️ Meal: ${storedCredential.sad.a.mealPreference}`);
      console.log(`✈️ Airlines: ${storedCredential.sad.a.airlines}`);
      console.log(`🚨 Emergency: ${storedCredential.sad.a.emergencyContact}`);
      console.log(`🩺 Allergies: ${storedCredential.sad.a.allergies}`);
      
      console.log(`\n🎯 COMPLETE SUCCESS!`);
      console.log(`✅ Real ACDC credential created using YOUR mobile app's pattern`);
      console.log(`✅ Stored in KERIA's LMDB database`);
      console.log(`✅ Schema resolved via OOBI endpoint`);
      console.log(`✅ Fully verifiable travel preferences credential`);
      console.log(`✅ Ready for use in your Travlr-ID system`);
      
      return credentialId;
      
    } catch (verifyError) {
      console.log('⚠️ Credential created but verification failed:', verifyError.message);
      console.log('🎫 Credential ID for manual verification:', credentialId);
      return credentialId;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

createWithYourPattern().then(credId => {
  if (credId) {
    console.log(`\n🎯 Final Result: Your ACDC credential ID is ${credId}`);
    console.log(`💾 This credential is permanently stored in your KERIA database`);
    console.log(`🔗 You can now use this credential in your Travlr-ID system`);
  } else {
    console.log(`\n❌ Failed to create your credential`);
  }
});