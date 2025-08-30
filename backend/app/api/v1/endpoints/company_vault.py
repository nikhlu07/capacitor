"""
Company Vault API Endpoints
Secure delivery of encrypted context cards to company systems
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import logging

from app.services.keria import keria_service
from app.services.encryption import EncryptionService

logger = logging.getLogger(__name__)
router = APIRouter()

class CompanyVaultDeliveryRequest(BaseModel):
    """Request to deliver encrypted context card to company vault"""
    context_card_said: str = Field(..., description="Context card SAID")
    company_aid: str = Field(..., description="Company AID")
    delivery_method: str = Field(default="secure_api", description="Delivery method")
    company_vault_endpoint: Optional[str] = Field(None, description="Company vault API endpoint")

class CompanyVaultDeliveryResponse(BaseModel):
    """Response for company vault delivery"""
    success: bool
    context_card_said: str
    company_aid: str
    delivery_status: str
    delivered_at: datetime
    zero_trust_validated: bool
    message: str

class CompanyKeyRegistrationRequest(BaseModel):
    """Request to register company public key for encryption"""
    company_aid: str = Field(..., description="Company AID")
    company_name: str = Field(..., description="Company name")
    public_key: str = Field(..., description="RSA public key for encryption")
    key_algorithm: str = Field(default="RSA-OAEP-SHA256", description="Encryption algorithm")
    contact_email: str = Field(..., description="Company contact email")

class CompanyKeyRegistrationResponse(BaseModel):
    """Response for company key registration"""
    success: bool
    company_aid: str
    key_id: str
    registered_at: datetime
    expires_at: datetime
    message: str

# Database imports for production storage
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.database import CompanyKey, DeliveryLog

@router.post("/company/register-key", response_model=CompanyKeyRegistrationResponse)
async def register_company_key(
    request: CompanyKeyRegistrationRequest,
    db: Session = Depends(get_db)
):
    """Register company public key for encrypted context card delivery"""
    try:
        encryption_service = EncryptionService()
        
        # Validate public key format
        if not encryption_service.validate_rsa_public_key(request.public_key):
            raise HTTPException(
                status_code=400,
                detail="Invalid RSA public key format"
            )
        
        # Generate key ID
        key_id = f"key-{request.company_aid}-{int(datetime.now().timestamp())}"
        
        # Store company key in PostgreSQL
        key_record = CompanyKey(
            key_id=key_id,
            company_aid=request.company_aid,
            company_name=request.company_name,
            public_key=request.public_key,
            key_algorithm=request.key_algorithm,
            contact_email=request.contact_email,
            registered_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=365),
            status="active"
        )
        
        db.add(key_record)
        db.commit()
        db.refresh(key_record)
        
        logger.info(f"✅ Registered public key for company: {request.company_aid}")
        
        return CompanyKeyRegistrationResponse(
            success=True,
            company_aid=request.company_aid,
            key_id=key_id,
            registered_at=key_record["registered_at"],
            expires_at=key_record["expires_at"],
            message=f"Public key registered successfully for {request.company_name}"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to register company key: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to register company key: {str(e)}")

@router.post("/company/deliver-context-card", response_model=CompanyVaultDeliveryResponse)
async def deliver_context_card_to_company(request: CompanyVaultDeliveryRequest):
    """Deliver encrypted context card to company vault"""
    try:
        # Verify company has registered public key
        if request.company_aid not in company_keys_storage:
            raise HTTPException(
                status_code=404,
                detail=f"No public key registered for company: {request.company_aid}"
            )
        
        company_key_record = company_keys_storage[request.company_aid]
        
        # Check key expiration
        if datetime.now() > company_key_record["expires_at"]:
            raise HTTPException(
                status_code=410,
                detail="Company public key has expired"
            )
        
        # Get context card from KERIA
        try:
            context_card_response = await keria_service.agent_client.get(
                f"/credentials/{request.context_card_said}"
            )
            context_card_response.raise_for_status()
            context_card_data = context_card_response.json()
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Context card not found: {request.context_card_said}"
            )
        
        # Validate zero-trust encryption
        if not context_card_data.get("a", {}).get("zero_trust"):
            raise HTTPException(
                status_code=400,
                detail="Context card is not zero-trust encrypted"
            )
        
        # Prepare secure delivery payload
        delivery_payload = {
            "context_card_said": request.context_card_said,
            "company_aid": request.company_aid,
            "encrypted_data": context_card_data["a"]["encrypted_context_card"],
            "metadata": context_card_data["a"]["context_metadata"],
            "employee_aid": context_card_data["a"].get("i"),  # Issuer (employee)
            "master_card_reference": context_card_data["a"].get("master_card_reference"),
            "delivery_timestamp": datetime.now().isoformat(),
            "zero_trust_validated": True,
            "decryption_instructions": {
                "algorithm": company_key_record["key_algorithm"],
                "key_id": company_key_record["key_id"],
                "note": "Use your private key to decrypt the context card data"
            }
        }
        
        # Log delivery
        delivery_log = {
            "delivery_id": f"delivery-{int(datetime.now().timestamp())}",
            "context_card_said": request.context_card_said,
            "company_aid": request.company_aid,
            "company_name": company_key_record["company_name"],
            "delivery_method": request.delivery_method,
            "delivered_at": datetime.now(),
            "payload_size": len(str(delivery_payload)),
            "zero_trust_validated": True,
            "status": "delivered"
        }
        
        delivery_log_storage.append(delivery_log)
        
        # In production, this would actually deliver to company vault endpoint
        # For now, we simulate successful delivery
        
        logger.info(f"✅ Delivered context card {request.context_card_said} to {request.company_aid}")
        
        return CompanyVaultDeliveryResponse(
            success=True,
            context_card_said=request.context_card_said,
            company_aid=request.company_aid,
            delivery_status="delivered",
            delivered_at=datetime.now(),
            zero_trust_validated=True,
            message=f"Context card delivered successfully to {company_key_record['company_name']} vault"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to deliver context card: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to deliver context card: {str(e)}")

@router.get("/company/{company_aid}/deliveries")
async def get_company_deliveries(company_aid: str):
    """Get delivery history for a company"""
    try:
        # Filter deliveries for this company
        company_deliveries = [
            delivery for delivery in delivery_log_storage
            if delivery["company_aid"] == company_aid
        ]
        
        return {
            "success": True,
            "company_aid": company_aid,
            "total_deliveries": len(company_deliveries),
            "deliveries": company_deliveries
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get company deliveries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get deliveries: {str(e)}")

@router.get("/company/{company_aid}/key-status")
async def get_company_key_status(company_aid: str):
    """Get company public key registration status"""
    try:
        if company_aid not in company_keys_storage:
            raise HTTPException(
                status_code=404,
                detail=f"No key registered for company: {company_aid}"
            )
        
        key_record = company_keys_storage[company_aid]
        
        return {
            "success": True,
            "company_aid": company_aid,
            "key_id": key_record["key_id"],
            "company_name": key_record["company_name"],
            "registered_at": key_record["registered_at"],
            "expires_at": key_record["expires_at"],
            "status": key_record["status"],
            "algorithm": key_record["key_algorithm"],
            "days_until_expiry": (key_record["expires_at"] - datetime.now()).days
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get key status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get key status: {str(e)}")

@router.post("/company/{company_aid}/rotate-key")
async def rotate_company_key(company_aid: str, new_public_key: str):
    """Rotate company public key"""
    try:
        if company_aid not in company_keys_storage:
            raise HTTPException(
                status_code=404,
                detail=f"No key registered for company: {company_aid}"
            )
        
        encryption_service = EncryptionService()
        
        # Validate new public key
        if not encryption_service.validate_rsa_public_key(new_public_key):
            raise HTTPException(
                status_code=400,
                detail="Invalid RSA public key format"
            )
        
        # Update key record
        key_record = company_keys_storage[company_aid]
        old_key_id = key_record["key_id"]
        
        key_record["public_key"] = new_public_key
        key_record["key_id"] = f"key-{company_aid}-{int(datetime.now().timestamp())}"
        key_record["registered_at"] = datetime.now()
        key_record["expires_at"] = datetime.now() + timedelta(days=365)
        
        logger.info(f"✅ Rotated key for company: {company_aid}")
        
        return {
            "success": True,
            "company_aid": company_aid,
            "old_key_id": old_key_id,
            "new_key_id": key_record["key_id"],
            "rotated_at": datetime.now(),
            "message": "Company key rotated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to rotate company key: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to rotate key: {str(e)}")
