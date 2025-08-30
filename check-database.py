#!/usr/bin/env python3
"""
Check what's in the KERIA database
"""

import sys
import os

# Add KERIA src to path
keria_src_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'keria/src'))
sys.path.insert(0, keria_src_path)

def check_keria_database():
    """Check what's in the KERIA database"""
    
    print("Checking KERIA database...")
    print("=" * 30)
    
    try:
        # Import KERI modules
        from keri.db import basing
        print("[OK] KERI modules imported successfully")
        
        # Connect to KERIA database
        db_path = "/usr/local/var/keri/keria"
        print(f"Connecting to database at {db_path}")
        
        with basing.openDB(name="keria", path=db_path) as db:
            print("[OK] Connected to database")
            
            # Check schemas
            try:
                print("\nChecking schemas...")
                schema_count = 0
                with db.schema.getItemIter() as items:
                    for keys, value in items:
                        schema_count += 1
                        said = keys[0].decode() if isinstance(keys[0], bytes) else keys[0]
                        print(f"  Schema {schema_count}: {said}")
                
                print(f"Found {schema_count} schemas")
                
            except Exception as e:
                print(f"[ERROR] Failed to check schemas: {e}")
            
            # Check identifiers
            try:
                print("\nChecking identifiers...")
                # This is more complex, let's skip for now
                print("  (Skipping identifiers for now)")
                
            except Exception as e:
                print(f"[ERROR] Failed to check identifiers: {e}")
        
        print("\n[SUCCESS] Database check completed!")
        return True
        
    except ImportError as e:
        print(f"[ERROR] KERI modules not available: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Database check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = check_keria_database()
    sys.exit(0 if success else 1)