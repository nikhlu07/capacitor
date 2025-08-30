#!/usr/bin/env node
/**
 * Connect to existing agent and create travlr-issuer identifier and registry
 */

const { SignifyClient, Tier, ready } = require('signify-ts');

async function connectAndCreateTravlrIssuer() {
    console.log('Connecting to existing agent and creating travlr-issuer...');
    console.log('='.repeat(50));
    
    try {
        await ready();
        
        // Connect directly to the existing agent
        console.log('1. Connecting to existing KERIA agent...');
        const client = new SignifyClient(
            'http://localhost:3905',
            'ENYgH7bD1SfJ6hXBOuO9yOUZgE9r_46ivekKuuqxBHeo',  // AID of existing agent
            Tier.low
        );
        
        try {
            await client.connect();
            console.log('   ✅ Connected to existing agent');
        } catch (connectError) {
            console.log('   ❌ Connection failed:', connectError.message);
            throw connectError;
        }
        
        // Create travlr-issuer
        console.log('2. Creating travlr-issuer identifier...');
        try {
            const issuer = await client.identifiers().create('travlr-issuer');
            console.log('   ✅ Created issuer:', issuer.prefix);
        } catch (error) {
            if (error.message.includes('409')) {
                console.log('   ℹ️  Issuer already exists');
            } else {
                throw error;
            }
        }
        
        // Create travlr-registry
        console.log('3. Creating travlr-registry...');
        try {
            const registry = await client.registries().create('travlr-issuer', {
                name: 'travlr-registry'
            });
            console.log('   ✅ Created registry:', registry.regk);
        } catch (error) {
            if (error.message.includes('409')) {
                console.log('   ℹ️  Registry already exists');
            } else {
                throw error;
            }
        }
        
        console.log('\n🎉 SUCCESS: travlr-issuer and registry ready!');
        return true;
        
    } catch (error) {
        console.log('❌ FAILED:', error.message);
        return false;
    }
}

// Run it
connectAndCreateTravlrIssuer().then(success => {
    if (success) {
        console.log('\n✅ Services should now work!');
    } else {
        console.log('\n💥 Setup failed');
    }
});

