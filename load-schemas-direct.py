#!/usr/bin/env python3
"""
Load schemas directly into KERIA database - Final version
"""

import sys
import os
import json

# Add KERIA src to path
keria_src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'keria/src'))
sys.path.insert(0, keria_src_path)

def load_schemas_to_keria():
    """Load schemas directly into KERIA database"""
    
    print("Loading schemas into KERIA database...")
    print("=" * 50)
    
    try:
        # Import KERI modules
        from keri.core import coring, scheming
        from keri.db import basing
        print("[OK] KERI modules imported successfully")
        
        # Define schemas with proper format
        schemas = {
            "travel-preferences": {
                "$id": "",
                "$schema": "https://json-schema.org/draft/07/schema#",
                "type": "object",
                "title": "Travel Preferences",
                "description": "Employee travel preferences",
                "properties": {
                    "d": {"type": "string"},
                    "i": {"type": "string"},
                    "employeeId": {"type": "string"},
                    "seatPreference": {"type": "string"},
                    "mealPreference": {"type": "string"},
                    "airlines": {"type": "string"},
                    "emergencyContact": {"type": "string"},
                    "allergies": {"type": "string"}
                },
                "required": ["d", "i", "employeeId"],
                "additionalProperties": False
            },
            "employee-credential": {
                "$id": "",
                "$schema": "https://json-schema.org/draft/07/schema#",
                "type": "object",
                "title": "Employee Credential",
                "description": "Employee identity credential",
                "properties": {
                    "d": {"type": "string"},
                    "i": {"type": "string"},
                    "employeeId": {"type": "string"},
                    "fullName": {"type": "string"},
                    "department": {"type": "string"},
                    "email": {"type": "string"}
                },
                "required": ["d", "i", "employeeId"],
                "additionalProperties": False
            }
        }
        
        # Connect to KERIA database
        print("Connecting to KERIA database...")
        db_path = "/usr/local/var/keri/keria"  # Default KERIA path
        
        # Try different paths
        possible_paths = [
            db_path,
            os.path.expanduser("~/.keri/keria"),
            "./keri/data",
            "./data"
        ]
        
        db_found = False
        for path in possible_paths:
            try:
                if os.path.exists(path):
                    print(f"[OK] Found KERIA database at {path}")
                    db_found = True
                    break
            except Exception as e:
                print(f"   [ERROR] Failed to check {path}: {e}")
                continue
        
        if not db_found:
            print("[ERROR] Could not find KERIA database")
            return False
        
        # Load schemas
        loaded_count = 0
        for schema_name, schema_data in schemas.items():
            try:
                print(f"\nLoading schema: {schema_name}")
                
                # Calculate SAID using KERI
                _, saidified_schema = coring.Saider.saidify(schema_data, label=coring.Saids.dollar)
                
                # Create Schemer object
                schemer = scheming.Schemer(sed=saidified_schema)
                
                # Pin to database using context manager
                with basing.openDB(name="keria", path=db_path) as db:
                    db.schema.pin(schemer.said.encode(), schemer)
                
                print(f"[OK] Loaded {schema_name}")
                print(f"   SAID: {schemer.said}")
                
                loaded_count += 1
                
            except Exception as e:
                print(f"[ERROR] Failed to load {schema_name}: {e}")
                import traceback
                traceback.print_exc()
        
        print(f"\n[OK] Successfully loaded {loaded_count}/{len(schemas)} schemas into KERIA!")
        print("\nNow you can restart KERIA and test credential issuance.")
        return True
        
    except ImportError as e:
        print(f"[ERROR] KERI modules not available: {e}")
        print("Make sure KERI is installed: pip install keri")
        return False
    except Exception as e:
        print(f"[ERROR] Error loading schemas: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("KERIA Schema Loader")
    print("=" * 20)
    
    success = load_schemas_to_keria()
    
    if success:
        print("\n[SUCCESS] Schema loading completed successfully!")
        print("Restart KERIA to use the loaded schemas.")
    else:
        print("\n[FAILED] Schema loading failed!")
        
    sys.exit(0 if success else 1)