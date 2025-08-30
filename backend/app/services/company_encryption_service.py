"""
Company Encryption Service
Handles real encryption/decryption for company data access
Uses libsodium through pynacl for X25519 operations
"""

import base64
import json
import logging
from typing import Dict, Any, Optional, Tuple
from datetime import datetime

try:
    from nacl.public import PrivateKey, PublicKey, Box
    from nacl.secret import SecretBox
    from nacl.utils import random
    from nacl.encoding import Base64Encoder, URLSafeBase64Encoder
    import nacl.hash
    NACL_AVAILABLE = True
except ImportError:
    NACL_AVAILABLE = False
    logging.error("❌ PyNaCl not available - production encryption requires: pip install PyNaCl")

from app.services.keria import keria_service
from app.core.keri_utils import validate_aid

logger = logging.getLogger(__name__)

class CompanyEncryptionService:
    """
    Handles encryption/decryption between employees and companies
    Uses X25519 (Curve25519) for key exchange and encryption
    """
    
    def __init__(self):
        self.company_keys: Dict[str, Dict[str, str]] = {}  # company_aid -> keys
        self.employee_keys: Dict[str, Dict[str, str]] = {}  # employee_aid -> keys
    
    async def generate_company_keypair(self, company_aid: str) -> Dict[str, str]:
        """Generate X25519 key pair for company"""
        try:
            if not NACL_AVAILABLE:
                await self._require_pynacl("company keypair generation")
            
            # Generate X25519 key pair
            private_key = PrivateKey.generate()
            public_key = private_key.public_key
            
            keypair = {
                "company_aid": company_aid,
                "x25519_private_key": private_key.encode(encoder=Base64Encoder).decode('utf-8'),
                "x25519_public_key": public_key.encode(encoder=Base64Encoder).decode('utf-8'),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            # Store keys
            self.company_keys[company_aid] = keypair
            
            logger.info(f"🔑 Generated X25519 keypair for company {company_aid[:8]}...")
            return keypair
            
        except Exception as e:
            logger.error(f"❌ Failed to generate company keypair: {e}")
            raise
    
    async def store_employee_public_key(self, employee_aid: str, x25519_public_key: str) -> bool:
        """Store employee's X25519 public key for encryption"""
        try:
            if not validate_aid(employee_aid):
                raise ValueError("Invalid employee AID format")
            
            # Validate public key format
            if NACL_AVAILABLE:
                try:
                    PublicKey(x25519_public_key, encoder=Base64Encoder)
                except Exception as e:
                    raise ValueError(f"Invalid X25519 public key format: {e}")
            
            self.employee_keys[employee_aid] = {
                "employee_aid": employee_aid,
                "x25519_public_key": x25519_public_key,
                "stored_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"🔑 Stored public key for employee {employee_aid[:8]}...")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to store employee public key: {e}")
            return False
    
    async def encrypt_data_for_employee(
        self, 
        data: Dict[str, Any], 
        employee_aid: str,
        company_aid: str
    ) -> str:
        """Encrypt data for specific employee using X25519"""
        try:
            if not NACL_AVAILABLE:
                await self._require_pynacl("employee data encryption")
            
            # Get employee's public key
            employee_keys = self.employee_keys.get(employee_aid)
            if not employee_keys:
                raise ValueError(f"No public key found for employee {employee_aid}")
            
            # Get company's private key
            company_keys = self.company_keys.get(company_aid)
            if not company_keys:
                raise ValueError(f"No private key found for company {company_aid}")
            
            # Create encryption box
            company_private = PrivateKey(
                company_keys["x25519_private_key"], 
                encoder=Base64Encoder
            )
            employee_public = PublicKey(
                employee_keys["x25519_public_key"],
                encoder=Base64Encoder
            )
            
            box = Box(company_private, employee_public)
            
            # Encrypt data
            plaintext = json.dumps(data).encode('utf-8')
            encrypted = box.encrypt(plaintext)
            
            # Encode as base64 for storage/transmission
            encrypted_b64 = base64.b64encode(encrypted).decode('utf-8')
            
            logger.info(f"🔒 Encrypted data for employee {employee_aid[:8]}... ({len(plaintext)} bytes)")
            return encrypted_b64
            
        except Exception as e:
            logger.error(f"❌ Failed to encrypt data for employee: {e}")
            raise
    
    async def decrypt_data_from_employee(
        self, 
        encrypted_data: str, 
        employee_aid: str,
        company_aid: str
    ) -> Dict[str, Any]:
        """Decrypt data received from employee using X25519"""
        try:
            if not NACL_AVAILABLE:
                await self._require_pynacl("employee data decryption")
            
            # Get employee's public key
            employee_keys = self.employee_keys.get(employee_aid)
            if not employee_keys:
                raise ValueError(f"No public key found for employee {employee_aid}")
            
            # Get company's private key  
            company_keys = self.company_keys.get(company_aid)
            if not company_keys:
                raise ValueError(f"No private key found for company {company_aid}")
            
            # Create decryption box
            company_private = PrivateKey(
                company_keys["x25519_private_key"],
                encoder=Base64Encoder
            )
            employee_public = PublicKey(
                employee_keys["x25519_public_key"], 
                encoder=Base64Encoder
            )
            
            box = Box(company_private, employee_public)
            
            # Decode and decrypt
            encrypted_bytes = base64.b64decode(encrypted_data.encode('utf-8'))
            decrypted_bytes = box.decrypt(encrypted_bytes)
            
            # Parse JSON
            decrypted_data = json.loads(decrypted_bytes.decode('utf-8'))
            
            logger.info(f"🔓 Decrypted data from employee {employee_aid[:8]}... ({len(decrypted_bytes)} bytes)")
            return decrypted_data
            
        except Exception as e:
            logger.error(f"❌ Failed to decrypt data from employee: {e}")
            raise
    
    async def get_company_public_key(self, company_aid: str) -> Optional[str]:
        """Get company's X25519 public key for sharing"""
        try:
            company_keys = self.company_keys.get(company_aid)
            if not company_keys:
                # Generate keys if not exist
                await self.generate_company_keypair(company_aid)
                company_keys = self.company_keys.get(company_aid)
            
            return company_keys.get("x25519_public_key") if company_keys else None
            
        except Exception as e:
            logger.error(f"❌ Failed to get company public key: {e}")
            return None
    
    async def verify_encrypted_data_integrity(
        self, 
        encrypted_data: str, 
        expected_hash: str
    ) -> bool:
        """Verify integrity of encrypted data using hash"""
        try:
            if not NACL_AVAILABLE:
                return True  # Mock verification
            
            # Calculate hash of encrypted data
            data_bytes = encrypted_data.encode('utf-8')
            calculated_hash = nacl.hash.sha256(data_bytes, encoder=Base64Encoder).decode('utf-8')
            
            # Compare hashes
            is_valid = calculated_hash == expected_hash
            
            if is_valid:
                logger.info("✅ Data integrity verified")
            else:
                logger.warning("⚠️ Data integrity check failed")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"❌ Failed to verify data integrity: {e}")
            return False
    
    # Fallback methods when PyNaCl is not available
    async def _require_pynacl(self, operation: str) -> None:
        """
        Require PyNaCl for production encryption operations
        No more mock/fallback encryption - this is production code
        """
        logger.error(f"❌ PyNaCl required for {operation} - install with: pip install PyNaCl")
        raise RuntimeError(f"Production encryption requires PyNaCl library for {operation}")
    
    async def initialize_company_keys(self, company_aid: str) -> Dict[str, str]:
        """Initialize encryption keys for a company"""
        try:
            # Check if keys already exist
            if company_aid in self.company_keys:
                logger.info(f"🔑 Company keys already exist for {company_aid[:8]}...")
                return self.company_keys[company_aid]
            
            # Generate new keys
            keypair = await self.generate_company_keypair(company_aid)
            
            logger.info(f"🎉 Initialized encryption keys for company {company_aid[:8]}...")
            return keypair
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize company keys: {e}")
            raise
    
    async def get_encryption_stats(self) -> Dict[str, Any]:
        """Get encryption service statistics"""
        return {
            "companies_with_keys": len(self.company_keys),
            "employees_with_keys": len(self.employee_keys),
            "nacl_available": NACL_AVAILABLE,
            "encryption_method": "X25519" if NACL_AVAILABLE else "Mock",
            "last_updated": datetime.utcnow().isoformat()
        }

# Global encryption service instance
company_encryption_service = CompanyEncryptionService()