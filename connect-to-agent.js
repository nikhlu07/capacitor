#!/usr/bin/env node
/**
 * Connect to existing agent
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function connectToAgent() {
  console.log('Connecting to existing agent...');
  
  try {
    await ready();
    
    // Use the bran from the brans.json file
    const bran = 'BG4MS-QY9f__GsTghCQZA'; // issuerBran
    console.log('Using bran:', bran);
    
    // Create client
    const client = new SignifyClient('http://localhost:3905', bran, Tier.low, 'http://localhost:3906');
    
    console.log('Connecting to agent...');
    await client.connect();
    console.log('✅ Connected to agent!');
    
    // Get identifiers
    console.log('Getting identifiers...');
    const identifiers = await client.identifiers().list();
    console.log('Found identifiers:', identifiers.length);
    
    for (const identifier of identifiers) {
      console.log(`  - ${identifier.name}: ${identifier.prefix}`);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return false;
  }
}

// Run the connection
connectToAgent().then(success => {
  if (success) {
    console.log('\n🎉 Connected successfully!');
  } else {
    console.log('\n💥 Connection failed!');
  }
});
