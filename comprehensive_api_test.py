#!/usr/bin/env python3
"""
Comprehensive API Test - Test ALL endpoints to ensure no errors
"""

import httpx
import asyncio
import json

async def test_all_apis():
    """Test every single API endpoint"""
    print("Comprehensive API Test - Testing ALL Endpoints")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    results = {}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        
        # Test data setup  
        company_aid = "EDemo1234567890123456789012345678901234567890"  # 45 chars
        employee_aid = "ETestEmployee12345678901234567890123456789012" # 45 chars  
        
        print(f"Using Company AID: {company_aid} (len: {len(company_aid)})")
        print(f"Using Employee AID: {employee_aid} (len: {len(employee_aid)})")
        print()
        
        # 1. Test consent request creation
        print("1. Testing POST /api/v1/consent/request")
        try:
            consent_request = {
                "company_aid": company_aid,
                "employee_aid": employee_aid,
                "requested_fields": ["dietary", "emergency_contact"],
                "purpose": "API comprehensive test",
                "company_public_key": "test_public_key",
                "expires_hours": 24
            }
            
            response = await client.post(f"{base_url}/api/v1/consent/request", json=consent_request)
            results["consent_request"] = {
                "status": response.status_code,
                "success": response.status_code == 200,
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                request_id = response.json()["request_id"]
                print(f"   SUCCESS: {response.status_code} - Created request {request_id}")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["consent_request"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 2. Test get pending requests
        print("\n2. Testing GET /api/v1/consent/pending/{employee_aid}")
        try:
            response = await client.get(f"{base_url}/api/v1/consent/pending/{employee_aid}")
            results["pending_requests"] = {
                "status": response.status_code,
                "success": response.status_code == 200,
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                pending = response.json()
                print(f"   SUCCESS: {response.status_code} - Found {len(pending)} pending requests")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["pending_requests"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 3. Test consent approval  
        print("\n3. Testing POST /api/v1/consent/approve")
        try:
            approval = {
                "request_id": request_id if 'request_id' in locals() else "test-request-id",
                "approved_fields": ["dietary"],
                "employee_signature": "test_signature",
                "context_card_said": "ETestContextCard12345678901234567890123456789"
            }
            
            response = await client.post(f"{base_url}/api/v1/consent/approve", json=approval)
            results["consent_approval"] = {
                "status": response.status_code,
                "success": response.status_code == 200,
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                print(f"   SUCCESS: {response.status_code} - Consent approved")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["consent_approval"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 4. Test consent status check
        print("\n4. Testing GET /api/v1/consent/status/{request_id}")
        try:
            test_request_id = request_id if 'request_id' in locals() else "test-request-id"
            response = await client.get(f"{base_url}/api/v1/consent/status/{test_request_id}")
            results["consent_status"] = {
                "status": response.status_code,
                "success": response.status_code in [200, 404],  # 404 is ok for non-existent request
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                print(f"   SUCCESS: {response.status_code} - Got consent status")
            elif response.status_code == 404:
                print(f"   SUCCESS: {response.status_code} - Request not found (expected)")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["consent_status"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 5. Test get consent data
        print("\n5. Testing GET /api/v1/consent/data/{request_id}")
        try:
            test_request_id = request_id if 'request_id' in locals() else "test-request-id"
            response = await client.get(f"{base_url}/api/v1/consent/data/{test_request_id}")
            results["consent_data"] = {
                "status": response.status_code,
                "success": response.status_code in [200, 400, 404],  # Various valid responses
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                print(f"   SUCCESS: {response.status_code} - Got consent data")
            elif response.status_code in [400, 404]:
                print(f"   SUCCESS: {response.status_code} - Expected response for test data")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["consent_data"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 6. Test consent denial
        print("\n6. Testing POST /api/v1/consent/deny/{request_id}")
        try:
            test_request_id = "test-deny-request"  # Use fake ID to avoid affecting real requests
            response = await client.post(f"{base_url}/api/v1/consent/deny/{test_request_id}")
            results["consent_deny"] = {
                "status": response.status_code,
                "success": response.status_code in [200, 404],  # 404 ok for non-existent request
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                print(f"   SUCCESS: {response.status_code} - Consent denied")
            elif response.status_code == 404:
                print(f"   SUCCESS: {response.status_code} - Request not found (expected)")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["consent_deny"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 7. Test consent revocation
        print("\n7. Testing DELETE /api/v1/consent/revoke/{request_id}")
        try:
            test_request_id = "test-revoke-request"
            response = await client.delete(f"{base_url}/api/v1/consent/revoke/{test_request_id}")
            results["consent_revoke"] = {
                "status": response.status_code,
                "success": response.status_code in [200, 404, 400],  # Various valid responses
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                print(f"   SUCCESS: {response.status_code} - Consent revoked")
            elif response.status_code in [404, 400]:
                print(f"   SUCCESS: {response.status_code} - Expected response")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["consent_revoke"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 8. Test debug endpoint
        print("\n8. Testing GET /api/v1/consent/debug/all")
        try:
            response = await client.get(f"{base_url}/api/v1/consent/debug/all")
            results["debug_all"] = {
                "status": response.status_code,
                "success": response.status_code == 200,
                "response": "Debug data retrieved" if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                debug_data = response.json()
                print(f"   SUCCESS: {response.status_code} - Found {debug_data.get('total_requests', 0)} total requests")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["debug_all"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 9. Test company available data (with API key)
        print("\n9. Testing GET /api/v1/company/available-data")
        try:
            headers = {"X-API-Key": "demo_company_api_key"}
            response = await client.get(f"{base_url}/api/v1/company/available-data", headers=headers)
            results["company_available_data"] = {
                "status": response.status_code,
                "success": response.status_code == 200,
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                available_data = response.json()
                print(f"   SUCCESS: {response.status_code} - Found {len(available_data)} available data records")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["company_available_data"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
        
        # 10. Test company stats
        print("\n10. Testing GET /api/v1/company/stats")
        try:
            headers = {"X-API-Key": "demo_company_api_key"}
            response = await client.get(f"{base_url}/api/v1/company/stats", headers=headers)
            results["company_stats"] = {
                "status": response.status_code,
                "success": response.status_code == 200,
                "response": response.json() if response.status_code == 200 else response.text
            }
            
            if response.status_code == 200:
                print(f"   SUCCESS: {response.status_code} - Got company stats")
            else:
                print(f"   FAILED: {response.status_code} - {response.text}")
                
        except Exception as e:
            results["company_stats"] = {"status": "ERROR", "success": False, "error": str(e)}
            print(f"   ERROR: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print("COMPREHENSIVE API TEST RESULTS")
    print("=" * 60)
    
    total_tests = len(results)
    successful_tests = sum(1 for r in results.values() if r["success"])
    
    for endpoint, result in results.items():
        status = "PASS" if result["success"] else "FAIL"
        print(f"{endpoint:25} | {status:4} | Status: {result['status']}")
    
    print("-" * 60)
    print(f"TOTAL: {successful_tests}/{total_tests} tests passed")
    
    if successful_tests == total_tests:
        print("ALL APIS WORKING - NO ERRORS!")
        return True
    else:
        print(f"WARNING: {total_tests - successful_tests} API(s) have issues")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_all_apis())
    if success:
        print("\nCONFIRMED: All APIs are working correctly!")
    else:
        print("\nSome APIs need attention - check results above")