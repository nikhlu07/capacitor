#!/usr/bin/env python3
"""
Create a credential directly using KERIA API
"""

import requests
import json
import time

def create_credential_directly():
    """Create a credential directly using KERIA API"""
    
    print("Creating credential directly via KERIA API...")
    
    # KERIA endpoints
    keria_base = "http://localhost:3905"
    
    # First, let's try to boot an agent
    print("1. Booting agent...")
    boot_data = {
        "name": "direct-issuer",
        "passcode": "direct-passcode-123"
    }
    
    try:
        response = requests.post(f"{keria_base}/boot", json=boot_data)
        print(f"   Boot response: {response.status_code}")
        if response.status_code in [200, 201]:
            print("   Agent booted successfully")
        elif response.status_code == 409:
            print("   Agent already exists")
        else:
            print(f"   Boot failed: {response.text}")
    except Exception as e:
        print(f"   Boot error: {e}")
    
    # Try to connect to the agent
    print("2. Connecting to agent...")
    try:
        # This would normally require authentication headers
        # But let's first see what endpoints are available
        response = requests.get(f"{keria_base}/")
        print(f"   KERIA root response: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    except Exception as e:
        print(f"   Connection error: {e}")
    
    # Try to get identifiers
    print("3. Getting identifiers...")
    try:
        response = requests.get(f"{keria_base}/identifiers")
        print(f"   Identifiers response: {response.status_code}")
        if response.status_code == 200:
            identifiers = response.json()
            print(f"   Found {len(identifiers)} identifiers")
            for identifier in identifiers:
                print(f"     - {identifier.get('name', 'Unknown')}: {identifier.get('prefix', 'Unknown')}")
        else:
            print(f"   Failed to get identifiers: {response.text}")
    except Exception as e:
        print(f"   Identifiers error: {e}")
    
    print("\nDirect KERIA API approach completed.")

if __name__ == "__main__":
    create_credential_directly()