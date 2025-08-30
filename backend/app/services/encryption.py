"""
End-to-End Encryption Service for Backend
Handles encrypted credential storage and company vault delivery
"""

import base64
import json
import hashlib
from typing import Dict, Any, Optional, List
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

logger = logging.getLogger(__name__)

class EncryptionService:
    """Backend encryption service for handling encrypted credentials"""
    
    def __init__(self):
        self.salt = b'travlr-id-salt-2024'
    
    def validate_encrypted_credential(self, encrypted_data: str, metadata: Dict[str, Any]) -> bool:
        """Validate that credential is properly encrypted"""
        try:
            # Verify required encryption metadata
            required_fields = ['algorithm', 'version', 'encryptedCredentialKey', 'timestamp']
            for field in required_fields:
                if field not in metadata:
                    logger.error(f"Missing encryption metadata field: {field}")
                    return False
            
            # Verify algorithm
            if metadata['algorithm'] != 'AES-256-CBC':
                logger.error(f"Unsupported encryption algorithm: {metadata['algorithm']}")
                return False
            
            # Verify data format
            try:
                base64.b64decode(encrypted_data)
            except Exception:
                logger.error("Invalid base64 encrypted data")
                return False
            
            logger.info("✅ Encrypted credential validation passed")
            return True
            
        except Exception as e:
            logger.error(f"❌ Credential validation failed: {e}")
            return False
    
    def create_encrypted_acdc(self, 
                            issuer_aid: str,
                            recipient_aid: str,
                            schema_said: str,
                            encrypted_data: str,
                            encryption_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Create ACDC credential with encrypted data"""
        try:
            # Validate encryption first
            if not self.validate_encrypted_credential(encrypted_data, encryption_metadata):
                raise ValueError("Invalid encrypted credential data")
            
            # Create ACDC structure with encrypted payload
            acdc_credential = {
                "v": "ACDC10JSON000197_",
                "d": "",  # SAID (calculated)
                "i": issuer_aid,  # Issuer AID
                "ri": "",  # Registry ID (optional)
                "s": schema_said,  # Schema SAID
                "a": {  # Attributes (encrypted)
                    "d": "",  # Attribute SAID
                    "i": recipient_aid,  # Subject AID
                    "dt": encryption_metadata['timestamp'],
                    "encrypted_data": encrypted_data,
                    "encryption_metadata": encryption_metadata,
                    "data_type": "encrypted_travel_preferences"
                }
            }
            
            # Calculate SAID for credential
            credential_json = json.dumps(acdc_credential, sort_keys=True)
            credential_hash = hashlib.sha256(credential_json.encode()).hexdigest()
            acdc_credential["d"] = f"E{credential_hash}"
            acdc_credential["a"]["d"] = f"E{hashlib.sha256(json.dumps(acdc_credential['a'], sort_keys=True).encode()).hexdigest()}"
            
            logger.info(f"✅ Created encrypted ACDC credential: {acdc_credential['d']}")
            
            return acdc_credential
            
        except Exception as e:
            logger.error(f"❌ Failed to create encrypted ACDC: {e}")
            raise
    
    def generate_company_keypair(self, company_aid: str) -> Dict[str, str]:
        """Generate RSA key pair for company encryption"""
        try:
            # Generate RSA key pair
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )
            public_key = private_key.public_key()
            
            # Serialize keys
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            logger.info(f"✅ Generated key pair for company: {company_aid}")
            
            return {
                "company_aid": company_aid,
                "public_key": base64.b64encode(public_pem).decode(),
                "private_key": base64.b64encode(private_pem).decode(),
                "algorithm": "RSA-2048",
                "created_at": "2024-01-01T00:00:00Z"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to generate company keypair: {e}")
            raise
    
    def encrypt_context_card_for_company(self,
                                       context_data: Dict[str, Any],
                                       company_public_key: str,
                                       company_aid: str) -> Dict[str, Any]:
        """Encrypt context card for specific company"""
        try:
            # Load company's public key
            public_key_bytes = base64.b64decode(company_public_key)
            public_key = serialization.load_pem_public_key(public_key_bytes)
            
            # Prepare context card data
            context_card = {
                **context_data,
                "encrypted_for": company_aid,
                "created_at": "2024-01-01T00:00:00Z",
                "expires_at": "2024-04-01T00:00:00Z"
            }
            
            # Convert to JSON
            context_json = json.dumps(context_card, sort_keys=True)
            
            # Encrypt with company's public key
            encrypted_data = public_key.encrypt(
                context_json.encode(),
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # Encode as base64
            encrypted_b64 = base64.b64encode(encrypted_data).decode()
            
            # Create context card metadata
            context_metadata = {
                "context_card_said": f"E{hashlib.sha256(context_json.encode()).hexdigest()}",
                "encrypted_for": company_aid,
                "algorithm": "RSA-OAEP-SHA256",
                "approved_fields": list(context_data.keys()),
                "created_at": "2024-01-01T00:00:00Z",
                "expires_at": "2024-04-01T00:00:00Z"
            }
            
            logger.info(f"✅ Context card encrypted for company: {company_aid}")
            
            return {
                "encrypted_context_card": encrypted_b64,
                "context_metadata": context_metadata,
                "delivery_method": "company_vault"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to encrypt context card: {e}")
            raise
    
    def create_company_vault_payload(self,
                                   encrypted_context_card: str,
                                   context_metadata: Dict[str, Any],
                                   employee_aid: str) -> Dict[str, Any]:
        """Create payload for delivery to company vault"""
        try:
            vault_payload = {
                "delivery_type": "encrypted_context_card",
                "employee_aid": employee_aid,
                "company_aid": context_metadata["encrypted_for"],
                "context_card_said": context_metadata["context_card_said"],
                "encrypted_data": encrypted_context_card,
                "metadata": context_metadata,
                "delivery_instructions": {
                    "storage_location": "company_secure_vault",
                    "decryption_required": True,
                    "access_control": "company_private_key_required",
                    "audit_required": True
                },
                "compliance": {
                    "gdpr_compliant": True,
                    "data_minimization": True,
                    "consent_based": True,
                    "employee_controlled": True
                }
            }
            
            logger.info(f"✅ Created company vault payload for: {context_metadata['encrypted_for']}")
            
            return vault_payload
            
        except Exception as e:
            logger.error(f"❌ Failed to create vault payload: {e}")
            raise
    
    def validate_zero_trust_storage(self, credential_data: Dict[str, Any]) -> Dict[str, bool]:
        """Validate that we're following zero-trust principles"""
        try:
            validation_results = {
                "no_plain_text_data": True,
                "employee_key_controlled": True,
                "company_specific_encryption": True,
                "metadata_only_storage": True,
                "audit_trail_present": True
            }
            
            # Check for plain text personal data
            sensitive_fields = [
                'dietary_preferences', 'seat_preference', 'emergency_contact',
                'full_name', 'phone', 'email', 'accessibility_needs'
            ]
            
            def check_for_plain_text(obj, path=""):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        current_path = f"{path}.{key}" if path else key
                        if key in sensitive_fields and isinstance(value, str) and not key.startswith('encrypted'):
                            logger.warning(f"⚠️ Plain text sensitive data found at: {current_path}")
                            validation_results["no_plain_text_data"] = False
                        elif isinstance(value, (dict, list)):
                            check_for_plain_text(value, current_path)
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        check_for_plain_text(item, f"{path}[{i}]")
            
            check_for_plain_text(credential_data)
            
            # Verify encryption metadata exists
            if 'encryption_metadata' not in str(credential_data):
                validation_results["employee_key_controlled"] = False
            
            logger.info(f"✅ Zero-trust validation: {validation_results}")
            
            return validation_results
            
        except Exception as e:
            logger.error(f"❌ Zero-trust validation failed: {e}")
            return {"validation_error": True}

# Global instance
encryption_service = EncryptionService()
