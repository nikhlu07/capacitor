// Test using EXACTLY your Ionic app's working pattern
const { SignifyClient, ready, Tier, randomPasscode } = require('signify-ts');

async function testYourExactPattern() {
  console.log('🧪 Testing YOUR EXACT Ionic app pattern...');
  
  try {
    // Step 1: Wait for SignifyTS (your pattern)
    await ready();
    console.log('✅ SignifyTS ready');

    // Step 2: Generate fresh passcode (your pattern)  
    const bran = randomPasscode();
    console.log('🔑 Generated fresh passcode');

    // Step 3: Create client with YOUR ports (your pattern)
    const client = new SignifyClient(
      'http://localhost:3904',  // Your Admin API
      bran,                     // Fresh passcode
      Tier.low,
      'http://localhost:3906'   // Your Boot API
    );

    console.log('🌐 Connecting to YOUR KERIA...');

    // Step 4: Boot then connect (your pattern)
    try {
      await client.boot();
      console.log('✅ Booted new agent');
    } catch (bootError) {
      if (bootError.message?.includes('409')) {
        console.log('🔄 Agent already exists');
      } else {
        throw bootError;
      }
    }

    await client.connect();
    console.log('✅ Connected');

    // Step 5: Check auth (your pattern)
    if (!client.authn) {
      throw new Error('Authentication not established');
    }
    console.log('✅ Authentication confirmed');

    // Step 6: Try creating identifier (your exact pattern)
    const aidName = 'test-issuer';
    console.log('🆕 Creating identifier with YOUR exact pattern...');
    
    const result = await client.identifiers().create(aidName, {
      algo: 'randy',
      count: 1,
      ncount: 1,
      transferable: true
    });

    console.log('✅ SUCCESS! Identifier created:', result);
    
    // Wait for operation
    const op = await result.op();
    let operation = await client.operations().get(op.name);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 250));
      operation = await client.operations().get(op.name);
    }

    const identifier = await client.identifiers().get(aidName);
    console.log('🎉 REAL AID CREATED:', identifier.prefix);
    console.log('✅ YOUR PATTERN WORKS PERFECTLY!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('🤔 This is strange - your Ionic app works but this fails');
  }
}

testYourExactPattern();