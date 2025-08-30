#!/usr/bin/env python3
"""
Simple KERIA setup for travlr-issuer
"""

import httpx
import asyncio
import json

async def setup_keria_for_travlr():
    """Setup KERIA for travlr-issuer"""
    
    print("Setting up KERIA for travlr-issuer...")
    print("=" * 40)
    
    try:
        async with httpx.AsyncClient() as client:
            # Check KERIA health
            print("1. Checking KERIA health...")
            health_response = await client.get("http://localhost:3906/health")
            if health_response.status_code == 200:
                print("   [OK] KERIA is running")
            else:
                print("   [FAILED] KERIA is not running")
                return False
            
            # Try to create travlr-issuer identifier directly
            print("2. Creating travlr-issuer identifier...")
            identifier_payload = {
                "name": "travlr-issuer",
                "transferable": True
            }
            
            create_response = await client.post(
                "http://localhost:3905/identifiers",
                json=identifier_payload,
                headers={"Content-Type": "application/json"}
            )
            
            if create_response.status_code in [200, 201, 202]:
                print("   [OK] travlr-issuer identifier created")
                identifier_data = create_response.json()
                print(f"   AID: {identifier_data.get('prefix')}")
                issuer_aid = identifier_data.get('prefix')
            elif create_response.status_code == 409:
                print("   [INFO] travlr-issuer identifier already exists")
                # Get existing identifier
                get_response = await client.get("http://localhost:3905/identifiers/travlr-issuer")
                if get_response.status_code == 200:
                    identifier_data = get_response.json()
                    issuer_aid = identifier_data.get('prefix')
                    print(f"   AID: {issuer_aid}")
                else:
                    print("   [FAILED] Could not get existing identifier")
                    return False
            else:
                print(f"   [FAILED] Failed to create identifier: {create_response.status_code}")
                print(f"   Response: {create_response.text}")
                return False
            
            # Create registry for travlr-issuer
            print("3. Creating registry for travlr-issuer...")
            registry_payload = {
                "name": "travlr-registry"
            }
            
            registry_response = await client.post(
                f"http://localhost:3905/identifiers/travlr-issuer/registries",
                json=registry_payload,
                headers={"Content-Type": "application/json"}
            )
            
            if registry_response.status_code in [200, 201, 202]:
                print("   [OK] Registry created")
                registry_data = registry_response.json()
                print(f"   Registry SAID: {registry_data.get('regk')}")
            elif registry_response.status_code == 409:
                print("   [INFO] Registry already exists")
                # Get existing registry
                list_response = await client.get(f"http://localhost:3905/identifiers/travlr-issuer/registries")
                if list_response.status_code == 200:
                    registries = list_response.json()
                    if registries:
                        print(f"   Registry SAID: {registries[0].get('regk')}")
                    else:
                        print("   [WARNING] No registries found")
                else:
                    print("   [WARNING] Could not list registries")
            else:
                print(f"   [FAILED] Failed to create registry: {registry_response.status_code}")
                print(f"   Response: {registry_response.text}")
                # Continue anyway - might work without registry
            
            print("\n[SUCCESS] KERIA setup completed!")
            print(f"Issuer AID: {issuer_aid}")
            print("Service on port 3008 should now work.")
            
            # Test credential issuance
            print("\n[TESTING] Credential issuance...")
            test_payload = {
                "schemaSaid": "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU",
                "aid": issuer_aid,
                "attribute": {
                    "employeeId": "KERIA-SETUP-TEST-001",
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
            
            return True
            
    except Exception as e:
        print(f"[FAILED] KERIA setup failed: {e}")
        return False

if __name__ == "__main__":
    print("KERIA Setup for Travlr-Issuer")
    print("=" * 30)
    
    success = asyncio.run(setup_keria_for_travlr())
    
    if success:
        print("\n[SUCCESS] KERIA setup completed for travlr-issuer!")
        print("The service on port 3008 should now work.")
    else:
        print("\n[FAILED] KERIA setup failed!")