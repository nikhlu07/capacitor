#!/usr/bin/env node

/**
 * Test KERIA OOBI resolution directly
 */

console.log('🧪 Testing KERIA OOBI Resolution...');

async function testKeriaOobi() {
  try {
    // First, let's try to resolve OOBI through KERIA's API
    console.log('🔄 Testing OOBI resolution via KERIA API...');
    
    const oobi_url = 'http://localhost:3005/oobi/Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU';
    
    // Test with KERIA's OOBI endpoint
    const keriaOobiEndpoint = 'http://localhost:3904/oobi';
    
    console.log(`📤 Sending OOBI resolution request to KERIA...`);
    console.log(`   KERIA: ${keriaOobiEndpoint}`);
    console.log(`   Schema: ${oobi_url}`);
    
    const response = await fetch(keriaOobiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: oobi_url
      })
    });
    
    console.log(`📥 KERIA Response: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ OOBI resolution successful!');
      console.log('📋 Result:', result);
    } else {
      const error = await response.text();
      console.log('❌ OOBI resolution failed');
      console.log('📋 Error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testKeriaOobi();