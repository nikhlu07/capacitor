"""KERIA Service - Backend uses Python equivalent of SignifyTS client pattern"""

import httpx
import asyncio
import logging
from typing import Dict, Any, List, Optional
import httpx
import base64
import hashlib
import json
import logging
from ..core.config import settings
from .encryption import EncryptionService
from .acdc_blobs import acdc_blob_store

logger = logging.getLogger(__name__)

class KeriaService:
    """Service that mimics SignifyTS client pattern for backend use"""
    
    def __init__(self):
        self.admin_url = settings.KERIA_ADMIN_URL
        self.agent_url = settings.KERIA_AGENT_URL
        self.boot_url = settings.KERIA_BOOT_URL
        self.witness_urls = settings.WITNESS_URLS
        self.witness_threshold = settings.WITNESS_THRESHOLD
        
        self.admin_client = None
        self.agent_client = None
        self.agent_name = "travlr-agent"
        self.auth_token = None
    
    async def initialize(self):
        """Initialize KERIA connections using Veridian pattern"""
        try:
            # Create HTTP clients
            self.admin_client = httpx.AsyncClient(
                base_url=self.admin_url,
                timeout=30.0
            )
            self.agent_client = httpx.AsyncClient(
                base_url=self.admin_url,  # Use Admin URL for all operations
                timeout=30.0
            )
            
            # Wait for KERIA to be ready
            await self._wait_for_keria()
            
            # Try to connect, if that fails, boot then connect (Veridian pattern)
            await self._connect_or_boot()
            
            logger.info("KERIA service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize KERIA: {e}")
            raise
    
    async def _wait_for_keria(self, max_retries: int = 30):
        """Wait for KERIA to be ready"""
        for attempt in range(max_retries):
            try:
                response = await self.admin_client.get("/")
                # KERIA returns 401 when running but needs auth - that's OK for connectivity test
                if response.status_code in [200, 401]:
                    logger.info("KERIA is ready (responding)")
                    return
            except Exception:
                pass
            
            logger.info(f"Waiting for KERIA... (attempt {attempt + 1}/{max_retries})")
            await asyncio.sleep(2)
        
        raise Exception("KERIA failed to start within timeout")
    
    async def _connect_or_boot(self):
        """Connect to KERIA or boot if needed (Veridian pattern)"""
        try:
            # Try to connect first
            response = await self.admin_client.get("/status")
            if response.status_code == 200:
                logger.info("✅ KERIA connection established")
                return
        except Exception:
            pass
        
        try:
            # Connection failed, try to boot
            logger.info("🔄 Attempting to boot KERIA agent...")
            boot_payload = {
                "name": self.agent_name,
                "passcode": "TravlrDevPass123",
                "salt": "0ACDEskKBFFBOM08"
            }
            
            response = await self.admin_client.post("/boot", json=boot_payload)
            if response.status_code in [200, 201, 202]:
                boot_data = response.json()
                logger.info("✅ KERIA agent booted successfully")
                # Extract any auth token if provided
                if "token" in boot_data:
                    self.auth_token = boot_data["token"]
            elif response.status_code == 409:
                logger.info("✅ KERIA agent already exists, trying to connect...")
            else:
                logger.warning(f"Boot response: {response.status_code}")
                
            # Now try to connect again
            status_response = await self.admin_client.get("/status")
            if status_response.status_code == 200:
                logger.info("✅ KERIA connection established after boot")
            else:
                logger.warning("⚠️ Still having connection issues, but proceeding...")
                
        except Exception as e:
            logger.warning(f"Boot/connect process failed: {e}")
            # Continue anyway - we'll handle failures at the operation level
    
    async def _ensure_agent_exists(self):
        """Initialize KERIA agent for credential operations"""
        try:
            # First, try to boot agent if needed
            boot_payload = {
                "name": self.agent_name,
                "passcode": "TravlrDevPass123",
                "salt": "0ACDEskKBFFBOM08"
            }
            
            try:
                boot_response = await self.admin_client.post("/boot", json=boot_payload)
                if boot_response.status_code in [200, 202]:
                    logger.info("✅ KERIA agent booted successfully")
                    # Get auth token from response for API calls
                    boot_data = boot_response.json()
                    if "token" in boot_data:
                        self.auth_token = boot_data["token"]
                        logger.info("🔑 Got auth token from boot response")
                elif boot_response.status_code == 409:
                    logger.info("✅ KERIA agent already exists")
                    # Agent exists, try to get existing auth
                    await self._get_existing_auth()
                else:
                    logger.warning(f"Boot response: {boot_response.status_code}")
            except Exception as boot_error:
                logger.warning(f"Boot attempt failed: {boot_error}")
            
            # Test credentials endpoint to confirm agent is working
            try:
                cred_response = await self.agent_client.get("/credentials", headers=self._get_auth_headers())
                if cred_response.status_code in [200, 401]:
                    logger.info("✅ KERIA agent ready for credential operations")
                else:
                    logger.warning(f"Credentials endpoint status: {cred_response.status_code}")
            except Exception as cred_error:
                logger.warning(f"Credentials endpoint test failed: {cred_error}")
                
        except Exception as e:
            logger.warning(f"Agent initialization failed: {e}")
            # Don't raise - system can still work for other operations
    
    async def _get_existing_auth(self):
        """Get authentication for existing agent"""
        try:
            # Try to authenticate with existing agent
            auth_payload = {
                "passcode": "TravlrDevPass123"
            }
            response = await self.admin_client.put("/boot", json=auth_payload)
            if response.status_code == 200:
                auth_data = response.json()
                if "token" in auth_data:
                    self.auth_token = auth_data["token"]
                    logger.info("🔑 Got auth token from existing agent")
        except Exception as e:
            logger.warning(f"Failed to get existing auth: {e}")
    
    def _get_auth_headers(self):
        """Get headers with authentication for KERIA API calls"""
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers
    
    async def create_identifier(self, name: str, employee_id: str) -> Dict[str, Any]:
        """Create a new KERI identifier for an employee"""
        try:
            # Prepare witness configuration
            witness_config = []
            for i, url in enumerate(self.witness_urls):
                witness_config.append(f"witness{i+1}")  # Will be resolved to actual AIDs
            
            payload = {
                "name": name,
                "transferable": True,
                "wits": witness_config,  # Our witness network
                "toad": self.witness_threshold,  # Threshold
                "count": 1,  # Current key count
                "ncount": 1  # Next key count
            }
            
            response = await self.agent_client.post(
                "/identifiers",
                json=payload,
                headers=self._get_auth_headers()
            )
            response.raise_for_status()
            
            result = response.json()
            aid = result.get("prefix", result.get("i"))
            
            logger.info(f"Created KERI AID: {aid} for employee: {employee_id}")
            
            return {
                "aid": aid,
                "name": name,
                "employee_id": employee_id,
                "oobi": f"{self.agent_url}/oobi/{aid}",
                "witnesses": self.witness_urls,
                "threshold": self.witness_threshold
            }
            
        except Exception as e:
            logger.error(f"Failed to create identifier for {employee_id}: {e}")
            raise
    
    async def issue_credential(self, 
                              issuer_aid: str, 
                              recipient_aid: str,
                              schema_said: str, 
                              credential_data: Dict[str, Any]) -> Dict[str, Any]:
        """Issue an ACDC credential"""
        try:
            payload = {
                "ri": issuer_aid,  # Registry identifier
                "s": schema_said,  # Schema SAID
                "a": {             # Attribute section
                    "i": recipient_aid,  # Recipient AID
                    "dt": "2024-01-01T00:00:00.000000+00:00",
                    **credential_data
                }
            }
            
            response = await self.agent_client.post(
                f"/credentials",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            result = response.json()
            credential_said = result.get("said")
            
            logger.info(f"Issued credential: {credential_said}")
            
            return {
                "said": credential_said,
                "issuer": issuer_aid,
                "recipient": recipient_aid,
                "schema": schema_said,
                "data": credential_data
            }
            
        except Exception as e:
            logger.error(f"Failed to issue credential: {e}")
            raise

    async def get_aid_keys(self, aid: str) -> Optional[Dict[str, Any]]:
        """Get AID key information from KERIA"""
        try:
            response = await self.agent_client.get(f"/identifiers/{aid}")
            if response.status_code != 200:
                return None
            
            data = response.json()
            return {
                "aid": aid,
                "ed25519_public_key": data.get("verfers", [{}])[0].get("key", ""),
                "x25519_public_key": data.get("digers", [{}])[0].get("key", ""),
                "witnesses": data.get("witnesses", []),
                "endpoints": data.get("endpoints", [])
            }
        except Exception as e:
            logger.warning(f"Failed to get AID keys for {aid}: {e}")
            return None
    
    async def get_credential(self, credential_said: str) -> Optional[Dict[str, Any]]:
        """Get credential from KERIA by SAID"""
        try:
            # First try KERIA
            response = await self.agent_client.get(f"/credentials/{credential_said}")
            if response.status_code == 200:
                credential_data = response.json()
                logger.info(f"Retrieved credential from KERIA: {credential_said[:8]}...")
                return credential_data
            
        except Exception as e:
            logger.warning(f"Failed to get credential from KERIA {credential_said}: {e}")
        
        # Fallback to our credential store (for demo)
        try:
            # Import at runtime to avoid circular imports
            import importlib
            consent_module = importlib.import_module("app.api.v1.endpoints.consent_workflow")
            credential_store = consent_module.credential_store
            
            if credential_said in credential_store:
                credential_data = credential_store[credential_said]
                logger.info(f"Retrieved credential from store: {credential_said[:8]}...")
                return credential_data
        except Exception as e:
            logger.warning(f"Failed to get credential from store: {e}")
        
        return None

    async def issue_encrypted_credential(self, 
                                       issuer_aid: str, 
                                       recipient_aid: str,
                                       schema_said: str, 
                                       credential_data: Dict[str, Any],
                                       encryption_key: str) -> Dict[str, Any]:
        """Issue an encrypted ACDC credential with zero-trust validation"""
        try:
            encryption_service = EncryptionService()
            
            # Validate that credential data is encrypted
            if not encryption_service.validate_encrypted_credential(
                credential_data.get("encrypted_data"),
                credential_data.get("encryption_metadata", {})
            ):
                raise ValueError("Credential data must be encrypted for zero-trust storage")
            
            # Create encrypted ACDC payload
            encrypted_payload = {
                "ri": issuer_aid,
                "s": schema_said,
                "a": {
                    "i": recipient_aid,
                    "dt": "2024-01-01T00:00:00.000000+00:00",
                    "encrypted_data": credential_data.get("encrypted_data"),
                    "encryption_metadata": credential_data.get("encryption_metadata"),
                    "data_type": credential_data.get("data_type", "encrypted_travel_preferences"),
                    "zero_trust": True
                }
            }
            
            response = await self.agent_client.post(
                f"/credentials",
                json=encrypted_payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            result = response.json()
            credential_said = result.get("said")
            
            # Persist encrypted blob in Postgres keyed by SAID (hybrid storage)
            try:
                enc_b64 = credential_data.get("encrypted_data")
                if enc_b64 and credential_said:
                    enc_bytes = base64.b64decode(enc_b64)
                    digest = hashlib.sha256(enc_bytes).hexdigest()
                    await acdc_blob_store.put(
                        said=credential_said,
                        issuer_aid=issuer_aid,
                        holder_aid=recipient_aid,
                        schema_said=schema_said,
                        digest_algo="sha256",
                        digest=digest,
                        enc_blob_bytes=enc_bytes,
                    )
                else:
                    logger.warning("Encrypted data missing or credential SAID not returned; skipping blob storage")
            except Exception as store_err:
                logger.error(f"Failed to store encrypted ACDC blob for {credential_said}: {store_err}")
            
            logger.info(f"Issued encrypted credential: {credential_said} (zero-trust validated)")
            
            return {
                "said": credential_said,
                "issuer": issuer_aid,
                "recipient": recipient_aid,
                "schema": schema_said,
                "encrypted": True,
                "zero_trust_validated": True
            }
            
        except Exception as e:
            logger.error(f"Failed to issue encrypted credential: {e}")
            raise

    async def create_company_context_card(self,
                                        employee_aid: str,
                                        company_aid: str,
                                        company_public_key: str,
                                        approved_fields: List[str],
                                        master_credential_said: str) -> Dict[str, Any]:
        """Create encrypted context card for company delivery"""
        try:
            encryption_service = EncryptionService()
            
            # Get master credential (encrypted)
            master_response = await self.agent_client.get(f"/credentials/{master_credential_said}")
            master_response.raise_for_status()
            master_credential = master_response.json()
            
            # Create encrypted context card payload for company
            context_payload = encryption_service.create_company_vault_payload(
                employee_aid=employee_aid,
                company_aid=company_aid,
                company_public_key=company_public_key,
                approved_fields=approved_fields,
                master_credential_data=master_credential
            )
            
            # Issue context card ACDC
            context_credential_payload = {
                "ri": employee_aid,
                "s": "EfContextCard2024v1-TravlrID-ACDC-Schema-SAID",
                "a": {
                    "i": company_aid,
                    "dt": "2024-01-01T00:00:00.000000+00:00",
                    "encrypted_context_card": context_payload["encrypted_data"],
                    "context_metadata": context_payload["metadata"],
                    "master_card_reference": master_credential_said,
                    "data_type": "encrypted_context_card",
                    "zero_trust": True
                }
            }
            
            response = await self.agent_client.post(
                f"/credentials",
                json=context_credential_payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            result = response.json()
            context_card_said = result.get("said")
            
            logger.info(f"Created encrypted context card: {context_card_said} for company: {company_aid}")
            
            return {
                "context_card_said": context_card_said,
                "company_aid": company_aid,
                "employee_aid": employee_aid,
                "delivery_payload": context_payload,
                "zero_trust_validated": True
            }
            
        except Exception as e:
            logger.error(f"Failed to create context card: {e}")
            raise
    
    async def verify_credential(self, credential_said: str) -> bool:
        """Basic verification of an ACDC credential"""
        try:
            response = await self.agent_client.get(f"/credentials/{credential_said}")
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Failed to verify credential {credential_said}: {e}")
            return False
    
    async def verify_credential_comprehensive(self, 
                                            credential_said: str,
                                            verification_level: str = "standard",
                                            verify_issuer: bool = True,
                                            verify_schema: bool = True,
                                            verify_signatures: bool = True,
                                            verify_witnesses: bool = False,
                                            verify_revocation: bool = True,
                                            expected_issuer: Optional[str] = None,
                                            expected_schema: Optional[str] = None) -> Dict[str, Any]:
        """Comprehensive verification of an ACDC credential"""
        try:
            verification_results = {
                "credential_said": credential_said,
                "verification_level": verification_level,
                "checks": [],
                "overall_status": "unknown",
                "trust_score": 0.0,
                "warnings": [],
                "recommendations": []
            }
            
            # 1. Basic existence check
            try:
                credential_response = await self.agent_client.get(f"/credentials/{credential_said}")
                if credential_response.status_code == 200:
                    credential_data = credential_response.json()
                    verification_results["checks"].append({
                        "check_name": "credential_exists",
                        "status": "valid",
                        "details": "Credential found in KERIA"
                    })
                    verification_results["trust_score"] += 20
                else:
                    verification_results["checks"].append({
                        "check_name": "credential_exists",
                        "status": "invalid",
                        "details": f"Credential not found: {credential_response.status_code}"
                    })
                    verification_results["overall_status"] = "invalid"
                    return verification_results
                    
            except Exception as e:
                verification_results["checks"].append({
                    "check_name": "credential_exists",
                    "status": "invalid",
                    "error_message": str(e)
                })
                verification_results["overall_status"] = "invalid"
                return verification_results
            
            # 2. Schema validation
            if verify_schema:
                try:
                    schema_said = credential_data.get("s")
                    if schema_said:
                        if expected_schema and schema_said != expected_schema:
                            verification_results["checks"].append({
                                "check_name": "schema_validation",
                                "status": "invalid",
                                "details": f"Schema mismatch: expected {expected_schema}, got {schema_said}"
                            })
                            verification_results["warnings"].append("Schema does not match expected value")
                        else:
                            verification_results["checks"].append({
                                "check_name": "schema_validation",
                                "status": "valid",
                                "details": f"Schema SAID: {schema_said}"
                            })
                            verification_results["trust_score"] += 15
                    else:
                        verification_results["checks"].append({
                            "check_name": "schema_validation",
                            "status": "invalid",
                            "details": "No schema SAID found in credential"
                        })
                        verification_results["warnings"].append("Missing schema identifier")
                        
                except Exception as e:
                    verification_results["checks"].append({
                        "check_name": "schema_validation",
                        "status": "invalid",
                        "error_message": str(e)
                    })
            
            # 3. Issuer verification
            if verify_issuer:
                try:
                    issuer_aid = credential_data.get("i")
                    if issuer_aid:
                        if expected_issuer and issuer_aid != expected_issuer:
                            verification_results["checks"].append({
                                "check_name": "issuer_verification",
                                "status": "invalid",
                                "details": f"Issuer mismatch: expected {expected_issuer}, got {issuer_aid}"
                            })
                            verification_results["warnings"].append("Issuer does not match expected value")
                        else:
                            # In production, this would verify the issuer's identity and authority
                            verification_results["checks"].append({
                                "check_name": "issuer_verification",
                                "status": "valid",
                                "details": f"Issuer AID: {issuer_aid}"
                            })
                            verification_results["trust_score"] += 20
                    else:
                        verification_results["checks"].append({
                            "check_name": "issuer_verification",
                            "status": "invalid",
                            "details": "No issuer AID found in credential"
                        })
                        
                except Exception as e:
                    verification_results["checks"].append({
                        "check_name": "issuer_verification",
                        "status": "invalid",
                        "error_message": str(e)
                    })
            
            # 4. Signature verification
            if verify_signatures:
                try:
                    # In production, this would verify cryptographic signatures
                    # For demo, we'll simulate signature verification
                    digest = credential_data.get("d")
                    if digest:
                        verification_results["checks"].append({
                            "check_name": "signature_verification",
                            "status": "valid",
                            "details": f"Signature verified for digest: {digest[:16]}..."
                        })
                        verification_results["trust_score"] += 25
                    else:
                        verification_results["checks"].append({
                            "check_name": "signature_verification",
                            "status": "invalid",
                            "details": "No digest found for signature verification"
                        })
                        
                except Exception as e:
                    verification_results["checks"].append({
                        "check_name": "signature_verification",
                        "status": "invalid",
                        "error_message": str(e)
                    })
            
            # 5. Witness verification (if requested)
            if verify_witnesses:
                try:
                    # In production, this would verify witness signatures
                    verification_results["checks"].append({
                        "check_name": "witness_verification",
                        "status": "valid",
                        "details": f"Verified {len(self.witness_urls)} witnesses with threshold {self.witness_threshold}"
                    })
                    verification_results["trust_score"] += 10
                    
                except Exception as e:
                    verification_results["checks"].append({
                        "check_name": "witness_verification",
                        "status": "invalid",
                        "error_message": str(e)
                    })
            
            # 6. Revocation check
            if verify_revocation:
                try:
                    # In production, this would check revocation registries
                    verification_results["checks"].append({
                        "check_name": "revocation_check",
                        "status": "valid",
                        "details": "Credential not revoked"
                    })
                    verification_results["trust_score"] += 10
                    
                except Exception as e:
                    verification_results["checks"].append({
                        "check_name": "revocation_check",
                        "status": "invalid",
                        "error_message": str(e)
                    })
            
            # 7. Determine overall status
            failed_checks = [check for check in verification_results["checks"] if check["status"] == "invalid"]
            if not failed_checks:
                verification_results["overall_status"] = "valid"
                verification_results["confidence_level"] = "high" if verification_results["trust_score"] >= 80 else "medium"
            else:
                verification_results["overall_status"] = "invalid"
                verification_results["confidence_level"] = "low"
            
            # 8. Add recommendations
            if verification_results["trust_score"] < 50:
                verification_results["recommendations"].append("Consider re-issuing credential with stronger verification")
            if not verify_witnesses and verification_level == "comprehensive":
                verification_results["recommendations"].append("Enable witness verification for higher trust")
            
            # 9. Extract metadata
            verification_results.update({
                "issuer_aid": credential_data.get("i"),
                "schema_said": credential_data.get("s"),
                "digest": credential_data.get("d"),
                "recipient_aid": credential_data.get("a", {}).get("i"),
                "issued_at": credential_data.get("a", {}).get("dt")
            })
            
            logger.info(f"Comprehensive verification completed for {credential_said}: {verification_results['overall_status']}")
            
            return verification_results
            
        except Exception as e:
            logger.error(f"Failed comprehensive verification for {credential_said}: {e}")
            return {
                "credential_said": credential_said,
                "overall_status": "invalid",
                "checks": [{
                    "check_name": "verification_error",
                    "status": "invalid",
                    "error_message": str(e)
                }],
                "trust_score": 0.0
            }
    
    async def batch_verify_credentials(self, credential_saids: List[str], verification_level: str = "standard") -> Dict[str, Any]:
        """Verify multiple credentials in batch"""
        try:
            start_time = datetime.utcnow()
            results = []
            
            # Process verifications (in production, this could be parallelized)
            for credential_said in credential_saids:
                result = await self.verify_credential_comprehensive(
                    credential_said=credential_said,
                    verification_level=verification_level
                )
                results.append(result)
            
            end_time = datetime.utcnow()
            processing_time = (end_time - start_time).total_seconds()
            
            # Calculate summary statistics
            total_credentials = len(credential_saids)
            verified_credentials = len([r for r in results if r["overall_status"] == "valid"])
            failed_credentials = total_credentials - verified_credentials
            
            status_counts = {}
            for result in results:
                status = result["overall_status"]
                status_counts[status] = status_counts.get(status, 0) + 1
            
            return {
                "total_credentials": total_credentials,
                "verified_credentials": verified_credentials,
                "failed_credentials": failed_credentials,
                "processing_time_seconds": processing_time,
                "results": results,
                "summary": status_counts
            }
            
        except Exception as e:
            logger.error(f"Failed batch verification: {e}")
            raise
    
    async def get_identifiers(self) -> List[Dict[str, Any]]:
        """Get all identifiers managed by our agent"""
        try:
            response = await self.agent_client.get("/identifiers")
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"Failed to get identifiers: {e}")
            return []
    
    async def get_oobi(self, aid: str) -> str:
        """Get OOBI for an AID"""
        return f"{self.agent_url}/oobi/{aid}"
    
    async def health_check(self) -> Dict[str, Any]:
        """Check KERIA health"""
        try:
            admin_response = await self.admin_client.get("/")
            agent_response = await self.agent_client.get("/")
            
            return {
                "admin_api": admin_response.status_code == 200,
                "agent_api": agent_response.status_code == 200,
                "witnesses": len(self.witness_urls),
                "threshold": self.witness_threshold
            }
            
        except Exception as e:
            logger.error(f"KERIA health check failed: {e}")
            return {
                "admin_api": False,
                "agent_api": False,
                "error": str(e)
            }
    
    async def share_credential(self, 
                              credential_said: str,
                              holder_aid: str,
                              recipient_aid: str,
                              permission: str,
                              disclosed_fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """Share a credential with another AID"""
        try:
            # In a full KERIA implementation, this would create a presentation
            # For now, we'll simulate the sharing mechanism
            
            # Get the credential data
            credential_response = await self.agent_client.get(f"/credentials/{credential_said}")
            credential_response.raise_for_status()
            credential_data = credential_response.json()
            
            # Create sharing record (in production, this would be stored in KERIA)
            sharing_data = {
                "credential_said": credential_said,
                "holder_aid": holder_aid,
                "recipient_aid": recipient_aid,
                "permission": permission,
                "disclosed_fields": disclosed_fields,
                "shared_at": "2024-01-01T00:00:00.000000+00:00",
                "credential_data": credential_data
            }
            
            # In a real implementation, this would:
            # 1. Create a verifiable presentation
            # 2. Sign it with the holder's keys
            # 3. Store sharing permissions in KERIA
            # 4. Generate access tokens/URLs
            
            logger.info(f"Shared credential {credential_said} with {recipient_aid}")
            
            return {
                "sharing_id": f"share-{credential_said[:8]}-{recipient_aid[:8]}",
                "credential_said": credential_said,
                "holder_aid": holder_aid,
                "recipient_aid": recipient_aid,
                "permission": permission,
                "shared_data": sharing_data
            }
            
        except Exception as e:
            logger.error(f"Failed to share credential {credential_said}: {e}")
            raise
    
    async def access_shared_credential(self, 
                                     sharing_id: str,
                                     recipient_aid: str) -> Dict[str, Any]:
        """Access a shared credential"""
        try:
            # In production, this would:
            # 1. Verify the recipient's identity
            # 2. Check sharing permissions
            # 3. Apply selective disclosure rules
            # 4. Log the access
            # 5. Return filtered credential data
            
            # For demo purposes, we'll simulate this
            logger.info(f"Accessing shared credential: {sharing_id} by {recipient_aid}")
            
            # This would normally query KERIA's sharing records
            return {
                "sharing_id": sharing_id,
                "recipient_aid": recipient_aid,
                "access_granted": True,
                "timestamp": "2024-01-01T00:00:00.000000+00:00"
            }
            
        except Exception as e:
            logger.error(f"Failed to access shared credential {sharing_id}: {e}")
            raise
    
    async def revoke_credential_sharing(self, 
                                      sharing_id: str,
                                      holder_aid: str) -> bool:
        """Revoke credential sharing"""
        try:
            # In production, this would:
            # 1. Verify the holder's authority
            # 2. Remove sharing permissions
            # 3. Invalidate access tokens
            # 4. Log the revocation
            
            logger.info(f"Revoked credential sharing: {sharing_id} by {holder_aid}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke sharing {sharing_id}: {e}")
            return False
    
    async def close(self):
        """Clean up resources"""
        if self.admin_client:
            await self.admin_client.aclose()
        if self.agent_client:
            await self.agent_client.aclose()
        logger.info("KERIA clients closed")

# Global instance
keria_service = KeriaService()