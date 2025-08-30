#!/usr/bin/env python3
"""
Create credential using exact Veridian approach
"""

import httpx
import asyncio
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VeridianCredentialIssuer:
    """Issue credentials using exact Veridian approach"""
    
    def __init__(self):
        self.admin_url = "http://localhost:3906"  # KERIA admin port
        self.agent_url = "http://localhost:3905"  # KERIA agent port
        self.admin_client = httpx.AsyncClient(base_url=self.admin_url, timeout=30.0)
        self.agent_client = httpx.AsyncClient(base_url=self.admin_url, timeout=30.0)  # Use admin URL
        self.auth_token = None
        self.agent_name = "travlr-agent"
    
    async def boot_agent(self):
        """Boot agent using Veridian pattern"""
        try:
            logger.info("Attempting to boot KERIA agent...")
            
            boot_payload = {
                "name": self.agent_name,
                "passcode": "TravlrDevPass123",
                "salt": "0ACDEskKBFFBOM08"
            }
            
            response = await self.admin_client.post("/boot", json=boot_payload)
            logger.info(f"Boot response: {response.status_code}")
            
            if response.status_code in [200, 201, 202]:
                logger.info("✅ KERIA agent booted successfully")
                boot_data = response.json()
                if "token" in boot_data:
                    self.auth_token = boot_data["token"]
                    logger.info("🔑 Got auth token from boot response")
                return True
            elif response.status_code == 409:
                logger.info("✅ KERIA agent already exists")
                # Try to authenticate
                await self.authenticate_agent()
                return True
            else:
                logger.error(f"Unexpected boot response: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Boot failed: {e}")
            return False
    
    async def authenticate_agent(self):
        """Authenticate with existing agent"""
        try:
            logger.info("Authenticating with existing agent...")
            auth_payload = {
                "passcode": "TravlrDevPass123"
            }
            
            response = await self.admin_client.put("/boot", json=auth_payload)
            if response.status_code == 200:
                auth_data = response.json()
                if "token" in auth_data:
                    self.auth_token = auth_data["token"]
                    logger.info("🔑 Authenticated successfully")
                    return True
            
            logger.warning(f"Authentication failed: {response.status_code}")
            return False
            
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False
    
    def get_auth_headers(self):
        """Get authentication headers"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
    
    async def get_identifiers(self):
        """Get existing identifiers"""
        try:
            logger.info("Getting identifiers...")
            response = await self.agent_client.get("/identifiers", headers=self.get_auth_headers())
            logger.info(f"Identifiers response: {response.status_code}")
            
            if response.status_code == 200:
                identifiers = response.json()
                logger.info(f"Found {len(identifiers)} identifiers")
                return identifiers
            else:
                logger.error(f"Failed to get identifiers: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to get identifiers: {e}")
            return []
    
    async def create_identifier(self, name):
        """Create a new identifier"""
        try:
            logger.info(f"Creating identifier: {name}")
            
            payload = {
                "name": name,
                "transferable": True,
                "wits": [],  # No witnesses for simplicity
                "toad": 0,
                "count": 1,
                "ncount": 1
            }
            
            response = await self.agent_client.post(
                "/identifiers", 
                json=payload, 
                headers=self.get_auth_headers()
            )
            
            logger.info(f"Create identifier response: {response.status_code}")
            
            if response.status_code in [200, 201, 202]:
                result = response.json()
                logger.info(f"✅ Identifier created: {result.get('prefix', 'unknown')}")
                return result
            else:
                logger.error(f"Failed to create identifier: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to create identifier: {e}")
            return None
    
    async def get_registries(self, identifier_name):
        """Get registries for an identifier"""
        try:
            logger.info(f"Getting registries for: {identifier_name}")
            response = await self.agent_client.get(
                f"/identifiers/{identifier_name}/registries", 
                headers=self.get_auth_headers()
            )
            logger.info(f"Registries response: {response.status_code}")
            
            if response.status_code == 200:
                registries = response.json()
                logger.info(f"Found {len(registries)} registries")
                return registries
            else:
                logger.error(f"Failed to get registries: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to get registries: {e}")
            return []
    
    async def create_registry(self, identifier_name, registry_name):
        """Create a registry for credential issuance"""
        try:
            logger.info(f"Creating registry: {registry_name} for identifier: {identifier_name}")
            
            payload = {
                "name": registry_name
            }
            
            response = await self.agent_client.post(
                f"/identifiers/{identifier_name}/registries", 
                json=payload, 
                headers=self.get_auth_headers()
            )
            
            logger.info(f"Create registry response: {response.status_code}")
            
            if response.status_code in [200, 201, 202]:
                result = response.json()
                logger.info("✅ Registry created successfully")
                return result
            else:
                logger.error(f"Failed to create registry: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to create registry: {e}")
            return None
    
    async def issue_credential(self, issuer_name, registry_said, schema_said, recipient_aid, credential_data):
        """Issue credential using Veridian pattern"""
        try:
            logger.info("Issuing credential...")
            logger.info(f"Issuer: {issuer_name}")
            logger.info(f"Registry: {registry_said}")
            logger.info(f"Schema: {schema_said}")
            logger.info(f"Recipient: {recipient_aid}")
            logger.info(f"Data: {credential_data}")
            
            # First resolve the schema OOBI locally (critical step)
            logger.info("Resolving schema OOBI...")
            schema_resolved = await self.resolve_schema_oobi(schema_said)
            if not schema_resolved:
                logger.error("❌ Failed to resolve schema OOBI")
                return None
            
            payload = {
                "ri": registry_said,  # Registry identifier
                "s": schema_said,     # Schema SAID
                "a": {                # Attribute section
                    "i": recipient_aid,  # Recipient AID
                    "dt": "2025-08-28T12:00:00.000000+00:00",
                    **credential_data
                }
            }
            
            logger.info(f"Credential payload: {json.dumps(payload, indent=2)}")
            
            response = await self.agent_client.post(
                "/credentials",
                json=payload,
                headers=self.get_auth_headers()
            )
            
            logger.info(f"Issue credential response: {response.status_code}")
            
            if response.status_code in [200, 201, 202]:
                result = response.json()
                credential_said = result.get("sad", {}).get("d") or result.get("said")
                logger.info(f"✅ Credential issued successfully: {credential_said}")
                return result
            else:
                logger.error(f"❌ Failed to issue credential: {response.status_code}")
                logger.error(f"Response: {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Credential issuance failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def resolve_schema_oobi(self, schema_said):
        """Resolve schema OOBI locally"""
        try:
            # Use Veridian's schema OOBI endpoint
            schema_oobi_url = f"http://localhost:8000/api/v1/schema-oobi/oobi/{schema_said}"
            
            logger.info(f"Resolving schema OOBI: {schema_oobi_url}")
            
            async with httpx.AsyncClient() as client:
                response = await client.get(schema_oobi_url)
                if response.status_code == 200:
                    logger.info(f"✅ Schema OOBI resolved successfully")
                    return True
                else:
                    logger.error(f"❌ Failed to resolve schema OOBI: {response.status_code}")
                    return False
                    
        except Exception as e:
            logger.error(f"Schema OOBI resolution failed: {e}")
            return False
    
    async def issue_veridian_style_credential(self):
        """Issue credential using exact Veridian approach"""
        try:
            # Step 1: Boot or connect to agent
            logger.info("=== STEP 1: Boot/Connect Agent ===")
            success = await self.boot_agent()
            if not success:
                logger.error("❌ Failed to boot/connect agent")
                return None
            
            # Step 2: Get or create identifier
            logger.info("\n=== STEP 2: Get/Create Identifier ===")
            identifiers = await self.get_identifiers()
            
            issuer_identifier = None
            if identifiers:
                issuer_identifier = identifiers[0]
                logger.info(f"Using existing identifier: {issuer_identifier['name']} ({issuer_identifier['prefix']})")
            else:
                logger.info("Creating new identifier...")
                issuer_identifier = await self.create_identifier("veridian-issuer")
                if not issuer_identifier:
                    logger.error("❌ Failed to create issuer identifier")
                    return None
            
            # Step 3: Get or create registry
            logger.info("\n=== STEP 3: Get/Create Registry ===")
            registries = await self.get_registries(issuer_identifier["name"])
            
            registry = None
            if registries:
                registry = registries[0]
                logger.info(f"Using existing registry: {registry['name']} ({registry['regk']})")
            else:
                logger.info("Creating new registry...")
                registry = await self.create_registry(issuer_identifier["name"], "veridian-registry")
                if not registry:
                    logger.error("❌ Failed to create registry")
                    return None
            
            # Step 4: Create recipient identifier (for testing)
            logger.info("\n=== STEP 4: Create Recipient Identifier ===")
            recipient_identifier = await self.create_identifier("veridian-recipient")
            if not recipient_identifier:
                logger.error("❌ Failed to create recipient identifier")
                return None
            
            # Step 5: Issue credential using Veridian schema
            logger.info("\n=== STEP 5: Issue Credential ===")
            
            # Use the exact schema SAID from Veridian
            schema_said = "EN7JR2OF5JS_OBalN09UPeQPBZ_tP669iuMjuDxY4ulz"
            
            credential_data = {
                "employeeId": "VERIDIAN-STYLE-001",
                "seatPreference": "window",
                "mealPreference": "vegetarian",
                "airlines": "SAS,Lufthansa",
                "emergencyContact": "Emergency Contact +46701234567",
                "allergies": "nuts,shellfish"
            }
            
            result = await self.issue_credential(
                issuer_name=issuer_identifier["name"],
                registry_said=registry["regk"],
                schema_said=schema_said,
                recipient_aid=recipient_identifier["prefix"],
                credential_data=credential_data
            )
            
            if result:
                logger.info("\n🎉 VERIDIAN-STYLE CREDENTIAL ISSUANCE SUCCESSFUL!")
                credential_said = result.get("sad", {}).get("d") or result.get("said")
                logger.info(f"Credential SAID: {credential_said}")
                logger.info(f"Issuer AID: {issuer_identifier['prefix']}")
                logger.info(f"Recipient AID: {recipient_identifier['prefix']}")
                logger.info(f"Schema SAID: {schema_said}")
                logger.info(f"Registry SAID: {registry['regk']}")
                return credential_said
            else:
                logger.error("\n💥 VERIDIAN-STYLE CREDENTIAL ISSUANCE FAILED!")
                return None
                
        except Exception as e:
            logger.error(f"❌ Veridian-style credential issuance failed: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            await self.admin_client.aclose()
            await self.agent_client.aclose()

async def main():
    """Main function"""
    logger.info("Veridian-Style Credential Issuance")
    logger.info("=" * 40)
    
    issuer = VeridianCredentialIssuer()
    credential_said = await issuer.issue_veridian_style_credential()
    
    if credential_said:
        logger.info("\n✅ SUCCESS: Credential issued using Veridian approach!")
        logger.info(f"   Credential SAID: {credential_said}")
        logger.info("\nYou can now use this credential in your frontend application.")
    else:
        logger.error("\n❌ FAILED: Could not issue credential using Veridian approach!")

if __name__ == "__main__":
    asyncio.run(main())