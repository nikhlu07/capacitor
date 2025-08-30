#!/usr/bin/env node
/**
 * Create travlr-issuer identifier and registry
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function createTravlrIssuer() {
    console.log('Creating travlr-issuer identifier and registry...');
    console.log('=======================================================');
    
    try {
        await ready();
        
        // Connect to KERIA with boot endpoint
        const client = new SignifyClient(
            'http://localhost:3904',  // KERIA Admin API
            'ClC9VsVmPAwQpbUobq4jC',   // Main bran
            Tier.low,
            'http://localhost:3906'    // Boot endpoint
        );
        
        console.log('1. Connecting to KERIA...');
        await client.connect();
        console.log('   ✅ Connected');
        
        // Create travlr-issuer identifier
        console.log('2. Creating travlr-issuer identifier...');
        try {
            const issuer = await client.identifiers().create('travlr-issuer');
            console.log('   ✅ Created issuer:');
            console.log('      AID:', issuer.prefix);
        } catch (error) {
            if (error.message.includes('409')) {
                console.log('   ℹ️  Issuer already exists, getting existing...');
                const existing = await client.identifiers().get('travlr-issuer');
                console.log('      AID:', existing.prefix);
            } else {
                console.log('   ℹ️  Trying to get existing issuer due to error:', error.message);
                try {
                    const existing = await client.identifiers().get('travlr-issuer');
                    console.log('      AID:', existing.prefix);
                } catch (getError) {
                    console.log('   ❌  Failed to get existing issuer:', getError.message);
                    throw error;
                }
            }
        }
        
        // Create travlr-registry
        console.log('3. Creating travlr-registry...');
        try {
            const registry = await client.registries().create('travlr-issuer', {
                name: 'travlr-registry'
            });
            console.log('   ✅ Created registry:');
            console.log('      SAID:', registry.regk);
        } catch (error) {
            if (error.message.includes('409')) {
                console.log('   ℹ️  Registry already exists, listing...');
                const registries = await client.registries().list('travlr-issuer');
                if (registries.length > 0) {
                    console.log('      SAID:', registries[0].regk);
                }
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 SUCCESS: travlr-issuer and travlr-registry created!');
        console.log('Both services on ports 3007 and 3008 should now work.');
        
        return true;
        
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        return false;
    }
}

// Run it
createTravlrIssuer().then(success => {
    if (success) {
        console.log('\n✅ You can now test your credential services!');
    } else {
        console.log('\n💥 Something went wrong');
    }
});

