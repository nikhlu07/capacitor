"""
Hybrid Storage Service: ACDC in LMDB + Data in PostgreSQL
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from app.services.keria import keria_service

logger = logging.getLogger(__name__)

class HybridStorageService:
    """
    Manages hybrid storage where:
    - ACDC credentials with hashes are stored in LMDB (via KERIA)
    - Actual encrypted data is stored in PostgreSQL
    - Hash links ACDC → PostgreSQL record
    """
    
    async def create_master_card_acdc(
        self, 
        employee_aid: str, 
        postgres_record_id: str,
        encrypted_data_hash: str,
        profile_completeness: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Create ACDC credential for master card in KERIA
        Links to PostgreSQL record via hash
        """
        try:
            logger.info(f"Creating master card ACDC for employee {employee_aid[:8]}...")
            
            # Create ACDC credential data (metadata only, no actual travel data)
            acdc_data = {
                "employee_aid": employee_aid,
                "data_type": "master_travel_card",
                "postgres_record_id": postgres_record_id,
                "encrypted_data_hash": encrypted_data_hash,
                "profile_completeness": profile_completeness,
                "created_at": datetime.utcnow().isoformat(),
                "schema_type": "travel_preferences_master",
                "version": "1.0"
            }
            
            # Generate real schema SAID for master travel card
            from app.core.keri_utils import generate_schema_said
            schema_said = generate_schema_said("travlr_master_travel_preferences", "1.0")
            
            # Issue ACDC through KERIA (stores in LMDB)
            acdc_result = await keria_service.issue_credential(
                issuer_aid=employee_aid,  # Employee issues their own master card
                subject_aid=employee_aid,  # Employee is the subject
                schema_said=schema_said,
                credential_data=acdc_data
            )
            
            logger.info(f"✅ Master card ACDC created: {acdc_result.get('credential_said')}")
            return {
                "acdc_said": acdc_result.get("credential_said"),
                "acdc_data": acdc_data,
                "postgres_link": postgres_record_id
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create master card ACDC: {str(e)}")
            raise
    
    async def create_context_card_acdc(
        self,
        employee_aid: str,
        company_aid: str,
        postgres_record_id: str,
        encrypted_data_hash: str,
        shared_fields: list,
        master_acdc_said: str,
        purpose: str
    ) -> Dict[str, Any]:
        """
        Create ACDC credential for context card in KERIA
        Links to PostgreSQL record and master ACDC
        """
        try:
            logger.info(f"Creating context card ACDC for employee {employee_aid[:8]} → company {company_aid[:8]}...")
            
            # Create context card ACDC data (selective disclosure metadata)
            acdc_data = {
                "employee_aid": employee_aid,
                "company_aid": company_aid,
                "data_type": "context_travel_card",
                "postgres_record_id": postgres_record_id,
                "encrypted_data_hash": encrypted_data_hash,
                "shared_fields": shared_fields,
                "master_acdc_said": master_acdc_said,
                "purpose": purpose,
                "created_at": datetime.utcnow().isoformat(),
                "schema_type": "travel_preferences_context",
                "version": "1.0"
            }
            
            # Generate real schema SAID for context travel card
            schema_said = generate_schema_said("travlr_context_travel_preferences", "1.0")
            
            # Issue ACDC through KERIA (stores in LMDB)
            acdc_result = await keria_service.issue_credential(
                issuer_aid=employee_aid,  # Employee issues the context card
                subject_aid=company_aid,  # Company is the subject/recipient
                schema_said=schema_said,
                credential_data=acdc_data
            )
            
            logger.info(f"✅ Context card ACDC created: {acdc_result.get('credential_said')}")
            return {
                "acdc_said": acdc_result.get("credential_said"), 
                "acdc_data": acdc_data,
                "postgres_link": postgres_record_id
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create context card ACDC: {str(e)}")
            raise
    
    async def resolve_acdc_to_postgres(self, acdc_said: str) -> Optional[Dict[str, Any]]:
        """
        Resolve ACDC hash to PostgreSQL record
        1. Get ACDC from KERIA/LMDB
        2. Extract postgres_record_id
        3. Return linking information
        """
        try:
            logger.info(f"Resolving ACDC {acdc_said[:8]}... to PostgreSQL record")
            
            # Get ACDC from KERIA
            acdc_credential = await keria_service.get_credential(acdc_said)
            if not acdc_credential:
                logger.warning(f"ACDC {acdc_said} not found in KERIA")
                return None
            
            # Extract PostgreSQL linking info from ACDC
            credential_data = acdc_credential.get("credential_data", {})
            postgres_record_id = credential_data.get("postgres_record_id")
            data_type = credential_data.get("data_type")
            encrypted_data_hash = credential_data.get("encrypted_data_hash")
            
            if not postgres_record_id:
                logger.error(f"No PostgreSQL record ID found in ACDC {acdc_said}")
                return None
            
            logger.info(f"✅ ACDC resolved: {acdc_said[:8]}... → PostgreSQL record {postgres_record_id}")
            return {
                "postgres_record_id": postgres_record_id,
                "data_type": data_type,
                "encrypted_data_hash": encrypted_data_hash,
                "acdc_metadata": credential_data
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to resolve ACDC to PostgreSQL: {str(e)}")
            raise
    
    async def verify_acdc_integrity(self, acdc_said: str, postgres_data_hash: str) -> bool:
        """
        Verify that ACDC hash matches PostgreSQL data hash
        Ensures data integrity between LMDB and PostgreSQL
        """
        try:
            resolution = await self.resolve_acdc_to_postgres(acdc_said)
            if not resolution:
                return False
            
            acdc_hash = resolution.get("encrypted_data_hash")
            integrity_match = acdc_hash == postgres_data_hash
            
            if integrity_match:
                logger.info(f"✅ ACDC integrity verified for {acdc_said[:8]}...")
            else:
                logger.warning(f"⚠️ ACDC integrity mismatch for {acdc_said[:8]}...")
            
            return integrity_match
            
        except Exception as e:
            logger.error(f"❌ Failed to verify ACDC integrity: {str(e)}")
            return False
    
    async def get_employee_acdcs(self, employee_aid: str) -> list:
        """
        Get all ACDCs issued by an employee (master + context cards)
        """
        try:
            # Get all credentials issued by this employee
            credentials = await keria_service.list_credentials(issuer_aid=employee_aid)
            
            # Filter for travel card ACDCs
            travel_acdcs = []
            for cred in credentials:
                cred_data = cred.get("credential_data", {})
                if cred_data.get("data_type") in ["master_travel_card", "context_travel_card"]:
                    travel_acdcs.append(cred)
            
            logger.info(f"Found {len(travel_acdcs)} travel ACDCs for employee {employee_aid[:8]}...")
            return travel_acdcs
            
        except Exception as e:
            logger.error(f"❌ Failed to get employee ACDCs: {str(e)}")
            return []
    
    async def revoke_context_card_acdc(self, acdc_said: str, employee_aid: str) -> bool:
        """
        Revoke context card ACDC in KERIA
        (PostgreSQL record can be marked as inactive separately)
        """
        try:
            logger.info(f"Revoking context card ACDC {acdc_said[:8]}...")
            
            result = await keria_service.revoke_credential(
                credential_said=acdc_said,
                issuer_aid=employee_aid
            )
            
            logger.info(f"✅ Context card ACDC revoked: {acdc_said[:8]}...")
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to revoke ACDC: {str(e)}")
            return False

# Global instance
hybrid_storage = HybridStorageService()

def calculate_data_hash(data: str) -> str:
    """Calculate hash of encrypted data for integrity verification"""
    import hashlib
    return hashlib.sha256(data.encode()).hexdigest()