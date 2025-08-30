#!/usr/bin/env node
/**
 * Create issuer identifier and registry in KERIA
 * Fixes "No registries found for travlr-issuer" error
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function createIssuerAndRegistry() {
    console.log('Creating issuer identifier and registry in KERIA...');
    console.log('=======================================================');
    
    try {
        await ready();
        
        // Connect to KERIA (same as your credential server)
        const client = new SignifyClient(
            'http://localhost:3905',  // KERIA agent URL
            'ClC9VsVmPAwQpbUobq4jC',   // Main bran from your config
            Tier.low,
            'http://localhost:3906'    // KERIA boot URL
        );
        
        console.log('1. Connecting to KERIA...');
        await client.connect();
        console.log('   ✅ Connected to KERIA');
        
        // Create the issuer identifier that your credential server expects
        console.log('2. Creating issuer identifier: travlr-issuer');
        const issuerResult = await client.identifiers().create('travlr-issuer');
        console.log('   ✅ Created issuer identifier:');
        console.log('      Name:', issuerResult.name);
        console.log('      AID:', issuerResult.prefix);
        
        // Create registry for the issuer
        console.log('3. Creating registry: travlr-registry');
        const registryResult = await client.registries().create('travlr-issuer', {
            name: 'travlr-registry'
        });
        console.log('   ✅ Created registry:');
        console.log('      Name:', registryResult.name);
        console.log('      Registry SAID:', registryResult.regk);
        
        console.log('\n🎉 SUCCESS: Issuer and registry created!');
        console.log('Your credential server should now work.');
        
        return {
            issuer: issuerResult,
            registry: registryResult
        };
        
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        
        // Check if already exists
        if (error.message.includes('409') || error.message.includes('conflict')) {
            console.log('   ℹ️  Issuer or registry might already exist');
            console.log('   Try restarting your credential server');
        }
        
        return null;
    }
}

// Run the creation
createIssuerAndRegistry().then(result => {
    if (result) {
        console.log('\n✅ READY: You can now use your credential server!');
    } else {
        console.log('\n💥 Something went wrong - check the errors above');
    }
});
