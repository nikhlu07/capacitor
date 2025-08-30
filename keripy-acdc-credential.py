#!/usr/bin/env python3
"""
Create ACDC credential using exact KERI/KERIPY approach (like Veridian)
"""

from keri import core
from keri.core import coring, scheming
from keri.app import habbing
from keri.vc import proving
from keri.vdr import credentialing
from keri.core.eventing import SealEvent

def create_acdc_credential_keripy():
    """Create ACDC credential using exact KERI/KERIPY approach"""
    
    print("Creating ACDC credential using KERI/KERIPY approach...")
    print("=" * 60)
    
    try:
        # Step 1: Create habitat (like Veridian does)
        print("1. Creating habitat...")
        with habbing.openHby(name="test", temp=True) as hby:
            hab = hby.makeHab(name="issuer")
            print(f"   [OK] Created issuer habitat: {hab.pre}")
            
            # Step 2: Create registry (like Veridian does)
            print("2. Creating credential registry...")
            regery = credentialing.Regery(hby=hby, name="test", temp=True)
            issuer = regery.makeRegistry(prefix=hab.pre, name="test", noBackers=True)
            
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
            print(f"   [OK] Created registry: {issuer.regk}")
            
            # Step 3: Define schema (use the exact one from your working setup)
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
            
            # Create schemer with proper SAID calculation
            schemer = scheming.Schemer(sed=schema_dict, typ=scheming.JSONSchema(), code=coring.MtrDex.Blake3_256)
            schema_said = schemer.said
            print(f"   [OK] Schema SAID: {schema_said}")
            
            # Add schema to cache for resolution
            cache = scheming.CacheResolver(db=hby.db)
            cache.add(schemer.said, schemer.raw)
            
            # Step 4: Create credential subject data
            print("4. Creating credential data...")
            credSubject = {
                "d": "",  # Will be filled by credential creation
                "i": hab.pre,  # Issuer AID
                "dt": "2025-08-28T12:00:00.000000+00:00",
                "employeeId": "KERIPY-TEST-001",
                "seatPreference": "window",
                "mealPreference": "vegetarian",
                "airlines": "SAS,Lufthansa",
                "emergencyContact": "Emergency Contact +46701234567",
                "allergies": "nuts,shellfish"
            }
            
            # Step 5: Create ACDC credential (like Veridian does)
            print("5. Creating ACDC credential...")
            creder = proving.credential(
                issuer=hab.pre,
                schema=schema_said,
                data=credSubject,
                status=issuer.regk
            )
            
            # Endorse the credential with signature
            msg = hab.endorse(serder=creder)
            credential_said = creder.said
            print(f"   [OK] Credential SAID: {credential_said}")
            
            # Step 6: Issue credential through registry (like Veridian does)
            print("6. Issuing credential through registry...")
            iss = issuer.issue(said=credential_said)
            
            # Anchor issuance to KEL
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
            
            # Verify credential state
            state = issuer.tever.vcState(vci=credential_said)
            print(f"   [OK] Credential issued with state: {state.et}")
            
            print("\n[KERI/KERIPY ACDC CREDENTIAL CREATION SUCCESSFUL!]")
            print("=" * 60)
            print(f"Credential SAID: {credential_said}")
            print(f"Issuer AID: {hab.pre}")
            print(f"Schema SAID: {schema_said}")
            print(f"Registry SAID: {issuer.regk}")
            print("\nThis is exactly how Veridian creates credentials!")
            
            return {
                "credential_said": credential_said,
                "issuer_aid": hab.pre,
                "schema_said": schema_said,
                "registry_said": issuer.regk,
                "credential_raw": msg.decode('utf-8') if isinstance(msg, bytes) else str(msg)
            }
            
    except Exception as e:
        print(f"[FAILED] KERI/KERIPY credential creation failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = create_acdc_credential_keripy()
    
    if result:
        print("\n[SUCCESS] ACDC credential created with KERI/KERIPY!")
        print("You can now use this credential SAID in your frontend.")
    else:
        print("\n[FAILED] Could not create ACDC credential with KERI/KERIPY!")