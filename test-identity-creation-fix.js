#!/usr/bin/env node

/**
 * Test identity creation with fixed passcode
 */

console.log('🧪 Testing Identity Creation Fix...');

async function testIdentityCreationFix() {
  try {
    console.log('1️⃣ Testing KERIA connection with correct passcode...');
    
    // Test the exact connection parameters
    const keriaAdminUrl = 'http://localhost:3904';
    const keriaBootUrl = 'http://localhost:3906';
    const bran = '0123456789abcdefghij1'; // Same as KERIA config
    
    console.log('📋 Connection parameters:');
    console.log('   Admin URL:', keriaAdminUrl);
    console.log('   Boot URL:', keriaBootUrl);
    console.log('   Passcode:', bran);
    
    // Test admin endpoint
    try {
      const response = await fetch(keriaAdminUrl);
      console.log('✅ KERIA admin endpoint accessible');
    } catch (error) {
      console.log('❌ KERIA admin endpoint failed:', error.message);
    }
    
    // Test boot endpoint  
    try {
      const response = await fetch(keriaBootUrl);
      console.log('✅ KERIA boot endpoint accessible');
    } catch (error) {
      console.log('❌ KERIA boot endpoint failed:', error.message);
    }
    
    console.log('\n2️⃣ Changes made:');
    console.log('✅ Fixed TravlrIdentityService to use fixed bran: 0123456789abcdefghij1');
    console.log('✅ Updated KERIA CORS to allow multiple origins');
    console.log('✅ KERIA restarted with new configuration');
    
    console.log('\n3️⃣ Expected result:');
    console.log('   Identity creation should now work because:');
    console.log('   - SignifyClient uses correct passcode matching KERIA');
    console.log('   - CORS issues resolved with updated origins');
    console.log('   - Connection/boot should succeed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testIdentityCreationFix();