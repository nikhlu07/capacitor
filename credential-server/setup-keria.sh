#!/bin/bash

# Create KERIA agent using KLI
echo "🔧 Setting up KERIA agent for credential server..."

# Create agent with specific passcode
kli passcode set --passcode "ClC9VsVmZD8qJ9ypRpnO"

# Create issuer identifier 
kli incept --name issuer --alias issuer

# Create registry
kli registry incept --name issuer --registry-name TravlrCredentials

# Check status
echo "✅ KERIA setup complete!"
echo "Issuer AID:"
kli status --name issuer

echo "Registry:"
kli registry list --name issuer