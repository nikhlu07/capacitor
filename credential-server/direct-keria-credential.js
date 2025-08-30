// Create credential by calling KERIA API directly
const axios = require('axios');

async function createCredentialDirectly() {
  console.log('🎫 Creating your credential via direct KERIA API call...');
  
  // Your infrastructure that we successfully created
  const issuerAID = 'EAZJchzSValo_cv1mqj_6EDzY4Odp3hVYtLxFgq9jA1L';
  const registryKey = 'EPg81k12Un0butVeO709_LbfuQCEtuQdAnFCn8n877Mk';
  const schemaID = 'Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU';
  const issuerName = 'your-travlr-credential-issuer';
  
  const yourTravelPreferences = {
    i: issuerAID,
    employeeId: "YOUR-EMP-001",
    seatPreference: "window",
    mealPreference: "vegetarian", 
    airlines: "Delta Airlines / Your Preferred Carrier",
    emergencyContact: "Emergency: +1-555-000-0000",
    allergies: "No known allergies"
  };

  console.log('📝 Creating credential for:');
  console.log(`   🆔 AID: ${issuerAID}`);
  console.log(`   🏢 Employee: ${yourTravelPreferences.employeeId}`);
  console.log(`   🪑 Seat: ${yourTravelPreferences.seatPreference}`);
  console.log(`   🍽️ Meal: ${yourTravelPreferences.mealPreference}`);

  try {
    // Direct KERIA API call for credential issuance
    const credentialPayload = {
      ri: registryKey,
      s: schemaID,
      a: yourTravelPreferences
    };
    
    console.log('🔗 Calling KERIA API directly...');
    console.log(`POST http://localhost:3904/identifiers/${issuerName}/credentials`);
    console.log('Payload:', JSON.stringify(credentialPayload, null, 2));
    
    const response = await axios.post(
      `http://localhost:3904/identifiers/${issuerName}/credentials`,
      credentialPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('✅ KERIA API Response:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.d) {
      const credentialId = response.data.d;
      console.log(`\n🎉 YOUR REAL ACDC CREDENTIAL CREATED!`);
      console.log(`🆔 Credential ID: ${credentialId}`);
      
      // Try to verify it exists
      try {
        const verifyResponse = await axios.get(
          `http://localhost:3904/credentials/${credentialId}`,
          { timeout: 5000 }
        );
        
        console.log('✅ VERIFIED: Credential exists in KERIA!');
        console.log('Credential data:', JSON.stringify(verifyResponse.data, null, 2));
        
        console.log(`\n🎯 SUCCESS! Your travel preferences credential is ready!`);
        return credentialId;
      } catch (verifyError) {
        console.log('⚠️ Credential created but verification failed:', verifyError.message);
        return credentialId;
      }
    } else {
      console.log('❌ Unexpected response format');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Direct API call failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
      console.log('Headers:', error.response.headers);
    } else {
      console.log('Error:', error.message);
    }
    return null;
  }
}

createCredentialDirectly().then(credId => {
  if (credId) {
    console.log(`\n🎯 Final Result: Your credential ID is ${credId}`);
    console.log(`✅ Stored in KERIA's LMDB database`);
    console.log(`🔗 Ready for use in your Travlr-ID system`);
  } else {
    console.log(`\n❌ Could not create credential via direct API`);
  }
});