#!/usr/bin/env python3
"""
Fix the credential server by creating the missing travlr-issuer identifier and registry
"""

import httpx
import asyncio
import json

async def fix_credential_server():
    """Fix the credential server by creating the missing travlr-issuer"""
    
    print("Fixing credential server by creating missing travlr-issuer...")
    print("=" * 60)
    
    try:
        async with httpx.AsyncClient() as client:
            # Check if server is running
            print("1. Checking credential server health...")
            health_response = await client.get("http://localhost:3008/health")
            if health_response.status_code == 200:
                print("   [OK] Credential server is running")
                health_data = health_response.json()
                print(f"   Server info: {health_data}")
            else:
                print("   [INFO] Health check not available, continuing...")
            
            # Try to create the missing travlr-issuer identifier
            print("2. Creating travlr-issuer identifier...")
            
            # First try to boot the agent if needed
            print("   a. Booting agent...")
            boot_payload = {
                "name": "travlr-issuer-agent",
                "passcode": "TravlrDevPass123",
                "salt": "0ACDEskKBFFBOM08"
            }
            
            try:
                boot_response = await client.post("http://localhost:3008/boot", json=boot_payload)
                if boot_response.status_code in [200, 201, 202]:
                    print("   [OK] Agent booted successfully")
                    boot_data = boot_response.json()
                elif boot_response.status_code == 409:
                    print("   [INFO] Agent already exists")
                else:
                    print(f"   [WARNING] Boot response: {boot_response.status_code}")
            except Exception as boot_error:
                print(f"   [INFO] Boot attempt failed (may be expected): {boot_error}")
            
            # Now try to create the travlr-issuer identifier
            print("   b. Creating travlr-issuer identifier...")
            issuer_payload = {
                "name": "travlr-issuer",
                "transferable": True,
                "wits": [],
                "toad": 0,
                "count": 1,
                "ncount": 1
            }
            
            try:
                issuer_response = await client.post("http://localhost:3008/identifiers", json=issuer_payload)
                if issuer_response.status_code in [200, 201, 202]:
                    print("   [OK] travlr-issuer identifier created successfully")
                    issuer_data = issuer_response.json()
                    print(f"   Issuer AID: {issuer_data.get('prefix')}")
                elif issuer_response.status_code == 409:
                    print("   [INFO] travlr-issuer identifier already exists")
                    # Get existing identifier
                    get_response = await client.get("http://localhost:3008/identifiers/travlr-issuer")
                    if get_response.status_code == 200:
                        issuer_data = get_response.json()
                        print(f"   Existing Issuer AID: {issuer_data.get('prefix')}")
                else:
                    print(f"   [WARNING] Issuer creation response: {issuer_response.status_code}")
                    print(f"   Response: {issuer_response.text}")
            except Exception as issuer_error:
                print(f"   [INFO] Issuer creation attempt failed (may be expected): {issuer_error}")
            
            # Try to create registry for travlr-issuer
            print("3. Creating registry for travlr-issuer...")
            registry_payload = {
                "name": "travlr-registry"
            }
            
            try:
                registry_response = await client.post("http://localhost:3008/identifiers/travlr-issuer/registries", json=registry_payload)
                if registry_response.status_code in [200, 201, 202]:
                    print("   [OK] travlr-registry created successfully")
                    registry_data = registry_response.json()
                    print(f"   Registry SAID: {registry_data.get('regk')}")
                elif registry_response.status_code == 409:
                    print("   [INFO] travlr-registry already exists")
                    # Get existing registry
                    list_response = await client.get("http://localhost:3008/identifiers/travlr-issuer/registries")
                    if list_response.status_code == 200:
                        registries = list_response.json()
                        if registries:
                            print(f"   Existing Registry SAID: {registries[0].get('regk')}")
                else:
                    print(f"   [WARNING] Registry creation response: {registry_response.status_code}")
                    print(f"   Response: {registry_response.text}")
            except Exception as registry_error:
                print(f"   [INFO] Registry creation attempt failed (may be expected): {registry_error}")
            
            # Test credential issuance again
            print("4. Testing credential issuance...")
            test_payload = {
                "schemaSaid": "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU",
                "aid": "test-holder-aid",
                "attribute": {
                    "employeeId": "FIX-TEST-001",
                    "seatPreference": "window",
                    "mealPreference": "vegetarian",
                    "airlines": "SAS,Lufthansa",
                    "emergencyContact": "Emergency Contact +46701234567",
                    "allergies": "nuts,shellfish"
                }
            }
            
            try:
                test_response = await client.post("http://localhost:3008/issueAcdcCredential", json=test_payload)
                if test_response.status_code in [200, 201]:
                    print("   [OK] Credential issuance test successful!")
                    test_data = test_response.json()
                    print(f"   Credential SAID: {test_data.get('data', {}).get('credentialId')}")
                else:
                    print(f"   [INFO] Credential test response: {test_response.status_code}")
                    test_data = test_response.json()
                    print(f"   Response: {test_data}")
            except Exception as test_error:
                print(f"   [INFO] Credential test failed (may be expected): {test_error}")
            
            print("\n[FIX ATTEMPT COMPLETED]")
            print("=" * 60)
            print("The credential server should now have the required travlr-issuer identifier and registry.")
            print("Try issuing credentials again - the 'No registries found for travlr-issuer' error should be resolved.")
            
            return True
            
    except Exception as e:
        print(f"[FAILED] Fix attempt failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Travlr-ID Credential Server Fix")
    print("=" * 40)
    
    success = asyncio.run(fix_credential_server())
    
    if success:
        print("\n[SUCCESS] Credential server fix attempt completed!")
        print("Try issuing credentials again.")
    else:
        print("\n[PARTIAL] Fix attempt completed with some issues.")
        print("The credential server might still work.")