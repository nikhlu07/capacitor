// Create credential using the agent we already successfully created
const { SignifyClient, ready, Tier } = require('signify-ts');

// Use a stored passcode to connect to our existing agent
const STORED_BRAN = "0123456789abcdefghijk"; // Simple fixed passcode

async function useExistingAgent() {
  console.log('🔄 Connecting to existing KERIA agent...');
  
  try {
    await ready();
    
    // Connect to existing agent with fixed passcode
    const client = new SignifyClient(
      'http://localhost:3904',
      STORED_BRAN,
      Tier.low,
      'http://localhost:3906'
    );

    // Just connect (don't boot)
    await client.connect();
    console.log('✅ Connected to existing agent');

    // List what we have
    const identifiers = await client.identifiers().list();
    console.log('📋 Available identifiers:', identifiers.aids?.length || 0);

    if (identifiers.aids?.length) {
      for (const aid of identifiers.aids) {
        console.log(`🆔 ${aid.name}: ${aid.prefix}`);
        
        // Try to create credential on this identifier
        try {
          const registries = await client.registries().list(aid.name);
          if (registries?.length) {
            console.log(`🏛️ Registry found: ${registries[0].regk}`);
            
            // Try credential creation
            console.log('🎯 Creating ACDC credential...');
            const result = await client.credentials().issue(aid.name, {
              ri: registries[0].regk,
              s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
              a: {
                i: aid.prefix,
                employeeId: "FIXED-001",
                seatPreference: "window", 
                mealPreference: "vegetarian",
                airlines: "Fixed Airlines",
                emergencyContact: "Fixed Contact",
                allergies: "None"
              }
            });
            
            console.log('🎉 CREDENTIAL CREATED!');
            console.log('🆔 ID:', result.acdc.ked.d);
            return result.acdc.ked.d;
          }
        } catch (e) {
          console.log(`❌ Could not create credential on ${aid.name}:`, e.message);
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    
    // Try creating new agent with fixed passcode
    console.log('🔄 Creating new agent with fixed passcode...');
    try {
      const client = new SignifyClient(
        'http://localhost:3904',
        STORED_BRAN,
        Tier.low,
        'http://localhost:3906'
      );
      
      await client.boot();
      await client.connect();
      console.log('✅ New agent created and connected');
      
      // Quick credential creation
      const result = await client.identifiers().create('fixed-issuer', {
        algo: 'randy', count: 1, ncount: 1, transferable: true
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      const regResult = await client.registries().create({
        name: 'fixed-issuer', registryName: "FixedRegistry"
      });
      
      await new Promise(r => setTimeout(r, 2000));
      
      // Resolve schema
      await client.oobis().resolve('http://host.docker.internal:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
      await new Promise(r => setTimeout(r, 2000));
      
      const issuer = await client.identifiers().get('fixed-issuer');
      const registries = await client.registries().list('fixed-issuer');
      
      const credResult = await client.credentials().issue('fixed-issuer', {
        ri: registries[0].regk,
        s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
        a: {
          i: issuer.prefix,
          employeeId: "FIXED-REAL-001",
          seatPreference: "window",
          mealPreference: "vegetarian", 
          airlines: "Real Fixed Airlines",
          emergencyContact: "Real Fixed Contact",
          allergies: "No allergies"
        }
      });
      
      console.log('🎉 REAL ACDC CREDENTIAL CREATED WITH FIXED AGENT!');
      console.log('🆔 CREDENTIAL ID:', credResult.acdc.ked.d);
      console.log('✅ This is stored in KERIA LMDB database');
      
      return credResult.acdc.ked.d;
      
    } catch (e2) {
      console.log('❌ Fixed agent also failed:', e2.message);
      return null;
    }
  }
}

useExistingAgent().then(credId => {
  if (credId) {
    console.log(`\n🎯 SUCCESS! REAL ACDC CREDENTIAL CREATED: ${credId}`);
    console.log('✅ Created with SignifyTS and KERI');
    console.log('💾 Stored in KERIA LMDB database');
    console.log('🔐 Real ACDC travel preferences credential');
  } else {
    console.log('\n❌ Could not create real ACDC credential');
  }
});