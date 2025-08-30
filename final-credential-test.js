#!/usr/bin/env node
/**
 * Final test to create a credential with the loaded schema
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function createCredentialWithLoadedSchema() {
  console.log('Creating credential with loaded schema...');
  
  try {
    await ready();
    
    // Try to connect with the existing agent
    const bran = 'ClC9VsVmPAwQpbUobq4jC'; // Main bran
    console.log('Using main bran:', bran);
    
    const client = new SignifyClient('http://localhost:3905', bran, Tier.low, 'http://localhost:3906');
    
    try {
      console.log('Connecting to agent...');
      await client.connect();
      console.log('✅ Connected to agent!');
      
      // Get identifiers
      console.log('Getting identifiers...');
      const identifiers = await client.identifiers().list();
      console.log('Found identifiers:', identifiers.length);
      
      if (identifiers.length === 0) {
        console.log('Creating identifier...');
        const createResult = await client.identifiers().create('test-issuer');
        console.log('Identifier created:', createResult.name, createResult.prefix);
      } else {
        console.log('Using existing identifier:', identifiers[0].name, identifiers[0].prefix);
      }
      
      // Get registries
      console.log('Getting registries...');
      const registries = await client.registries().list(identifiers[0].name);
      console.log('Found registries:', registries.length);
      
      let registry;
      if (registries.length === 0) {
        console.log('Creating registry...');
        const regResult = await client.registries().create(identifiers[0].name, {});
        console.log('Registry created:', regResult.regk);
        registry = regResult.regk;
      } else {
        console.log('Using existing registry:', registries[0].regk);
        registry = registries[0].regk;
      }
      
      // Try to issue credential with the loaded schema
      console.log('Issuing credential...');
      const credentialData = {
        ri: registry,
        s: "EJzStqmTMeOEneAmpx2s72sKMtBCgF0bFAc2tz_nmUbj", // Travel preferences schema SAID
        a: {
          employeeId: "EMP-TEST-001",
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
      
    } catch (connectError) {
      console.log('❌ Connection failed:', connectError.message);
      return null;
    }
    
  } catch (error) {
    console.log('❌ Operation failed:', error.message);
    return null;
  }
}

// Run the credential creation
createCredentialWithLoadedSchema().then(credentialSaid => {
  if (credentialSaid) {
    console.log('\n🎉 Credential successfully created with SAID:', credentialSaid);
  } else {
    console.log('\n💥 Credential creation failed!');
  }
});