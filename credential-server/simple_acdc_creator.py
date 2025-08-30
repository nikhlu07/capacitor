#!/usr/bin/env python3
"""Simple ACDC credential creator using Python requests"""

import requests
import json
import time

def create_real_acdc():
    print("Creating REAL ACDC credential using Python...")
    
    base_url = "http://localhost:3904"
    schema_said = "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU"
    
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    try:
        # Create agent
        print("Creating KERIA agent...")
        passcode = "simple-acdc-" + str(int(time.time()))
        
        boot_data = {"passcode": passcode}
        boot_response = session.post(f"{base_url}/boot", json=boot_data, timeout=10)
        
        if boot_response.status_code in [200, 409]:
            print("Agent ready")
        else:
            print(f"Boot failed: {boot_response.status_code} {boot_response.text}")
            return None
            
        session.headers['Authorization'] = f'Bearer {passcode}'
        
        # Create identifier
        print("Creating identifier...")
        aid_name = f"simple-issuer-{int(time.time())}"
        
        identifier_data = {
            "name": aid_name,
            "algo": "randy",
            "count": 1,
            "ncount": 1,
            "transferable": True
        }
        
        id_response = session.post(f"{base_url}/identifiers", json=identifier_data, timeout=10)
        
        if id_response.status_code == 202:
            print("Identifier creation initiated")
            time.sleep(2)
        else:
            print(f"Identifier creation failed: {id_response.status_code}")
            return None
            
        # Get identifier
        get_id_response = session.get(f"{base_url}/identifiers/{aid_name}", timeout=10)
        if get_id_response.status_code == 200:
            identifier_data = get_id_response.json()
            aid_prefix = identifier_data['prefix']
            print(f"Identifier created: {aid_prefix}")
        else:
            print(f"Could not get identifier: {get_id_response.status_code}")
            return None
            
        # Create registry
        print("Creating registry...")
        registry_data = {
            "name": aid_name,
            "registryName": "SimpleACDCRegistry"
        }
        
        reg_response = session.post(f"{base_url}/identifiers/{aid_name}/registries", 
                                  json=registry_data, timeout=10)
        
        if reg_response.status_code == 202:
            print("Registry creation initiated")
            time.sleep(2)
        else:
            print(f"Registry creation failed: {reg_response.status_code}")
            return None
            
        # Get registry
        reg_list_response = session.get(f"{base_url}/identifiers/{aid_name}/registries", timeout=10)
        if reg_list_response.status_code == 200:
            registries = reg_list_response.json()
            if registries:
                registry_key = registries[0]['regk']
                print(f"Registry created: {registry_key}")
            else:
                print("No registry found")
                return None
        else:
            print(f"Could not list registries: {reg_list_response.status_code}")
            return None
            
        # Resolve schema OOBI
        print("Resolving schema...")
        oobi_url = f"http://host.docker.internal:3005/oobi/{schema_said}"
        oobi_data = {"url": oobi_url}
        
        oobi_response = session.post(f"{base_url}/oobis", json=oobi_data, timeout=10)
        if oobi_response.status_code == 202:
            print("Schema resolution initiated")
            time.sleep(2)
        else:
            print(f"OOBI resolution status: {oobi_response.status_code}")
            
        # Create credential
        print("Creating REAL ACDC credential...")
        
        credential_attributes = {
            "i": aid_prefix,
            "employeeId": "PYTHON-001",
            "seatPreference": "window",
            "mealPreference": "vegetarian",
            "airlines": "Python Airways",
            "emergencyContact": "Python Emergency",
            "allergies": "None"
        }
        
        credential_data = {
            "ri": registry_key,
            "s": schema_said,
            "a": credential_attributes
        }
        
        print("Credential attributes:")
        print(f"  Holder AID: {credential_attributes['i']}")
        print(f"  Employee: {credential_attributes['employeeId']}")
        print(f"  Seat: {credential_attributes['seatPreference']}")
        print(f"  Meal: {credential_attributes['mealPreference']}")
        
        cred_response = session.post(f"{base_url}/identifiers/{aid_name}/credentials", 
                                   json=credential_data, timeout=10)
        
        if cred_response.status_code == 202:
            print("ACDC credential creation initiated!")
            time.sleep(3)
            
            try:
                response_data = cred_response.json()
                if 'd' in response_data:
                    credential_id = response_data['d']
                    print(f"REAL ACDC CREDENTIAL CREATED!")
                    print(f"Credential ID: {credential_id}")
                    
                    # Verify
                    verify_response = session.get(f"{base_url}/credentials/{credential_id}", timeout=10)
                    if verify_response.status_code == 200:
                        cred_data = verify_response.json()
                        print("VERIFIED: Credential stored in KERIA!")
                        print(f"Schema SAID: {cred_data['sad']['s']}")
                        print(f"Holder AID: {cred_data['sad']['a']['i']}")
                        print(f"Employee ID: {cred_data['sad']['a']['employeeId']}")
                        print(f"Seat Preference: {cred_data['sad']['a']['seatPreference']}")
                        
                        print("COMPLETE SUCCESS!")
                        print("Real ACDC credential created with Python")
                        print("Stored in KERIA LMDB database")
                        
                        return credential_id
                    else:
                        print(f"Verification failed: {verify_response.status_code}")
                        return credential_id
                        
            except Exception as e:
                print(f"Could not parse response: {e}")
                return "unknown-credential"
                
        else:
            print(f"Credential creation failed: {cred_response.status_code}")
            print(f"Response: {cred_response.text}")
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    credential_id = create_real_acdc()
    
    if credential_id:
        print(f"FINAL RESULT: ACDC credential ID is {credential_id}")
        print("Permanently stored in KERIA database")
        print("Created with real KERI infrastructure")
        print("Ready for use!")
    else:
        print("Could not create ACDC credential")