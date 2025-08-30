#!/usr/bin/env node
/**
 * Test connecting to KERIA with the correct bran
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function testConnection() {
  console.log('Testing KERIA connection with correct bran...');
  
  try {
    await ready();
    
    // Use the bran from the brans.json file
    const bran = 'BG4MS-QY9f__GsTghCQZA'; // issuerBran
    console.log('Using bran:', bran);
    
    // Connect to KERIA
    const client = new SignifyClient('http://localhost:3905', bran, Tier.low, 'http://localhost:3906');
    
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Try to get identifiers
    console.log('Getting identifiers...');
    const identifiers = await client.identifiers().list();
    console.log('Found identifiers:', identifiers.length);
    
    for (const identifier of identifiers) {
      console.log(`  - ${identifier.name}: ${identifier.prefix}`);
    }
    
    // Try to get registries
    if (identifiers.length > 0) {
      console.log('Getting registries...');
      const registries = await client.registries().list(identifiers[0].name);
      console.log('Found registries:', registries.length);
      
      for (const registry of registries) {
        console.log(`  - ${registry.name}: ${registry.regk}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('Error details:', error);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Connection test successful!');
  } else {
    console.log('\n💥 Connection test failed!');
  }
});
