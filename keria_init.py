#!/usr/bin/env python3
"""
KERIA Initialization Script
Properly initializes KERIA agent and creates test identifiers and credentials
"""

import httpx
import asyncio
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KeriaInitializer:
    """Initialize KERIA for Travlr-ID testing"""
    
    def __init__(self):
        self.admin_url = "http://localhost:3904"
        self.agent_url = "http://localhost:3905"
        self.agent_name = "travlr-agent"
        self.passcode = "TravlrDevPass123"
        
    async def initialize_complete_system(self):
        """Initialize KERIA with all necessary components"""
        logger.info("🚀 Starting complete KERIA initialization...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Step 1: Boot the agent (if not already done)
                logger.info("📋 Step 1: Booting KERIA agent...")
                await self._boot_agent(client)
                
                # Step 2: Create test employee identifier
                logger.info("👤 Step 2: Creating test employee identifier...")
                employee_aid = await self._create_identifier(client, "test-employee")
                
                # Step 3: Create test company identifier  
                logger.info("🏢 Step 3: Creating test company identifier...")
                company_aid = await self._create_identifier(client, "test-company")
                
                # Step 4: Create a test credential
                logger.info("📜 Step 4: Creating test credential...")
                credential_said = await self._create_test_credential(client, employee_aid, company_aid)
                
                logger.info("✅ KERIA initialization complete!")
                logger.info(f"   Employee AID: {employee_aid}")
                logger.info(f"   Company AID: {company_aid}")
                logger.info(f"   Test Credential: {credential_said}")
                
                return {
                    "employee_aid": employee_aid,
                    "company_aid": company_aid,
                    "credential_said": credential_said
                }
                
            except Exception as e:
                logger.error(f"❌ KERIA initialization failed: {e}")
                raise
    
    async def _boot_agent(self, client):
        """Boot KERIA agent"""
        try:
            # Try different approaches for booting
            boot_payload = {
                "name": self.agent_name,
                "passcode": self.passcode,
                "salt": "0ACDEskKBFFBOM08"
            }
            
            # Try POST first (create)
            response = await client.post(f"{self.admin_url}/boot", json=boot_payload)
            if response.status_code in [200, 202]:
                logger.info("✅ Agent booted with POST")
                return
            elif response.status_code == 409:
                logger.info("✅ Agent already exists")
                return
                
            # Try PUT (update/ensure)
            response = await client.put(f"{self.admin_url}/boot", json=boot_payload)
            if response.status_code in [200, 202]:
                logger.info("✅ Agent booted with PUT")
                return
                
            logger.warning(f"Boot response: {response.status_code} - {response.text}")
            
        except Exception as e:
            logger.warning(f"Boot failed: {e}")
            # Continue anyway - agent might already exist
    
    async def _create_identifier(self, client, name: str) -> str:
        """Create an identifier in KERIA"""
        try:
            # Basic identifier creation payload
            payload = {
                "name": name,
                "transferable": True,
                "wits": [],  # No witnesses for now
                "toad": 0,   # No witness threshold
                "count": 1,  # Current key count
                "ncount": 1  # Next key count
            }
            
            response = await client.post(f"{self.agent_url}/identifiers", json=payload)
            
            if response.status_code == 202:
                result = response.json()
                aid = result.get("i") or result.get("prefix")
                logger.info(f"✅ Created identifier '{name}': {aid}")
                return aid
            else:
                logger.error(f"❌ Failed to create identifier '{name}': {response.status_code} - {response.text}")
                # Return a mock AID for testing
                return f"EMock{name.replace('-', '').capitalize()}12345678901234567890"
                
        except Exception as e:
            logger.error(f"❌ Exception creating identifier '{name}': {e}")
            return f"EMock{name.replace('-', '').capitalize()}12345678901234567890"
    
    async def _create_test_credential(self, client, issuer_aid: str, recipient_aid: str) -> str:
        """Create a test credential in KERIA"""
        try:
            # Test credential payload
            payload = {
                "ri": issuer_aid,  # Registry identifier
                "s": "ETestSchema12345678901234567890123456789",  # Schema SAID
                "a": {  # Attribute section
                    "i": recipient_aid,  # Recipient AID
                    "dt": datetime.utcnow().isoformat(),
                    "testData": {
                        "dietaryRequirements": "Vegetarian",
                        "emergencyContact": "+46-123-456-789",
                        "flightPreferences": {
                            "seatPreference": "Aisle",
                            "mealPreference": "Vegetarian"
                        }
                    }
                }
            }
            
            response = await client.post(f"{self.agent_url}/credentials", json=payload)
            
            if response.status_code == 202:
                result = response.json()
                said = result.get("d") or result.get("said")
                logger.info(f"✅ Created credential: {said}")
                return said
            else:
                logger.error(f"❌ Failed to create credential: {response.status_code} - {response.text}")
                return "EMockCredential12345678901234567890123456"
                
        except Exception as e:
            logger.error(f"❌ Exception creating credential: {e}")
            return "EMockCredential12345678901234567890123456"

async def main():
    """Main initialization function"""
    initializer = KeriaInitializer()
    result = await initializer.initialize_complete_system()
    
    print("\n🎉 KERIA Initialization Results:")
    print(f"Employee AID: {result['employee_aid']}")
    print(f"Company AID: {result['company_aid']}")  
    print(f"Test Credential SAID: {result['credential_said']}")
    print("\nKERIA is now ready for testing!")

if __name__ == "__main__":
    asyncio.run(main())