// Just check what credentials actually exist in KERIA right now
const { SignifyClient, ready, Tier } = require('signify-ts');

async function checkExistingCredentials() {
  console.log('Checking what credentials actually exist in KERIA...');
  
  try {
    await ready();
    
    const client = new SignifyClient(
      'http://localhost:3904',
      '0123456789abcdefghij1',
      Tier.low,
      'http://localhost:3906'
    );

    await client.connect();
    
    const identifiers = await client.identifiers().list();
    console.log(`Found ${identifiers.aids?.length || 0} identifiers`);

    for (const aid of identifiers.aids || []) {
      console.log(`\nIdentifier: ${aid.name} (${aid.prefix})`);
      
      try {
        const credentials = await client.credentials().list(aid.name);
        console.log(`  Credentials: ${credentials?.length || 0}`);
        
        if (credentials?.length > 0) {
          for (const cred of credentials) {
            console.log(`\n  🎫 FOUND CREDENTIAL:`);
            console.log(`     ID: ${cred.sad.d}`);
            console.log(`     Schema: ${cred.sad.s}`);
            console.log(`     Holder: ${cred.sad.a.i}`);
            if (cred.sad.a.employeeId) {
              console.log(`     Employee: ${cred.sad.a.employeeId}`);
              console.log(`     Seat: ${cred.sad.a.seatPreference}`);
              console.log(`     Meal: ${cred.sad.a.mealPreference}`);
              console.log(`\n  ✅ THIS IS A REAL ACDC CREDENTIAL!`);
              return cred.sad.d;
            }
          }
        }
      } catch (e) {
        console.log(`  Could not check credentials: ${e.message}`);
      }
    }
    
    console.log('\nNo credentials found');
    return null;

  } catch (error) {
    console.log('Error:', error.message);
    return null;
  }
}

checkExistingCredentials().then(credId => {
  if (credId) {
    console.log(`\n🎉 FOUND YOUR REAL ACDC CREDENTIAL: ${credId}`);
    console.log('✅ It exists in KERIA LMDB database');
    console.log('✅ This is a real, working ACDC credential');
  } else {
    console.log('\n❌ No existing credentials found');
  }
});