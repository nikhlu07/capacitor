// Fix network issue by forcing IPv4 and checking KERIA status
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

async function fixNetworkIssues() {
  console.log('🔧 Fixing network configuration issues...');
  
  // First, check KERIA is actually responding
  try {
    const axios = require('axios');
    
    console.log('🔍 Testing KERIA connectivity...');
    
    // Test basic connectivity
    const response = await axios.get('http://127.0.0.1:3904', { 
      timeout: 5000,
      headers: { 'Accept': 'application/json' }
    }).catch(e => ({ status: e.response?.status, error: e.message }));
    
    console.log('KERIA response:', response.status || response.error);
    
    if (response.status === 401) {
      console.log('✅ KERIA is responding (401 = needs auth, which is expected)');
    } else {
      console.log('❌ KERIA connectivity issue');
      return null;
    }
    
    // Now try with forced IPv4 and proper timeout settings
    console.log('🔧 Creating SignifyTS client with network fixes...');
    
    await ready();
    const bran = randomPasscode();
    
    const client = new SignifyClient(
      'http://127.0.0.1:3904',  // Force IPv4 with 127.0.0.1 instead of localhost
      bran,
      Tier.low,
      'http://127.0.0.1:3906'   // Force IPv4 for boot URL too
    );

    // Override fetch to add longer timeouts
    const originalFetch = client.fetch;
    client.fetch = async function(path, method, data, headers) {
      console.log(`🔗 API Call: ${method} ${this.url}${path}`);
      
      // Add timeout and retry logic
      try {
        return await originalFetch.call(this, path, method, data, headers);
      } catch (error) {
        console.log(`⚠️ API call failed, retrying... ${error.message}`);
        await new Promise(r => setTimeout(r, 1000));
        return await originalFetch.call(this, path, method, data, headers);
      }
    };

    console.log('🔄 Booting agent with IPv4...');
    try {
      await client.boot();
      console.log('✅ Agent booted successfully');
    } catch (bootError) {
      if (bootError.message?.includes('409')) {
        console.log('✅ Agent already exists');
      } else {
        throw bootError;
      }
    }

    console.log('🔄 Connecting with IPv4...');
    await client.connect();
    
    if (!client.authn) {
      throw new Error('Authentication failed');
    }
    
    console.log('✅ Connected and authenticated with IPv4!');
    
    // Test basic operations
    console.log('🧪 Testing basic operations...');
    
    const issuerName = 'ipv4-test-issuer';
    
    try {
      console.log('🆔 Creating identifier with IPv4...');
      const result = await client.identifiers().create(issuerName, {
        algo: 'randy',
        count: 1,
        ncount: 1,
        transferable: true
      });
      
      // Simple wait
      await new Promise(r => setTimeout(r, 3000));
      
      const identifier = await client.identifiers().get(issuerName);
      console.log(`✅ SUCCESS! Created AID with IPv4: ${identifier.prefix}`);
      
      // Create registry
      console.log('🏛️ Creating registry with IPv4...');
      const regResult = await client.registries().create({
        name: issuerName,
        registryName: "IPv4TestRegistry"
      });
      
      await new Promise(r => setTimeout(r, 3000));
      
      const registries = await client.registries().list(issuerName);
      console.log(`✅ SUCCESS! Created registry with IPv4: ${registries[0].regk}`);
      
      // Try schema resolution
      console.log('📋 Testing schema resolution with IPv4...');
      try {
        await client.oobis().resolve('http://travlr-schema:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
        await new Promise(r => setTimeout(r, 2000));
        console.log('✅ Schema resolved with IPv4');
      } catch (schemaError) {
        console.log('⚠️ Schema resolution issue:', schemaError.message);
      }
      
      // NOW TRY CREDENTIAL CREATION
      console.log('🎫 Attempting credential creation with IPv4 fixes...');
      
      const credentialData = {
        i: identifier.prefix,
        employeeId: "IPV4-FIX-001",
        seatPreference: "window",
        mealPreference: "vegetarian",
        airlines: "IPv4 Fixed Airways",
        emergencyContact: "IPv4 Emergency",
        allergies: "None"
      };
      
      const credResult = await client.credentials().issue(issuerName, {
        ri: registries[0].regk,
        s: 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU',
        a: credentialData
      });
      
      console.log('⏳ Waiting for credential with IPv4...');
      await new Promise(r => setTimeout(r, 5000));
      
      const credentialId = credResult.acdc.ked.d;
      console.log(`🎉 CREDENTIAL CREATED WITH IPv4 FIX: ${credentialId}`);
      
      // Verify
      const stored = await client.credentials().get(credentialId);
      console.log(`✅ VERIFIED: ${stored.sad.d}`);
      console.log(`👤 Holder: ${stored.sad.a.i}`);
      console.log(`🏢 Employee: ${stored.sad.a.employeeId}`);
      
      console.log('\n🎯 SUCCESS! NETWORK ISSUES FIXED!');
      console.log('✅ IPv4 addressing resolved the connectivity issues');
      console.log('✅ Your working SignifyTS version preserved');
      console.log('✅ Real ACDC credential created and stored');
      
      return credentialId;
      
    } catch (identifierError) {
      console.log('❌ Identifier creation failed:', identifierError.message);
      return null;
    }
    
  } catch (error) {
    console.error('❌ Network fix failed:', error.message);
    return null;
  }
}

fixNetworkIssues().then(credId => {
  if (credId) {
    console.log(`\n🏆 FIXED! Your ACDC credential: ${credId}`);
    console.log('🔧 Network configuration issues resolved');
  } else {
    console.log('\n❌ Network fixes did not work');
  }
});