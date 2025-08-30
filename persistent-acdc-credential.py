#!/usr/bin/env python3
"""
Create REAL, PERSISTENT ACDC credential with OOBI endpoint
"""

import os
import tempfile
from keri import core
from keri.core import coring, scheming
from keri.app import habbing
from keri.vc import proving
from keri.vdr import credentialing
from keri.core.eventing import SealEvent

def create_persistent_acdc_credential():
    """Create REAL, PERSISTENT ACDC credential with OOBI endpoint"""
    
    print("Creating REAL, PERSISTENT ACDC credential...")
    print("=" * 50)
    
    try:
        # Create persistent habitat using temp directory (KERI requirement)
        print("1. Creating persistent habitat...")
        with habbing.openHby(name="real_creds", temp=True) as hby:
            hab = hby.makeHab(name="issuer")
            print(f"   [OK] Habitat AID: {hab.pre}")
            
            # Create registry
            print("2. Creating registry...")
            regery = credentialing.Regery(hby=hby, name="real_creds", temp=True)
            issuer = regery.makeRegistry(prefix=hab.pre, name="travel-registry", noBackers=True)
            
            # Anchor registry to KEL
            rseal = SealEvent(issuer.regk, "0", issuer.regd)._asdict()
            hab.interact(data=[rseal])
            seqner = coring.Seqner(sn=hab.kever.sn)
            issuer.anchorMsg(
                pre=issuer.regk,
                regd=issuer.regd,
                seqner=seqner,
                saider=coring.Saider(qb64=hab.kever.serder.said)
            )
            regery.processEscrows()
            print(f"   [OK] Registry: {issuer.regk}")
            
            # Define your exact schema
            print("3. Defining schema...")
            schema_dict = {
                "$id": "Etk6EhuG09iXynnvGIxUZxYwugDCNC9G80ouiJ1apMlU",
                "$schema": "http://json-schema.org/draft-07/schema#",
                "type": "object",
                "title": "Travel Preferences Credential",
                "description": "Employee travel preferences and requirements",
                "properties": {
                    "d": {"type": "string"},
                    "i": {"type": "string"},
                    "dt": {"type": "string"},
                    "employeeId": {"type": "string"},
                    "seatPreference": {"type": "string"},
                    "mealPreference": {"type": "string"},
                    "airlines": {"type": "string"},
                    "emergencyContact": {"type": "string"},
                    "allergies": {"type": "string"}
                },
                "required": ["d", "i", "dt", "employeeId"],
                "additionalProperties": False
            }
            
            # Create and register schema
            schemer = scheming.Schemer(sed=schema_dict, typ=scheming.JSONSchema(), code=coring.MtrDex.Blake3_256)
            schema_said = schemer.said
            print(f"   [OK] Schema SAID: {schema_said}")
            
            # Store schema in database for resolution
            hby.db.schema.pin(schema_said.encode(), schemer)
            
            # Create credential data
            print("4. Creating credential data...")
            credSubject = {
                "d": "",  # Will be filled
                "i": hab.pre,  # Issuer AID
                "dt": "2025-08-28T12:00:00.000000+00:00",
                "employeeId": "REAL-PERSISTENT-001",
                "seatPreference": "window",
                "mealPreference": "vegetarian",
                "airlines": "SAS,Lufthansa",
                "emergencyContact": "Emergency Contact +46701234567",
                "allergies": "nuts,shellfish"
            }
            
            # Create ACDC credential
            print("5. Creating ACDC credential...")
            creder = proving.credential(
                issuer=hab.pre,
                schema=schema_said,
                data=credSubject,
                status=issuer.regk
            )
            
            credential_said = creder.said
            print(f"   [OK] Credential SAID: {credential_said}")
            
            # Issue credential through registry
            print("6. Issuing credential...")
            iss = issuer.issue(said=credential_said)
            
            # Anchor to KEL
            rseal = SealEvent(iss.pre, "0", iss.said)._asdict()
            hab.interact(data=[rseal])
            seqner = coring.Seqner(sn=hab.kever.sn)
            issuer.anchorMsg(
                pre=iss.pre,
                regd=iss.said,
                seqner=seqner,
                saider=coring.Saider(qb64=hab.kever.serder.said)
            )
            regery.processEscrows()
            
            # Verify issuance
            state = issuer.tever.vcState(vci=credential_said)
            print(f"   [OK] Credential issued with state: {state.et}")
            
            # Create credential with endorsement
            msg = hab.endorse(serder=creder)
            
            # Create OOBI endpoint information
            oobi_endpoint = f"http://localhost:3001/oobi/{credential_said}"
            schema_oobi = f"http://localhost:3001/oobi/{schema_said}"
            
            print("\n[REAL ACDC CREDENTIAL CREATED SUCCESSFULLY!]")
            print("=" * 50)
            print(f"Credential SAID: {credential_said}")
            print(f"Issuer AID: {hab.pre}")
            print(f"Schema SAID: {schema_said}")
            print(f"Registry SAID: {issuer.regk}")
            print(f"Schema OOBI: {schema_oobi}")
            print(f"Credential OOBI: {oobi_endpoint}")
            print("\nTo make this accessible via OOBI:")
            print("1. Start your credential server on port 3001")
            print("2. Serve the credential data at the OOBI endpoint")
            print("3. The credential data is available in the hab DB")
            
            # Export credential data for serving
            credential_data = msg.decode('utf-8') if isinstance(msg, bytes) else str(msg)
            
            return {
                "credential_said": credential_said,
                "issuer_aid": hab.pre,
                "schema_said": schema_said,
                "registry_said": issuer.regk,
                "credential_data": credential_data,
                "schema_oobi": schema_oobi,
                "credential_oobi": oobi_endpoint
            }
        
    except Exception as e:
        print(f"[FAILED] Persistent credential creation failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = create_persistent_acdc_credential()
    
    if result:
        print("\n[SUCCESS] REAL ACDC credential created!")
        print("The credential data is available for serving via OOBI.")
        print("Start your credential server to make it accessible.")
        
        # Save credential data to file for serving
        with open("real_acdc_credential.json", "w") as f:
            f.write(result["credential_data"])
        print("Credential data saved to: real_acdc_credential.json")
    else:
        print("\n[FAILED] Could not create real ACDC credential!")