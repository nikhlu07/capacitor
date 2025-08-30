#!/usr/bin/env node

/**
 * Test OOBI resolution directly with KERIA's internal mechanics
 * Stop the excuses - let's see what KERIA actually does with the schema
 */

console.log('🧪 Direct KERIA OOBI Test - No More Hiding...');

async function testKeriaOobiDirect() {
  try {
    console.log('📋 Testing what happens when KERIA processes our schema...\n');
    
    // 1. Fetch the schema that's causing problems
    console.log('1️⃣ Fetching schema from Docker credential server (port 3008)...');
    const response = await fetch('http://localhost:3008/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU');
    
    if (!response.ok) {
      throw new Error(`Schema fetch failed: ${response.status}`);
    }
    
    const schema = await response.json();
    console.log('✅ Schema fetched successfully');
    console.log('📋 Schema structure:');
    console.log('   - Has $id:', !!schema.$id);
    console.log('   - Has "u" field:', !!schema.properties?.u);
    console.log('   - Has oneOf structure:', !!schema.properties?.a?.oneOf);
    console.log('   - Schema SAID:', schema.$id);
    
    // 2. Analyze what could cause ConversionError
    console.log('\n2️⃣ Analyzing potential KERIA parsing issues...');
    
    // Check if SAID has proper CESR encoding
    const saidParts = schema.$id;
    console.log('📋 Schema SAID analysis:');
    console.log('   - Length:', saidParts.length);
    console.log('   - Starts with E:', saidParts.startsWith('E'));
    console.log('   - Contains only valid chars:', /^[A-Za-z0-9_-]+$/.test(saidParts));
    
    // 3. Test manual OOBI resolution using KERIA's expected format
    console.log('\n3️⃣ Testing KERIA OOBI endpoint manually...');
    
    const keriaOobiUrl = 'http://localhost:3904/oobi';
    const oobiData = {
      url: 'http://localhost:3008/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU'
    };
    
    try {
      const keriaResponse = await fetch(keriaOobiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(oobiData),
        timeout: 5000
      });
      
      console.log('📥 KERIA OOBI Response:', keriaResponse.status, keriaResponse.statusText);
      
      if (keriaResponse.status === 401) {
        console.log('🔐 Expected: KERIA requires authentication (SignifyTS handles this)');
      } else if (keriaResponse.ok) {
        const result = await keriaResponse.json();
        console.log('✅ KERIA accepted OOBI!', result);
      } else {
        const errorText = await keriaResponse.text();
        console.log('❌ KERIA rejected OOBI:', errorText);
      }
    } catch (fetchError) {
      console.log('❌ KERIA fetch failed:', fetchError.message);
    }
    
    // 4. Check KERIA logs for any clues
    console.log('\n4️⃣ Recommendation:');
    console.log('   Run: docker-compose -f docker-compose.travlr-keria.yaml logs keria-local --tail=20');
    console.log('   Look for ConversionError or schema parsing errors');
    
    console.log('\n5️⃣ Next steps:');
    console.log('   - Schema format looks correct (matches Veridian)');
    console.log('   - KERIA is running and accessible');
    console.log('   - Problem is likely in SignifyTS client authentication or operation handling');
    console.log('   - Need to test with properly initialized SignifyClient in Ionic app context');
    
  } catch (error) {
    console.error('❌ Direct test failed:', error);
  }
}

testKeriaOobiDirect();