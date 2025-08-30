#!/usr/bin/env node

/**
 * Actually test OOBI resolution with KERIA authentication
 * Stop hiding behind assumptions - let's see if it really works
 */

const { SignifyClient } = require('signify-ts');

console.log('🧪 REAL OOBI Resolution Test with KERIA Authentication...');

async function testRealOobiResolution() {
  let client;
  
  try {
    console.log('🔐 Connecting to KERIA with proper authentication...');
    
    // Use the same config as TravlrIdentityService
    client = new SignifyClient({
      url: 'http://localhost:3904',
      passcode: '0123456789abcdefghij1', // From docker-compose
      tier: 'low'
    });

    console.log('🚀 Booting KERIA client...');
    await client.boot();
    
    console.log('🔑 Connecting to agent...');
    await client.connect();
    
    console.log('✅ KERIA client connected successfully');
    
    // Now test OOBI resolution for real
    console.log('🔄 Testing OOBI resolution...');
    const oobi_url = 'http://localhost:3008/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU';
    
    console.log(`📤 Resolving OOBI: ${oobi_url}`);
    const operation = await client.oobis().resolve(oobi_url);
    
    console.log('📋 OOBI operation created:', operation);
    
    // Wait for operation to complete (like Veridian does)
    if (operation) {
      console.log('⏳ Waiting for OOBI operation to complete...');
      
      let done = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!done && attempts < maxAttempts) {
        try {
          const op = await client.operations().get(operation.name);
          console.log(`⏳ Attempt ${attempts + 1}: Operation status:`, op.done ? 'DONE' : 'PENDING');
          
          if (op.done) {
            console.log('✅ OOBI resolution completed!');
            console.log('📋 Operation result:', op);
            done = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        } catch (error) {
          console.log('❌ Error checking operation:', error.message);
          break;
        }
      }
      
      if (!done) {
        console.log('❌ OOBI resolution timed out after 30 seconds');
      }
    }
    
  } catch (error) {
    console.error('❌ REAL test failed:', error);
    console.error('Stack:', error.stack);
    
  } finally {
    if (client) {
      try {
        console.log('🔌 Disconnecting client...');
        // Don't call client.close() - it might not exist
      } catch (e) {
        console.log('Warning: Could not disconnect cleanly');
      }
    }
  }
}

testRealOobiResolution();