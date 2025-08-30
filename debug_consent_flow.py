#!/usr/bin/env python3
"""
Debug Consent Flow - Focused test for credential retrieval issue
"""

import httpx
import asyncio
import json

async def debug_consent_flow():
    """Debug the consent flow credential retrieval issue"""
    print("Starting Consent Flow Debug Test")
    print("=" * 50)
    
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Generate proper 45-character AIDs using utility functions
            import sys
            sys.path.append("C:/Users/nikhil/Downloads/t/scania-keri/travlr-id/backend")
            from app.core.keri_utils import generate_company_aid, generate_employee_aid
            
            company_aid = generate_company_aid("TestCompany")
            employee_aid = generate_employee_aid("test-employee-001")
            
            print(f"Company AID: {company_aid} (length: {len(company_aid)})")
            print(f"Employee AID: {employee_aid} (length: {len(employee_aid)})")
            
            # Step 1: Create consent request
            print("\n1. Creating consent request...")
            consent_request = {
                "company_aid": company_aid,
                "employee_aid": employee_aid,
                "requested_fields": ["dietary", "emergency_contact"],
                "purpose": "Debug test for credential retrieval",
                "company_public_key": "company_public_key_base64_encoded_x25519",
                "expires_hours": 24
            }
            
            response = await client.post(f"{base_url}/api/v1/consent/request", json=consent_request)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                request_id = result["request_id"]
                print(f"Request ID: {request_id}")
            else:
                print(f"Error: {response.text}")
                return
            
            # Step 2: Check pending requests
            print("\n2. Checking pending requests...")
            response = await client.get(f"{base_url}/api/v1/consent/pending/{employee_aid}")
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                pending = response.json()
                print(f"Pending requests: {len(pending)}")
            else:
                print(f"Error: {response.text}")
            
            # Step 3: Approve consent
            print("\n3. Approving consent request...")
            from app.core.keri_utils import generate_credential_said
            context_card_said = generate_credential_said()
            approval = {
                "request_id": request_id,
                "approved_fields": ["dietary", "emergency_contact"],
                "employee_signature": "employee_signature_placeholder",
                "context_card_said": context_card_said
            }
            
            response = await client.post(f"{base_url}/api/v1/consent/approve", json=approval)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Approval result: {result}")
            else:
                print(f"Error: {response.text}")
                return
            
            # Step 4: Get consent data (context card info)
            print("\n4. Getting consent data...")
            response = await client.get(f"{base_url}/api/v1/consent/data/{request_id}")
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                consent_data = response.json()
                print(f"Context card SAID: {consent_data['context_card_said']}")
                print(f"Approved fields: {consent_data['approved_fields']}")
                
                # Step 5: Debug credential retrieval
                print("\n5. Testing credential retrieval...")
                
                # Direct credential store access test
                try:
                    # Import the consent workflow module to access credential store
                    import sys
                    sys.path.append("C:/Users/nikhil/Downloads/t/scania-keri/travlr-id/backend")
                    
                    from app.api.v1.endpoints.consent_workflow import credential_store
                    print(f"Credential store contents: {len(credential_store)} items")
                    
                    if context_card_said in credential_store:
                        print(f"Found credential in store: {context_card_said}")
                        credential = credential_store[context_card_said]
                        print(f"Credential keys: {list(credential.keys())}")
                    else:
                        print(f"Credential NOT found in store: {context_card_said}")
                        print(f"Available keys in store: {list(credential_store.keys())}")
                    
                    # Try to manually create and store a credential for testing  
                    print("\n5b. Manual credential creation test...")
                    test_credential = {
                        "credentialSubject": {
                            "encryptedContent": "test_encrypted_content",
                            "approvedFields": ["dietary", "emergency_contact"],
                            "metadata": {
                                "purpose": "Debug test",
                                "approvedAt": "2024-01-01T00:00:00.000000",
                                "employeeSignature": "test_signature"
                            }
                        },
                        "issuer": employee_aid,
                        "recipient": company_aid,
                        "schema": "EContextTravelCardSchema123456789012345"
                    }
                    credential_store[context_card_said] = test_credential
                    print(f"Manually stored credential. Store now has {len(credential_store)} items")
                    
                except Exception as store_error:
                    print(f"Store access error: {store_error}")
                
            else:
                print(f"Error getting consent data: {response.text}")
                return
            
            # Step 6: Test company data access using correct endpoint
            print("\n6. Testing company data access...")
            try:
                # Use the correct decrypt-data endpoint with API key
                decrypt_request = {
                    "employee_aid": employee_aid,
                    "context_card_said": context_card_said,
                    "company_aid": company_aid
                }
                
                headers = {
                    "X-API-Key": "demo_company_api_key",
                    "Content-Type": "application/json"
                }
                
                response = await client.post(
                    f"{base_url}/api/v1/company/decrypt-data", 
                    json=decrypt_request,
                    headers=headers
                )
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    decrypted_data = response.json()
                    print("SUCCESS: Data decrypted successfully!")
                    print(f"Decrypted data: {decrypted_data}")
                else:
                    print(f"FAILED: {response.text}")
                    
            except Exception as e:
                print(f"Company data access error: {e}")
            
            print("\nDebug test completed!")
            
        except Exception as e:
            print(f"Test error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_consent_flow())