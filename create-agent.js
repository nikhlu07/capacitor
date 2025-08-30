#!/usr/bin/env node
/**
 * Create the agent that the credential server expects
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function createAgent() {
  console.log('Creating agent for credential server...');
  
  try {
    await ready();
    
    // Use the bran from the brans.json file
    const bran = 'BG4MS-QY9f__GsTghCQZA'; // issuerBran
    console.log('Using bran:', bran);
    
    // Create client
    const client = new SignifyClient('http://localhost:3905', bran, Tier.low, 'http://localhost:3906');
    
    console.log('Booting agent...');
    const bootResult = await client.boot();
    console.log('Boot result:', bootResult.status);
    
    if (bootResult.ok) {
      console.log('✅ Agent booted successfully!');
      
      // Connect to the agent
      console.log('Connecting to agent...');
      await client.connect();
      console.log('✅ Connected to agent!');
      
      // Create an identifier
      console.log('Creating identifier...');
      const createResult = await client.identifiers().create('issuer');
      console.log('Identifier created:', createResult);
      
      return true;
    } else {
      console.log('❌ Agent boot failed');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Agent creation failed:', error.message);
    return false;
  }
}

// Run the agent creation
createAgent().then(success => {
  if (success) {
    console.log('\n🎉 Agent created successfully!');
  } else {
    console.log('\n💥 Agent creation failed!');
  }
});
