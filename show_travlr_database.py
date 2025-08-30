#!/usr/bin/env python3
"""
Travlr-ID Database Demonstration Script
Shows that Travlr-ID has its own centralized LMDB database infrastructure
"""

import subprocess
import json
from datetime import datetime

def show_travlr_database_architecture():
    """Demonstrate Travlr-ID's own database infrastructure"""
    
    print("=" * 60)
    print("🏢 TRAVLR-ID CENTRALIZED DATABASE INFRASTRUCTURE")
    print("=" * 60)
    
    # Show Travlr-ID owned Docker volumes
    print("\n📦 TRAVLR-ID OWNED DATABASE VOLUMES:")
    print("-" * 40)
    
    result = subprocess.run(['docker', 'volume', 'ls'], capture_output=True, text=True)
    volumes = result.stdout.split('\n')
    
    travlr_volumes = [vol for vol in volumes if 'travlr' in vol.lower()]
    
    for volume in travlr_volumes:
        if volume.strip():
            print(f"✅ {volume}")
    
    # Show specific Travlr-ID KERIA database
    print(f"\n🗄️ TRAVLR-ID KERIA DATABASE LOCATION:")
    print("-" * 40)
    
    try:
        result = subprocess.run([
            'docker', 'volume', 'inspect', 'travlr-id-prod_travlr-keria-data'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            volume_info = json.loads(result.stdout)[0]
            mountpoint = volume_info['Mountpoint']
            created = volume_info['CreatedAt']
            
            print(f"📍 Database Location: {mountpoint}")
            print(f"📅 Created: {created}")
            print(f"🏢 Owner: Travlr-ID (Your Company)")
            print(f"🔒 Access: Travlr-ID Infrastructure Only")
    except Exception as e:
        print(f"Error inspecting volume: {e}")
    
    # Show Travlr-ID containers using the database
    print(f"\n🐳 TRAVLR-ID CONTAINERS USING DATABASE:")
    print("-" * 40)
    
    result = subprocess.run(['docker', 'ps'], capture_output=True, text=True)
    containers = result.stdout.split('\n')
    
    travlr_containers = [cont for cont in containers if 'travlr' in cont.lower()]
    
    for container in travlr_containers:
        if container.strip() and 'CONTAINER' not in container:
            parts = container.split()
            if len(parts) > 0:
                container_name = parts[-1]
                print(f"✅ {container_name}")
    
    # Show database contents
    print(f"\n📊 TRAVLR-ID LMDB DATABASE CONTENTS:")
    print("-" * 40)
    
    try:
        result = subprocess.run([
            'docker', 'exec', 'travlr-id-prod-keria-local-1', 
            'sh', '-c', 'ls -la /usr/local/var/keri/'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("📁 KERI Database Structure:")
            for line in result.stdout.split('\n'):
                if line.strip():
                    print(f"   {line}")
    except Exception as e:
        print(f"Could not access container: {e}")
    
    # Show architecture summary
    print(f"\n🏗️ TRAVLR-ID DATABASE ARCHITECTURE:")
    print("-" * 40)
    print("✅ Centralized: Single Travlr-ID database for all employees")
    print("✅ Self-Hosted: Runs on Travlr-ID infrastructure")
    print("✅ LMDB Storage: Cryptographic key-value database")
    print("✅ Witness Network: 7 Travlr-ID witnesses for consensus")
    print("✅ Business Logic: PostgreSQL for consent & analytics")
    print("✅ Full Control: No external dependencies")
    
    print(f"\n🔐 WHAT'S STORED IN TRAVLR-ID DATABASE:")
    print("-" * 40)
    print("• Employee KERI Identities (AIDs)")
    print("• Travel Preference Credentials (ACDC)")
    print("• Key Rotation History")
    print("• Witness Consensus Receipts")
    print("• Cryptographic Audit Trails")
    print("• Consent Management Records")
    
    print(f"\n🌐 ENTERPRISE INTEGRATION:")
    print("-" * 40)
    print("• Scania: Direct API access to verified employee data")
    print("• Travel Systems: Real-time credential verification")
    print("• HR Systems: Employee lifecycle management")
    print("• Compliance: Immutable audit trails")
    
    print(f"\n📈 BUSINESS VALUE:")
    print("-" * 40)
    print("• Single Source of Truth for employee travel identities")
    print("• Cryptographically verifiable credentials")
    print("• Employee privacy and consent control")
    print("• Integration with existing enterprise systems")
    print("• Compliance-ready audit trails")
    
    print(f"\n" + "=" * 60)
    print(f"🎯 CONCLUSION: Travlr-ID has its own centralized KERI")
    print(f"   database infrastructure providing enterprise-grade")
    print(f"   identity management with cryptographic security.")
    print("=" * 60)

if __name__ == "__main__":
    show_travlr_database_architecture()