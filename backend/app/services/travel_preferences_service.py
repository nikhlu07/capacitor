"""
Travel Preferences Service with Hash-Based ACDC Design
Implements minimal ACDC storage with encrypted PostgreSQL references
"""

import json
import hashlib
import base64
from typing import Dict, Any, Optional, List
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import asyncpg
import logging
from datetime import datetime

from ..core.config import settings

logger = logging.getLogger(__name__)

class TravelPreferencesService:
    """Service for managing encrypted travel preferences with hash-based ACDCs"""
    
    def __init__(self):
        self.db_pool = None
    
    async def initialize(self, db_pool):
        """Initialize with database connection pool"""
        self.db_pool = db_pool
        logger.info("Travel preferences service initialized")
    
    def _generate_preferences_hash(self, preferences_data: Dict[str, Any]) -> str:
        """Generate cryptographic hash of travel preferences for ACDC reference"""
        # Normalize data for consistent hashing
        normalized_json = json.dumps(preferences_data, sort_keys=True, separators=(',', ':'))
        hash_bytes = hashlib.sha256(normalized_json.encode('utf-8')).digest()
        return base64.b64encode(hash_bytes).decode('utf-8')
    
    def _encrypt_preferences(self, preferences_data: Dict[str, Any], employee_key: str) -> str:
        """Encrypt travel preferences with employee's key"""
        try:
            # Use employee key to derive encryption key
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'travlr-preferences-salt',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(employee_key.encode()))
            fernet = Fernet(key)
            
            # Encrypt the preferences data
            preferences_json = json.dumps(preferences_data, sort_keys=True)
            encrypted_data = fernet.encrypt(preferences_json.encode())
            
            return base64.b64encode(encrypted_data).decode()
            
        except Exception as e:
            logger.error(f"Failed to encrypt preferences: {e}")
            raise
    
    def _decrypt_preferences(self, encrypted_data: str, employee_key: str) -> Dict[str, Any]:
        """Decrypt travel preferences with employee's key"""
        try:
            # Use employee key to derive encryption key
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'travlr-preferences-salt',
                iterations=100000,
            )
            key = base64.urlsafe_b64encode(kdf.derive(employee_key.encode()))
            fernet = Fernet(key)
            
            # Decrypt the data
            encrypted_bytes = base64.b64decode(encrypted_data)
            decrypted_json = fernet.decrypt(encrypted_bytes).decode()
            
            return json.loads(decrypted_json)
            
        except Exception as e:
            logger.error(f"Failed to decrypt preferences: {e}")
            raise
    
    async def store_encrypted_preferences(self, 
                                        employee_id: str,
                                        preferences_data: Dict[str, Any],
                                        employee_key: str) -> Dict[str, str]:
        """Store encrypted travel preferences in PostgreSQL and return hash for ACDC"""
        try:
            # Generate hash for ACDC reference
            preferences_hash = self._generate_preferences_hash(preferences_data)
            
            # Encrypt the detailed preferences
            encrypted_data = self._encrypt_preferences(preferences_data, employee_key)
            
            # Store in PostgreSQL
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO travel_preferences (
                        employee_id, preferences_hash, encrypted_data, 
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $4)
                    ON CONFLICT (employee_id, preferences_hash) 
                    DO UPDATE SET 
                        encrypted_data = EXCLUDED.encrypted_data,
                        updated_at = CURRENT_TIMESTAMP
                """, employee_id, preferences_hash, encrypted_data, datetime.utcnow())
            
            logger.info(f"✅ Stored encrypted preferences for employee {employee_id}")
            
            return {
                "preferences_hash": preferences_hash,
                "employee_id": employee_id,
                "storage_location": "postgresql_encrypted"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to store encrypted preferences: {e}")
            raise
    
    async def retrieve_encrypted_preferences(self, 
                                           employee_id: str,
                                           preferences_hash: str,
                                           employee_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve and decrypt travel preferences from PostgreSQL"""
        try:
            async with self.db_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT encrypted_data FROM travel_preferences 
                    WHERE employee_id = $1 AND preferences_hash = $2
                """, employee_id, preferences_hash)
            
            if not row:
                logger.warning(f"No preferences found for {employee_id} with hash {preferences_hash[:8]}...")
                return None
            
            # Decrypt the preferences
            decrypted_data = self._decrypt_preferences(row['encrypted_data'], employee_key)
            
            logger.info(f"✅ Retrieved encrypted preferences for employee {employee_id}")
            return decrypted_data
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve encrypted preferences: {e}")
            raise
    
    def create_minimal_acdc_attributes(self, 
                                     employee_id: str,
                                     preferences_hash: str,
                                     essential_attributes: Dict[str, Any]) -> Dict[str, Any]:
        """Create minimal ACDC attributes with hash reference to detailed data"""
        try:
            # Only include essential verification attributes in ACDC
            minimal_attributes = {
                "employee_id": employee_id,
                "preferences_hash": preferences_hash,
                "data_location": "postgresql_encrypted",
                "verification_attributes": {
                    # Only essential attributes for verification
                    "has_dietary_restrictions": bool(essential_attributes.get("dietary_preferences")),
                    "requires_accessibility": bool(essential_attributes.get("accessibility_needs")),
                    "has_emergency_contact": bool(essential_attributes.get("emergency_contact")),
                    "preferred_class": essential_attributes.get("preferred_class", "economy"),
                    "travel_frequency": essential_attributes.get("travel_frequency", "occasional")
                },
                "schema_version": "1.0",
                "created_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"✅ Created minimal ACDC attributes for employee {employee_id}")
            return minimal_attributes
            
        except Exception as e:
            logger.error(f"❌ Failed to create minimal ACDC attributes: {e}")
            raise
    
    async def create_hash_based_credential(self,
                                         issuer_aid: str,
                                         recipient_aid: str,
                                         employee_id: str,
                                         full_preferences: Dict[str, Any],
                                         employee_key: str,
                                         schema_said: str) -> Dict[str, Any]:
        """Create hash-based ACDC credential with encrypted PostgreSQL storage"""
        try:
            # Store encrypted detailed preferences in PostgreSQL
            storage_result = await self.store_encrypted_preferences(
                employee_id, full_preferences, employee_key
            )
            
            # Extract essential attributes for ACDC
            essential_attributes = {
                "dietary_preferences": full_preferences.get("dietary_preferences"),
                "accessibility_needs": full_preferences.get("accessibility_needs"),
                "emergency_contact": bool(full_preferences.get("emergency_contact")),
                "preferred_class": full_preferences.get("preferred_class", "economy"),
                "travel_frequency": full_preferences.get("travel_frequency", "occasional")
            }
            
            # Create minimal ACDC attributes
            minimal_attributes = self.create_minimal_acdc_attributes(
                employee_id, storage_result["preferences_hash"], essential_attributes
            )
            
            logger.info(f"✅ Created hash-based credential for employee {employee_id}")
            
            return {
                "acdc_attributes": minimal_attributes,
                "storage_reference": storage_result,
                "issuer_aid": issuer_aid,
                "recipient_aid": recipient_aid,
                "schema_said": schema_said,
                "architecture": "hash_based_minimal_acdc"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create hash-based credential: {e}")
            raise
    
    async def verify_preferences_integrity(self, 
                                         employee_id: str,
                                         preferences_hash: str,
                                         employee_key: str) -> Dict[str, Any]:
        """Verify integrity of stored encrypted preferences"""
        try:
            # Retrieve encrypted preferences
            decrypted_data = await self.retrieve_encrypted_preferences(
                employee_id, preferences_hash, employee_key
            )
            
            if not decrypted_data:
                return {"valid": False, "error": "Preferences not found"}
            
            # Recalculate hash to verify integrity
            recalculated_hash = self._generate_preferences_hash(decrypted_data)
            
            integrity_valid = (recalculated_hash == preferences_hash)
            
            result = {
                "valid": integrity_valid,
                "employee_id": employee_id,
                "preferences_hash": preferences_hash,
                "recalculated_hash": recalculated_hash,
                "integrity_check": "passed" if integrity_valid else "failed"
            }
            
            if integrity_valid:
                logger.info(f"✅ Preferences integrity verified for employee {employee_id}")
            else:
                logger.error(f"❌ Preferences integrity check failed for employee {employee_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Failed to verify preferences integrity: {e}")
            return {"valid": False, "error": str(e)}
    
    async def create_context_card_from_hash(self,
                                          employee_id: str,
                                          preferences_hash: str,
                                          employee_key: str,
                                          approved_fields: List[str],
                                          company_aid: str) -> Dict[str, Any]:
        """Create context card by retrieving and filtering encrypted preferences"""
        try:
            # Retrieve full encrypted preferences
            full_preferences = await self.retrieve_encrypted_preferences(
                employee_id, preferences_hash, employee_key
            )
            
            if not full_preferences:
                raise ValueError(f"Preferences not found for hash {preferences_hash[:8]}...")
            
            # Filter to approved fields only
            filtered_preferences = {
                field: full_preferences.get(field)
                for field in approved_fields
                if field in full_preferences
            }
            
            # Generate context card hash
            context_hash = self._generate_preferences_hash(filtered_preferences)
            
            logger.info(f"✅ Created context card from hash for company {company_aid}")
            
            return {
                "context_data": filtered_preferences,
                "context_hash": context_hash,
                "source_hash": preferences_hash,
                "approved_fields": approved_fields,
                "company_aid": company_aid,
                "employee_id": employee_id
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to create context card from hash: {e}")
            raise

# Global instance
travel_preferences_service = TravelPreferencesService()
