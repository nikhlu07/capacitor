import requests
import json
import time

def create_acdc_direct():
    print("Creating ACDC credential directly with KERIA API...")
    
    base_url = "http://localhost:3904"
    passcode = "0123456789abcdefghij1"
    
    # Create session with auth
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    })
    
    # Try to use existing agent or create new one
    try:
        # Try to connect to existing agent first
        session.headers['Authorization'] = f'Bearer {passcode}'
        
        # Check if agent exists
        response = session.get(f"{base_url}/agent", timeout=5)
        if response.status_code == 200:
            print("Using existing agent")
        else:
            # Boot new agent
            print("Booting new agent...")
            boot_data = {"passcode": passcode}
            boot_response = session.post(f"{base_url}/boot", json=boot_data, timeout=10)
            
            if boot_response.status_code not in [200, 202, 409]:
                print(f"Boot failed: {boot_response.status_code} {boot_response.text}")
                return None
                
            print("Agent booted successfully")
        
        # Use the passcode for all requests
        session.headers['Authorization'] = f'Bearer {passcode}'
        
        # Create identifier
        print("Creating identifier...")
        aid_name = f"direct-issuer-{int(time.time())}"
        
        id_data = {
            "name": aid_name,
            "algo": "randy",
            "count": 1,
            "ncount": 1,
            "transferable": True
        }
        
        id_response = session.post(f"{base_url}/identifiers", json=id_data, timeout=10)
        print(f"Identifier response: {id_response.status_code}")
        
        if id_response.status_code == 202:
            time.sleep(3)
            
            # Get the identifier
            get_response = session.get(f"{base_url}/identifiers/{aid_name}", timeout=10)
            if get_response.status_code == 200:
                aid_data = get_response.json()
                aid_prefix = aid_data['prefix']
                print(f"Identifier created: {aid_prefix}")
            else:
                print(f"Could not get identifier: {get_response.status_code}")
                return None
        else:
            print(f"Identifier creation failed: {id_response.status_code} {id_response.text}")
            return None
        
        # Create registry
        print("Creating registry...")
        reg_data = {
            "name": aid_name,
            "registryName": "DirectACDC"
        }
        
        reg_response = session.post(f"{base_url}/identifiers/{aid_name}/registries", 
                                  json=reg_data, timeout=10)
        print(f"Registry response: {reg_response.status_code}")
        
        if reg_response.status_code == 202:
            time.sleep(3)
            
            # Get registry
            reg_get_response = session.get(f"{base_url}/identifiers/{aid_name}/registries", timeout=10)
            if reg_get_response.status_code == 200:
                registries = reg_get_response.json()
                if registries:
                    registry_key = registries[0]['regk']
                    print(f"Registry created: {registry_key}")
                else:
                    print("No registry found")
                    return None
            else:
                print(f"Could not get registry: {reg_get_response.status_code}")
                return None
        else:
            print(f"Registry creation failed: {reg_response.status_code} {reg_response.text}")
            return None
            
        # Skip OOBI resolution for now and try credential directly
        print("Creating credential directly...")
        
        cred_data = {
            "ri": registry_key,
            "s": "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU",
            "a": {
                "i": aid_prefix,
                "employeeId": "DIRECT-001",
                "seatPreference": "window",
                "mealPreference": "vegetarian", 
                "airlines": "Direct Airlines",
                "emergencyContact": "Direct Contact",
                "allergies": "None"
            }
        }
        
        cred_response = session.post(f"{base_url}/identifiers/{aid_name}/credentials",
                                   json=cred_data, timeout=15)
        
        print(f"Credential response: {cred_response.status_code}")
        print(f"Response text: {cred_response.text}")
        
        if cred_response.status_code == 202:
            try:
                response_data = cred_response.json()
                if 'd' in response_data:
                    cred_id = response_data['d']
                    print(f"CREDENTIAL CREATED: {cred_id}")
                    return cred_id
                else:
                    print("No credential ID in response")
                    return None
            except:
                print("Could not parse credential response")
                return None
        else:
            print(f"Credential creation failed: {cred_response.status_code}")
            print(f"Error: {cred_response.text}")
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    result = create_acdc_direct()
    if result:
        print(f"SUCCESS: Created ACDC credential {result}")
    else:
        print("FAILED: Could not create ACDC credential")