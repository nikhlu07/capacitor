#!/usr/bin/env python3
"""
Create travlr-issuer identifier in KERIA for port 3008 service
"""

import httpx
import asyncio
import json

async def create_travlr_issuer():
    """Create travlr-issuer identifier in KERIA"""
    
    print("Creating travlr-issuer identifier in KERIA...")
    print("=" * 50)
    
    try:
        # Connect to KERIA admin API (port 3906)
        async with httpx.AsyncClient() as client:
            # First, check if KERIA is running
            print("1. Checking KERIA health...")
            health_response = await client.get("http://localhost:3906/health")
            if health_response.status_code == 200:
                print("   [OK] KERIA is running")
            else:
                print("   [FAILED] KERIA is not running")
                return False
            
            # Try to boot agent if needed
            print("2. Booting agent...")
            boot_payload = {
                "name": "travlr-issuer",
                "passcode": "ClC9VsVmPAwQpbUobq4jC",
                "salt": "0ACDEskKBFFBOM08"
            }
            
            boot_response = await client.post("http://localhost:3906/boot", json=boot_payload)
            if boot_response.status_code in [200, 201, 202]:
                print("   [OK] Agent booted")
                boot_data = boot_response.json()
            elif boot_response.status_code == 409:
                print("   [INFO] Agent already exists")
            else:
                print(f"   [FAILED] Boot failed: {boot_response.status_code}")
                print(f"   Response: {boot_response.text}")
                return False
            
            # Now create the travlr-issuer identifier
            print("3. Creating travlr-issuer identifier...")
            identifier_payload = {
                "name": "travlr-issuer",
                "transferable": True,
                "wits": [],
                "toad": 0,
                "count": 1,
                "ncount": 1
            }
            
            # Try to create via admin API
            create_response = await client.post(
                "http://localhost:3906/identifiers", 
                json=identifier_payload
            )
            
            if create_response.status_code in [200, 201, 202]:
                print("   [OK] travlr-issuer identifier created")
                identifier_data = create_response.json()
                print(f"   AID: {identifier_data.get('prefix')}")
                return True
            elif create_response.status_code == 409:
                print("   [INFO] travlr-issuer identifier already exists")
                return True
            else:
                print(f"   [FAILED] Failed to create identifier: {create_response.status_code}")
                print(f"   Response: {create_response.text}")
                return False
                
    except Exception as e:
        print(f"[FAILED] Failed to create travlr-issuer: {e}")
        return False

async def create_travlr_registry():
    """Create travlr-registry for the issuer"""
    
    print("Creating travlr-registry...")
    print("=" * 30)
    
    try:
        async with httpx.AsyncClient() as client:
            # Create registry for travlr-issuer
            print("1. Creating travlr-registry...")
            registry_payload = {
                "name": "travlr-registry"
            }
            
            registry_response = await client.post(
                "http://localhost:3906/identifiers/travlr-issuer/registries",
                json=registry_payload
            )
            
            if registry_response.status_code in [200, 201, 202]:
                print("   [OK] travlr-registry created")
                registry_data = registry_response.json()
                print(f"   Registry SAID: {registry_data.get('regk')}")
                return True
            elif registry_response.status_code == 409:
                print("   [INFO] travlr-registry already exists")
                return True
            else:
                print(f"   [FAILED] Failed to create registry: {registry_response.status_code}")
                print(f"   Response: {registry_response.text}")
                return False
                
    except Exception as e:
        print(f"[FAILED] Failed to create travlr-registry: {e}")
        return False

async def main():
    """Main function"""
    print("Travlr-Issuer Setup for Port 3008 Service")
    print("=" * 50)
    
    # Create travlr-issuer identifier
    issuer_success = await create_travlr_issuer()
    
    if issuer_success:
        # Create travlr-registry
        registry_success = await create_travlr_registry()
        
        if registry_success:
            print("\n[SUCCESS] travlr-issuer and travlr-registry created!")
            print("The service on port 3008 should now work.")
            
            # Test the credential issuance
            print("\n[TESTING] Credential issuance...")
            async with httpx.AsyncClient() as client:
                test_payload = {
                    "schemaSaid": "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU",
                    "aid": "test-aid",
                    "attribute": {
                        "employeeId": "SETUP-TEST-001",
                        "seatPreference": "window",
                        "mealPreference": "vegetarian",
                        "airlines": "SAS,Lufthansa",
                        "emergencyContact": "Emergency Contact +46701234567",
                        "allergies": "nuts,shellfish"
                    }
                }
                
                try:
                    test_response = await client.post(
                        "http://localhost:3008/issueAcdcCredential",
                        json=test_payload,
                        headers={"Content-Type": "application/json"}
                    )
                    
                    if test_response.status_code in [200, 201]:
                        print("   [OK] Credential issuance test successful!")
                        test_data = test_response.json()
                        print(f"   Result: {test_data}")
                    else:
                        print(f"   [INFO] Credential test response: {test_response.status_code}")
                        print(f"   Response: {test_response.text}")
                except Exception as test_error:
                    print(f"   [INFO] Credential test error: {test_error}")
        else:
            print("\n[FAILED] Failed to create travlr-registry")
    else:
        print("\n[FAILED] Failed to create travlr-issuer")

if __name__ == "__main__":
    asyncio.run(main())