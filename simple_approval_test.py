#!/usr/bin/env python3
"""
Simple test just for the approval step
"""

import httpx
import asyncio

async def simple_approval_test():
    """Test just the approval step with logging"""
    print("Simple Approval Test")
    print("=" * 30)
    
    base_url = "http://localhost:8000"
    
    # Wait for server to start
    await asyncio.sleep(3)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Generate proper AIDs
            import sys
            sys.path.append("C:/Users/nikhil/Downloads/t/scania-keri/travlr-id/backend")
            from app.core.keri_utils import generate_company_aid, generate_employee_aid, generate_credential_said
            
            company_aid = generate_company_aid("TestCompany")
            employee_aid = generate_employee_aid("test-employee-001")
            
            print(f"Company AID: {company_aid}")
            print(f"Employee AID: {employee_aid}")
            
            # Step 1: Create consent request
            print("\n1. Creating consent request...")
            consent_request = {
                "company_aid": company_aid,
                "employee_aid": employee_aid,
                "requested_fields": ["dietary", "emergency_contact"],
                "purpose": "Simple approval test",
                "company_public_key": "company_public_key_base64_encoded_x25519",
                "expires_hours": 24
            }
            
            response = await client.post(f"{base_url}/api/v1/consent/request", json=consent_request)
            if response.status_code != 200:
                print(f"Failed to create request: {response.text}")
                return
            
            result = response.json()
            request_id = result["request_id"]
            print(f"Created request: {request_id}")
            
            # Step 2: Approve with detailed logging
            print("\n2. Approving consent request...")
            context_card_said = generate_credential_said()
            
            approval = {
                "request_id": request_id,
                "approved_fields": ["dietary", "emergency_contact"],
                "employee_signature": "employee_signature_placeholder",
                "context_card_said": context_card_said
            }
            
            print(f"Approval SAID: {context_card_said}")
            
            response = await client.post(f"{base_url}/api/v1/consent/approve", json=approval)
            
            print(f"Approval response status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                print(f"Approval result: {result}")
                
                # Check credential store immediately
                from app.api.v1.endpoints.consent_workflow import credential_store
                print(f"\nImmediate store check: {len(credential_store)} items")
                
                if context_card_said in credential_store:
                    print(f"SUCCESS: Found credential in store!")
                else:
                    print(f"PROBLEM: Credential not in store")
                    print(f"Store keys: {list(credential_store.keys())}")
                    
            else:
                print(f"Approval failed: {response.text}")
                
        except Exception as e:
            print(f"Test error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(simple_approval_test())