#!/usr/bin/env node
/**
 * Boot a new travlr-issuer agent
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function bootNewAgent() {
  console.log('Booting a new travlr-issuer agent...');
  
  try {
    await ready();
    
    // Use the correct bran
    const bran = 'ClC9VsVmPAwQpbUobq4jC'; // Main bran
    console.log('Using bran:', bran);
    
    // Create client for booting
    const client = new SignifyClient('http://localhost:3905', bran, Tier.low, 'http://localhost:3906');
    
    // Try to boot the agent
    console.log('Booting agent...');
    try {
      const bootResult = await client.boot();
      console.log('✅ Agent booted successfully!');
    } catch (bootError) {
      console.log('ℹ️  Agent already exists or boot error:', bootError.message);
    }
    
    // Wait a bit for the agent to be fully created
    console.log('Waiting for agent to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to connect
    console.log('Connecting to agent...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Show the AID
    console.log('AID for this agent:', client.agent.pre);
    
    // Create the travlr-issuer identifier
    console.log('Creating travlr-issuer identifier...');
    try {
      const issuer = await client.identifiers().create('travlr-issuer');
      console.log('✅ Created issuer:', issuer.prefix);
    } catch (error) {
      if (error.message.includes('409')) {
        console.log('ℹ️  Issuer already exists');
      } else {
        console.log('❌ Failed to create issuer:', error.message);
        throw error;
      }
    }
    
    // Create the travlr-registry
    console.log('Creating travlr-registry...');
    try {
      const registry = await client.registries().create('travlr-issuer', {
        name: 'travlr-registry'
      });
      console.log('✅ Created registry:', registry.regk);
    } catch (error) {
      if (error.message.includes('409')) {
        console.log('ℹ️  Registry already exists');
      } else {
        console.log('❌ Failed to create registry:', error.message);
        throw error;
      }
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Boot/Setup failed:', error.message);
    console.log('Error details:', error);
    return false;
  }
}

// Run the boot process
bootNewAgent().then(success => {
  if (success) {
    console.log('\n🎉 New agent setup successful!');
  } else {
    console.log('\n💥 New agent setup failed!');
  }
});

