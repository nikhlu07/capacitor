// Paste this into your browser console at http://localhost:3009
// This will create a real ACDC credential using your services

async function createACDCCredentialNow() {
    console.log('🎫 Creating ACDC credential using your services...');
    
    try {
        // Check if services are available
        if (typeof TravlrIdentityService === 'undefined') {
            console.error('❌ TravlrIdentityService not found. Make sure you\'re on the right page.');
            return;
        }
        
        if (typeof TravlrACDCService === 'undefined') {
            console.error('❌ TravlrACDCService not found. Make sure you\'re on the right page.');
            return;
        }

        console.log('✅ Services found');

        // Initialize identity service
        await TravlrIdentityService.initialize();
        console.log('✅ TravlrIdentityService initialized');

        // Get or create identity
        let identity = await TravlrIdentityService.getCurrentIdentityAsync();
        if (!identity) {
            console.log('🔄 No identity found, creating test identity...');
            identity = await TravlrIdentityService.createEmployeeIdentity('CONSOLE-TEST-001', 'Console Test User');
            console.log('✅ Test identity created:', identity.aid);
        } else {
            console.log('✅ Using existing identity:', identity.aid);
        }

        // Test travel preferences
        const preferences = {
            employeeId: identity.employeeId || 'CONSOLE-TEST-001',
            seatPreference: 'window',
            mealPreference: 'vegetarian', 
            airlines: 'Console Test Airways',
            emergencyContact: 'Console Emergency Contact',
            allergies: 'None'
        };

        console.log('🎫 Creating ACDC credential with preferences:', preferences);

        // Create the credential
        const result = await TravlrACDCService.createTravelPreferencesCredential(
            identity.aid, // issuer AID
            identity.aid, // holder AID (same for self-issued)
            preferences
        );

        if (result.success) {
            console.log('🎉 SUCCESS! ACDC CREDENTIAL CREATED!');
            console.log('🆔 Credential ID:', result.data.credentialId);
            console.log('📋 Schema SAID:', result.data.schemaSaid); 
            console.log('👤 Recipient:', result.data.recipient);
            console.log('✅ Real ACDC credential stored in KERIA LMDB database!');
            
            // Show success in page
            document.body.style.backgroundColor = '#d4edda';
            const msg = document.createElement('div');
            msg.innerHTML = `
                <h2 style="color: green;">🎉 ACDC CREDENTIAL CREATED!</h2>
                <p><strong>Credential ID:</strong> ${result.data.credentialId}</p>
                <p><strong>Schema:</strong> ${result.data.schemaSaid}</p>
                <p><strong>Stored in KERIA LMDB!</strong></p>
            `;
            msg.style.position = 'fixed';
            msg.style.top = '20px';
            msg.style.right = '20px';
            msg.style.background = 'white';
            msg.style.padding = '20px';
            msg.style.border = '2px solid green';
            msg.style.borderRadius = '10px';
            msg.style.zIndex = '9999';
            document.body.appendChild(msg);
            
            return result;
        } else {
            throw new Error('Credential creation failed: ' + JSON.stringify(result.data));
        }

    } catch (error) {
        console.error('❌ ACDC creation failed:', error);
        console.error('Error details:', error.stack);
        
        // Show error in page  
        document.body.style.backgroundColor = '#f8d7da';
        const errorMsg = document.createElement('div');
        errorMsg.innerHTML = `
            <h2 style="color: red;">❌ ACDC Creation Failed</h2>
            <p><strong>Error:</strong> ${error.message}</p>
        `;
        errorMsg.style.position = 'fixed';
        errorMsg.style.top = '20px';
        errorMsg.style.right = '20px';
        errorMsg.style.background = 'white';
        errorMsg.style.padding = '20px';
        errorMsg.style.border = '2px solid red';
        errorMsg.style.borderRadius = '10px';
        errorMsg.style.zIndex = '9999';
        document.body.appendChild(errorMsg);
        
        throw error;
    }
}

// Execute immediately
createACDCCredentialNow();