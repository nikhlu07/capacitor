#!/usr/bin/env node
/**
 * Test credential issuance using the exact Veridian approach
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function testVeridianCredentialIssuance() {
  console.log('Testing Veridian credential issuance approach...');
  
  try {
    await ready();
    
    // Use the exact same bran that Veridian uses
    const bran = 'ClC9VsVmPAwQpbUobq4jC';
    console.log('Using bran:', bran);
    
    // Connect to KERIA (same ports as Veridian)
    const client = new SignifyClient('http://localhost:3905', bran, Tier.low, 'http://localhost:3906');
    
    console.log('Connecting to KERIA...');
    await client.connect();
    console.log('✅ Connected to KERIA!');
    
    // Get identifiers (Veridian creates these automatically)
    console.log('Getting identifiers...');
    const identifiers = await client.identifiers().list();
    console.log('Found identifiers:', identifiers.length);
    
    if (identifiers.length === 0) {
      console.log('❌ No identifiers found - need to create them first');
      return false;
    }
    
    const identifier = identifiers[0];
    console.log('Using identifier:', identifier.name, identifier.prefix);
    
    // Get registries
    console.log('Getting registries...');
    const registries = await client.registries().list(identifier.name);
    console.log('Found registries:', registries.length);
    
    let registry;
    if (registries.length === 0) {
      console.log('❌ No registries found - need to create them first');
      return false;
    } else {
      registry = registries[0].regk;
      console.log('Using registry:', registry);
    }
    
    // Issue credential using the exact schema SAID from Veridian
    console.log('Issuing credential with Veridian schema...');
    const credentialData = {
      ri: registry,
      s: "EN7JR2OF5JS_OBalN09UPeQPBZ_tP669iuMjuDxY4ulz", // Exact SAID from Veridian
      a: {
        employeeId: "VERIDIAN-TEST-001",
        seatPreference: "window",
        mealPreference: "vegetarian",
        airlines: "SAS,Lufthansa",
        emergencyContact: "Emergency Contact +46701234567",
        allergies: "nuts,shellfish"
      }
    };
    
    console.log('Credential data:', JSON.stringify(credentialData, null, 2));
    
    const result = await client.credentials().issue(identifier.name, credentialData);
    console.log('✅ Credential issued successfully!');
    console.log('Credential SAID:', result.acdc?.ked?.d);
    
    return result.acdc?.ked?.d;
    
  } catch (error) {
    console.log('❌ Credential issuance failed:', error.message);
    return null;
  }
}

// Run the test
testVeridianCredentialIssuance().then(credentialSaid => {
  if (credentialSaid) {
    console.log('\n🎉 VERIDIAN CREDENTIAL ISSUANCE SUCCESSFUL!');
    console.log('Credential SAID:', credentialSaid);
  } else {
    console.log('\n💥 VERIDIAN CREDENTIAL ISSUANCE FAILED!');
  }
});