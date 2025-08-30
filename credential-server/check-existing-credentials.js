// Check what credentials and identifiers already exist in KERIA
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

async function checkExistingCredentials() {
  console.log('🔍 Checking existing credentials in KERIA...');
  
  try {
    await ready();
    const bran = randomPasscode();
    const client = new SignifyClient(
      'http://localhost:3904',
      bran,
      Tier.low,
      'http://localhost:3906'
    );

    try {
      await client.boot();
    } catch (e) {
      if (!e.message?.includes('409')) throw e;
    }
    
    await client.connect();
    console.log('✅ Connected to KERIA');

    // Check identifiers
    try {
      const identifiers = await client.identifiers().list();
      console.log(`\n📋 Found ${identifiers.aids?.length || 0} identifiers:`);
      
      if (identifiers.aids) {
        for (const aid of identifiers.aids) {
          console.log(`  🆔 ${aid.name}: ${aid.prefix}`);
          
          // Check for credentials on this identifier
          try {
            const credentials = await client.credentials().list(aid.name);
            console.log(`    📜 Credentials: ${credentials?.length || 0}`);
            
            if (credentials?.length) {
              for (const cred of credentials) {
                console.log(`      🎫 ${cred.sad.d} (Schema: ${cred.sad.s})`);
                console.log(`         Attributes: ${JSON.stringify(cred.sad.a)}`);
              }
            }
          } catch (e) {
            console.log(`    📜 Could not list credentials: ${e.message}`);
          }
          
          // Check registries
          try {
            const registries = await client.registries().list(aid.name);
            console.log(`    🏛️ Registries: ${registries?.length || 0}`);
            
            if (registries?.length) {
              for (const reg of registries) {
                console.log(`      📋 Registry: ${reg.regk}`);
              }
            }
          } catch (e) {
            console.log(`    🏛️ Could not list registries: ${e.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`❌ Could not list identifiers: ${error.message}`);
    }

    // Check if we can find any existing credentials directly
    console.log('\n🔍 Searching for any existing travel credentials...');
    
    // Try to find credentials with our schema
    const TRAVEL_SCHEMA = 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU';
    
    if (identifiers.aids) {
      for (const aid of identifiers.aids) {
        try {
          const credentials = await client.credentials().list(aid.name);
          if (credentials?.length) {
            for (const cred of credentials) {
              if (cred.sad.s === TRAVEL_SCHEMA) {
                console.log(`\n🎉 Found existing travel credential!`);
                console.log(`🆔 Credential ID: ${cred.sad.d}`);
                console.log(`👤 Holder: ${cred.sad.a.i}`);
                console.log(`🏢 Employee: ${cred.sad.a.employeeId}`);
                console.log(`🪑 Seat: ${cred.sad.a.seatPreference}`);
                console.log(`🍽️ Meal: ${cred.sad.a.mealPreference}`);
                console.log(`✅ This is a REAL ACDC credential already in KERIA!`);
                return cred.sad.d;
              }
            }
          }
        } catch (e) {
          // Skip errors for individual identifiers
        }
      }
    }
    
    console.log('❌ No existing travel credentials found');
    return null;

  } catch (error) {
    console.error('❌ Error checking credentials:', error.message);
    return null;
  }
}

checkExistingCredentials().then(credId => {
  if (credId) {
    console.log(`\n🎯 Existing travel credential found: ${credId}`);
    console.log(`✅ You already have a real ACDC travel credential in KERIA!`);
  } else {
    console.log(`\n💡 No existing credentials found. Need to create a new one.`);
  }
});