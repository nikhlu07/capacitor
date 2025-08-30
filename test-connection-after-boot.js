#!/usr/bin/env node
/**
 * Test connecting to KERIA after booting agent
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function testConnectionAfterBoot() {
  console.log('Testing KERIA connection after booting agent...');
  
  try {
    await ready();
    
    // Use the bran from the brans.json file
    const bran = 'BG4MS-QY9f__GsTghCQZA'; // issuerBran
    console.log('Using bran:', bran);
    
    // Wait a moment for the agent to be fully ready
    console.log('Waiting for agent to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
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
    
    return true;
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('Error details:', error);
    return false;
  }
}

// Run the test
testConnectionAfterBoot().then(success => {
  if (success) {
    console.log('\n🎉 Connection test successful!');
  } else {
    console.log('\n💥 Connection test failed!');
  }
});
