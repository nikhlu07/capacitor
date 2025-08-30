// Simple credential creator - direct approach
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

async function createYourCredential() {
  console.log('🎫 Creating your REAL ACDC travel preferences credential...');
  
  try {
    await ready();
    const bran = randomPasscode();
    const client = new SignifyClient(
      'http://localhost:3904',
      bran,
      Tier.low,
      'http://localhost:3906'
    );

    // Boot and connect
    try {
      await client.boot();
    } catch (e) {
      if (!e.message?.includes('409')) throw e;
    }
    
    await client.connect();
    if (!client.authn) throw new Error('Auth failed');
    console.log('✅ Connected to KERIA');

    // Schema resolution - single call without polling
    console.log('🔄 Resolving schema...');
    try {
      await client.oobis().resolve('http://host.docker.internal:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
      console.log('✅ Schema resolution initiated');
    } catch (e) {
      console.log('🔄 Schema might already be resolved, continuing...');
    }

    // Wait a moment for resolution to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create issuer
    const ISSUER = 'your-travlr-issuer';
    let issuer;
    try {
      issuer = await client.identifiers().get(ISSUER);
      console.log(`✅ Using existing issuer: ${issuer.prefix}`);
    } catch (e) {
      console.log('🆕 Creating issuer...');
      const result = await client.identifiers().create(ISSUER, {
        algo: 'randy', count: 1, ncount: 1, transferable: true
      });
      
      // Wait for completion
      let op = await result.op();
      for (let i = 0; i < 20; i++) {
        try {
          op = await client.operations().get(op.name);
          if (op.done) break;
        } catch (e) {
          console.log(`Waiting for issuer creation... (${i+1}/20)`);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      
      issuer = await client.identifiers().get(ISSUER);
      console.log(`✅ Created issuer: ${issuer.prefix}`);
    }

    // Create registry
    let registries;
    try {
      registries = await client.registries().list(ISSUER);
      if (!registries?.length) throw new Error('No registry');
      console.log(`✅ Using existing registry: ${registries[0].regk}`);
    } catch (e) {
      console.log('🏛️ Creating registry...');
      const result = await client.registries().create({ 
        name: ISSUER, 
        registryName: "YourTravlrCredentials" 
      });
      
      // Wait for completion
      let op = await result.op();
      for (let i = 0; i < 20; i++) {
        try {
          op = await client.operations().get(op.name);
          if (op.done) break;
        } catch (e) {
          console.log(`Waiting for registry creation... (${i+1}/20)`);
        }
        await new Promise(r => setTimeout(r, 500));
      }
      
      registries = await client.registries().list(ISSUER);
      console.log(`✅ Created registry: ${registries[0].regk}`);
    }

    // Create YOUR credential
    console.log('🎫 Creating YOUR travel preferences credential...');
    const yourPreferences = {
      i: issuer.prefix,
      employeeId: "USER001", 
      seatPreference: "window",
      mealPreference: "vegetarian", 
      airlines: "Your Preferred Airlines",
      emergencyContact: "Emergency Contact: +1-XXX-XXX-XXXX",
      allergies: "None specified"
    };

    console.log('📝 Your travel preferences:');
    console.log(`   🪑 Seat: ${yourPreferences.seatPreference}`);
    console.log(`   🍽️ Meal: ${yourPreferences.mealPreference}`);
    console.log(`   ✈️ Airlines: ${yourPreferences.airlines}`);

    const credResult = await client.credentials().issue(ISSUER, {
      ri: registries[0].regk,
      s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
      a: yourPreferences,
    });

    // Wait for credential creation
    let credOp = credResult.op;
    for (let i = 0; i < 30; i++) {
      try {
        credOp = await client.operations().get(credOp.name);
        if (credOp.done) break;
      } catch (e) {
        console.log(`Waiting for your credential... (${i+1}/30)`);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    const credentialId = credResult.acdc.ked.d;
    console.log(`\n✅ YOUR REAL ACDC CREDENTIAL CREATED!`);
    console.log(`🆔 Credential ID: ${credentialId}`);
    
    // Verify it's real
    try {
      const stored = await client.credentials().get(credentialId);
      console.log(`✅ VERIFIED in KERIA LMDB: ${stored.sad.d}`);
      console.log(`📋 Schema: ${stored.sad.s}`);
      console.log(`👤 Your AID: ${stored.sad.a.i}`);
      console.log(`🏢 Employee ID: ${stored.sad.a.employeeId}`);
      console.log(`🪑 Your Seat Preference: ${stored.sad.a.seatPreference}`);
      console.log(`🍽️ Your Meal Preference: ${stored.sad.a.mealPreference}`);
      
      console.log(`\n🎉 SUCCESS! Your real ACDC travel credential is ready!`);
      console.log(`✅ Stored in KERIA's LMDB database`);
      console.log(`✅ Fully verifiable ACDC credential`);
      console.log(`✅ Created with Veridian's schema resolution pattern`);
      
      return credentialId;
    } catch (e) {
      console.log('❌ Could not verify credential:', e.message);
      return null;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

createYourCredential().then(id => {
  if (id) {
    console.log(`\n🎯 Your credential ID for future reference: ${id}`);
  } else {
    console.log(`\n❌ Credential creation failed`);
  }
});