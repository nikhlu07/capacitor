#!/usr/bin/env node
/**
 * Issue a credential using the Travlr-ID Credential Server
 */

const axios = require('axios');

async function issueCredential() {
  console.log('Issuing credential via Travlr-ID Credential Server...');
  
  const credentialData = {
    schemaSaid: "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU",
    aid: "EKikEJb07xdyCkLZ8lcLmWwxCdRYLIaW9rKL9Rcxv0SA",
    attribute: {
      employeeId: "EMP-TRAVLR-001",
      seatPreference: "window",
      mealPreference: "vegetarian",
      airlines: "SAS,Lufthansa",
      emergencyContact: "Emergency Contact +46701234567",
      allergies: "nuts,shellfish"
    }
  };
  
  try {
    console.log('Sending credential request...');
    console.log('Request data:', JSON.stringify(credentialData, null, 2));
    
    const response = await axios.post('http://localhost:3001/credentials/issue', credentialData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n✅ SUCCESS: Credential issued!');
      console.log('Credential ID:', response.data.data.credentialId);
      return response.data.data.credentialId;
    } else {
      console.log('\n❌ FAILED: Credential issuance failed');
      console.log('Error:', response.data.error);
      return null;
    }
  } catch (error) {
    console.log('\n❌ ERROR: Failed to issue credential');
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error message:', error.message);
    }
    return null;
  }
}

// Run the function
issueCredential().then(credentialId => {
  if (credentialId) {
    console.log('\n🎉 Credential successfully issued with ID:', credentialId);
  } else {
    console.log('\n💥 Failed to issue credential');
  }
});
