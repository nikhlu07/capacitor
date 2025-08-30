#!/usr/bin/env node
/**
 * Boot agent and create issuer identifier and registry in KERIA
 * Fixes "No registries found for travlr-issuer" error
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function bootAndCreateIssuer() {
    console.log('Booting agent and creating issuer in KERIA...');
    console.log('==================================================');
    
    try {
        await ready();
        
        // Boot the agent first
        console.log('1. Booting KERIA agent...');
        const client = new SignifyClient(
            'http://localhost:3905',  // KERIA agent URL
            'ClC9VsVmPAwQpbUobq4jC',   // Main bran
            Tier.low,
            'http://localhost:3906'    // KERIA boot URL
        );
        
        try {
            const bootResult = await client.boot();
            console.log('   ✅ Agent booted:', bootResult.status);
        } catch (bootError) {
            console.log('   ℹ️  Agent already booted or boot failed:', bootError.message);
        }
        
        // Show the AID before connecting
        console.log('   AID for this agent:', client.agent.pre);
        
        // Connect to the agent
        console.log('2. Connecting to agent...');
        await client.connect();
        console.log('   ✅ Connected to KERIA agent');
        
        // Create the issuer identifier that your credential server expects
        console.log('3. Creating issuer identifier: travlr-issuer');
        try {
            const issuerResult = await client.identifiers().create('travlr-issuer');
            console.log('   ✅ Created issuer identifier:');
            console.log('      Name:', issuerResult.name);
            console.log('      AID:', issuerResult.prefix);
        } catch (createError) {
            if (createError.message.includes('409') || createError.message.includes('already exists')) {
                console.log('   ℹ️  Issuer already exists, getting existing...');
                const existing = await client.identifiers().get('travlr-issuer');
                console.log('      Name:', existing.name);
                console.log('      AID:', existing.prefix);
            } else {
                throw createError;
            }
        }
        
        // Create registry for the issuer
        console.log('4. Creating registry: travlr-registry');
        try {
            const registryResult = await client.registries().create('travlr-issuer', {
                name: 'travlr-registry'
            });
            console.log('   ✅ Created registry:');
            console.log('      Name:', registryResult.name);
            console.log('      Registry SAID:', registryResult.regk);
        } catch (regError) {
            if (regError.message.includes('409') || regError.message.includes('already exists')) {
                console.log('   ℹ️  Registry already exists, listing existing...');
                const registries = await client.registries().list('travlr-issuer');
                if (registries.length > 0) {
                    console.log('      Found registry:', registries[0].name);
                    console.log('      Registry SAID:', registries[0].regk);
                }
            } else {
                throw regError;
            }
        }
        
        console.log('
🎉 SUCCESS: Issuer and registry ready!');
        console.log('Your credential server should now work.');
        
        return true;
        
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        return false;
    }
}

// Run the setup
bootAndCreateIssuer().then(success => {
    if (success) {
        console.log('
✅ READY: You can now use your credential server!');
    } else {
        console.log('
💥 Setup failed - check the errors above');
    }
});
