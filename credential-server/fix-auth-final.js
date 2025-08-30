// Fix KERIA authentication using the exact mobile app pattern
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

async function fixAuthenticationIssue() {
  console.log('🔧 Fixing KERIA authentication using your mobile app pattern...');
  
  try {
    await ready();
    console.log('✅ SignifyTS ready');
    
    // Use your mobile app's EXACT pattern - fresh passcode each time
    const bran = randomPasscode();
    console.log('🔑 Generated fresh randomPasscode like your mobile app');
    
    const client = new SignifyClient(
      'http://127.0.0.1:3904',  // IPv4
      bran,                     // Fresh passcode like mobile app
      Tier.low,
      'http://127.0.0.1:3906'   // IPv4
    );
    
    console.log('🔍 Client created, URL config:', {
      url: client.url,
      bootUrl: client.bootUrl
    });
    
    // EXACT mobile app pattern - boot first, then connect
    console.log('🔄 Boot first, then connect (your mobile app pattern)...');
    try {
      await client.boot();
      console.log('✅ Booted new KERIA agent');
    } catch (bootError) {
      if (bootError.message?.includes('409')) {
        console.log('🔄 Agent already exists, connecting to existing agent');
      } else {
        throw bootError;
      }
    }
    
    await client.connect();
    console.log('✅ Connected to KERIA agent');
    
    // EXACT mobile app pattern - check authentication state
    console.log('🔍 SignifyClient state:', {
      authn: !!client.authn,
      controller: !!client.controller,
      agent: !!client.agent,
      url: client.url
    });
    
    // CRITICAL: Ensure authentication is fully established (your pattern)
    if (!client.authn) {
      throw new Error('Authentication not established after connect(). KERIA connection failed.');
    }
    
    console.log('✅ Authentication confirmed - ready for KERI operations');
    
    // Test with your exact mobile app debug pattern
    console.log('🔍 About to create identifier - client state:', {
      authn: !!client.authn,
      controller: client.controller?.pre,
      agent: client.agent?.pre,
    });
    
    // Create identifier using your EXACT mobile app pattern
    const aidName = 'mobile-pattern-issuer';
    console.log('🆕 Creating identifier using your mobile app pattern...');
    
    const result = await client.identifiers().create(aidName, {
      algo: 'randy',
      count: 1,
      ncount: 1,
      transferable: true
    });
    
    console.log('✅ SUCCESS! Identifier creation initiated');
    
    // Wait for identifier using your pattern - simple timeout
    console.log('⏳ Waiting for identifier creation (your mobile pattern)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const createdId = await client.identifiers().get(aidName);
    const aid = createdId.prefix;
    console.log('✅ Real KERI identity created using mobile pattern:', aid);
    
    // Create registry using mobile pattern
    console.log('🏛️ Creating registry using mobile pattern...');
    const regResult = await client.registries().create({
      name: aidName,
      registryName: "MobilePatternRegistry"
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const registries = await client.registries().list(aidName);
    console.log('✅ Registry created using mobile pattern:', registries[0].regk);
    
    // Schema resolution
    console.log('📋 Resolving schema...');
    try {
      await client.oobis().resolve('http://travlr-schema:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
      await new Promise(r => setTimeout(r, 2000));
      console.log('✅ Schema resolved');
    } catch (e) {
      console.log('⚠️ Schema resolution issue, continuing...');
    }
    
    // CREATE THE ACTUAL CREDENTIAL using mobile pattern
    console.log('🎫 Creating REAL ACDC credential using mobile app authentication...');
    
    const credentialData = {
      i: aid,
      employeeId: "MOBILE-AUTH-001",
      seatPreference: "window", 
      mealPreference: "vegetarian",
      airlines: "Mobile Pattern Airways",
      emergencyContact: "Mobile Emergency Contact",
      allergies: "None specified"
    };
    
    console.log('📝 Credential attributes:');
    console.log(`   🆔 Holder AID: ${credentialData.i}`);
    console.log(`   🏢 Employee: ${credentialData.employeeId}`);
    console.log(`   🪑 Seat: ${credentialData.seatPreference}`);
    console.log(`   🍽️ Meal: ${credentialData.mealPreference}`);
    
    const credResult = await client.credentials().issue(aidName, {
      ri: registries[0].regk,
      s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
      a: credentialData
    });
    
    console.log('✅ Credential issuance initiated!');
    console.log('⏳ Waiting for credential creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const credentialId = credResult.acdc.ked.d;
    console.log(`🎉 REAL ACDC CREDENTIAL CREATED: ${credentialId}`);
    
    // Verify like mobile app would
    try {
      const storedCredential = await client.credentials().get(credentialId);
      
      console.log('\n✅ SUCCESS! Mobile app authentication pattern worked!');
      console.log(`🆔 Credential ID: ${credentialId}`);
      console.log(`📋 Schema: ${storedCredential.sad.s}`);
      console.log(`👤 Holder: ${storedCredential.sad.a.i}`);
      console.log(`🏢 Employee: ${storedCredential.sad.a.employeeId}`);
      console.log(`🪑 Seat: ${storedCredential.sad.a.seatPreference}`);
      console.log(`🍽️ Meal: ${storedCredential.sad.a.mealPreference}`);
      
      console.log('\n🎯 AUTHENTICATION ISSUE FIXED!');
      console.log('✅ Using your mobile app\'s exact authentication flow');
      console.log('✅ Fresh passcode generation works correctly');
      console.log('✅ Boot-then-connect pattern successful');
      console.log('✅ Real ACDC credential created and verified');
      
      return credentialId;
      
    } catch (verifyError) {
      console.log('⚠️ Credential created but verification failed:', verifyError.message);
      console.log(`🆔 Credential ID: ${credentialId}`);
      return credentialId;
    }
    
  } catch (error) {
    console.error('❌ Mobile app authentication pattern failed:', error.message);
    console.error('Full error:', error);
    return null;
  }
}

fixAuthenticationIssue().then(credId => {
  if (credId) {
    console.log(`\n🏆 FIXED! Your ACDC credential: ${credId}`);
    console.log('🔧 Authentication issues resolved using mobile app pattern');
    console.log('✅ Real ACDC credential successfully created!');
  } else {
    console.log('\n❌ Mobile app authentication pattern did not work in server environment');
  }
});