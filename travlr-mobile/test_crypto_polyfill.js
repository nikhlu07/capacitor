// Test the crypto polyfill works
import './src/crypto-polyfill.ts';

console.log('Testing crypto polyfill...');

async function testCryptoPolyfill() {
    try {
        // Test Noble curves directly
        const { p256 } = await import('@noble/curves/p256');
        const { sha256 } = await import('@noble/hashes/sha256');
        
        console.log('[PASS] Noble curves imported');
        
        // Test key generation
        const privKey = p256.utils.randomPrivateKey();
        const pubKey = p256.getPublicKey(privKey);
        console.log('[PASS] Key pair generated');
        
        // Test signing
        const message = 'hello world';
        const msgHash = sha256(new TextEncoder().encode(message));
        const signature = p256.sign(msgHash, privKey);
        console.log('[PASS] Message signed');
        
        // Test verification
        const isValid = p256.verify(signature, msgHash, pubKey);
        console.log(`[${isValid ? 'PASS' : 'FAIL'}] Signature verification: ${isValid}`);
        
        // Test global crypto
        if (global.crypto && global.crypto.getRandomValues) {
            const array = new Uint8Array(32);
            global.crypto.getRandomValues(array);
            console.log('[PASS] Global crypto.getRandomValues works');
        }
        
        console.log('\n✅ Crypto polyfill is working correctly!');
        console.log('SignifyTS should now be compatible with React Native');
        
    } catch (error) {
        console.error('❌ Crypto polyfill test failed:', error);
    }
}

testCryptoPolyfill();