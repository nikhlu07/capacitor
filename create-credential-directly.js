#!/usr/bin/env node
/**
 * Create credential directly using SignifyTS
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function createCredentialDirectly() {
  console.log('Creating credential directly using SignifyTS...');
  
  try {
    await ready();
    
    // Use the issuer bran from the brans.json file
    const bran = 'BG4MS-QY9f__GsTghCQZA';
    console.log('Using issuer bran:', bran);
    
    // Create client
    const client = new SignifyClient('http://localhost:3905', bran, Tier.low, 'http://localhost:3906');
    
    // Try to connect (this might fail, but let's see)
    console.log('Attempting to connect...');
    try {
      await client.connect();
      console.log('✅ Connected successfully!');
    } catch (connectError) {
      console.log('⚠️ Connection failed, but continuing...');
      console.log('Connection error:', connectError.message);
    }
    
    // Try to get existing identifiers
    console.log('Getting identifiers...');
    try {
      const identifiers = await client.identifiers().list();
      console.log('Found identifiers:', identifiers.length);
      
      for (const identifier of identifiers) {
        console.log(`  - ${identifier.name}: ${identifier.prefix}`);
      }
      
      // If we have identifiers, try to get registries
      if (identifiers.length > 0) {
        console.log('Getting registries...');
        const registries = await client.registries().list(identifiers[0].name);
        console.log('Found registries:', registries.length);
        
        for (const registry of registries) {
          console.log(`  - ${registry.name}: ${registry.regk}`);
        }
        
        // Try to issue a credential
        console.log('Attempting to issue credential...');
        try {
          const credentialData = {
            ri: registries[0].regk, // Use first registry
            s: "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU", // Travel preferences schema
            a: {
              employeeId: "EMP-DIRECT-001",
              seatPreference: "window",
              mealPreference: "vegetarian",
              airlines: "SAS,Lufthansa",
              emergencyContact: "Emergency Contact +46701234567",
              allergies: "nuts,shellfish"
            }
          };
          
          console.log('Credential data:', JSON.stringify(credentialData, null, 2));
          
          const result = await client.credentials().issue(identifiers[0].name, credentialData);
          console.log('✅ Credential issued successfully!');
          console.log('Credential SAID:', result.acdc?.ked?.d);
          
          return result.acdc?.ked?.d;
        } catch (issueError) {
          console.log('❌ Credential issuance failed:', issueError.message);
          console.log('Issue error details:', issueError);
        }
      } else {
        console.log('No identifiers found');
      }
    } catch (identifiersError) {
      console.log('❌ Identifiers operation failed:', identifiersError.message);
    }
    
    return null;
    
  } catch (error) {
    console.log('❌ Operation failed:', error.message);
    console.log('Error details:', error);
    return null;
  }
}

// Run the credential creation
createCredentialDirectly().then(credentialSaid => {
  if (credentialSaid) {
    console.log('\n🎉 Credential successfully created with SAID:', credentialSaid);
  } else {
    console.log('\n💥 Credential creation failed!');
  }
});