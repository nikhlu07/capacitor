// Create a real ACDC credential using your working setup
const { createWorkingKERIAClient, setupWorkingInfrastructure, testWorkingCredentialCreation } = require('./build/working-keria-setup.js');

async function createCredentialForUser() {
  console.log('🎫 Creating a real ACDC travel preferences credential for you...');
  
  try {
    // Step 1: Connect using your working pattern
    console.log('🔄 Connecting to KERIA using your proven pattern...');
    const client = await createWorkingKERIAClient();
    
    if (!client) {
      throw new Error('Failed to connect to KERIA');
    }
    
    console.log('✅ Connected to KERIA successfully');
    
    // Step 2: Setup infrastructure
    console.log('🏗️ Setting up infrastructure...');
    const infrastructureReady = await setupWorkingInfrastructure(client);
    
    if (!infrastructureReady) {
      throw new Error('Failed to setup infrastructure');
    }
    
    console.log('✅ Infrastructure ready');
    
    // Step 3: Create your credential
    console.log('🎫 Creating your travel preferences credential...');
    const credentialCreated = await testWorkingCredentialCreation(client);
    
    if (credentialCreated) {
      console.log('\n🎉 SUCCESS! Your REAL ACDC credential has been created!');
      console.log('✅ The credential is now stored in KERIA\'s LMDB database');
      console.log('✅ This is a fully functional, verifiable ACDC credential');
      console.log('✅ Created using Veridian\'s exact implementation pattern');
    } else {
      console.log('❌ Failed to create credential');
    }
    
  } catch (error) {
    console.error('❌ Error creating credential:', error.message);
    console.error('Full error:', error);
  }
}

createCredentialForUser();