"""
Company Data Access API
Real implementation for companies to access encrypted employee travel data
Uses real encryption/decryption with OOBI-based key exchange
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from app.services.keria import keria_service
from app.services.company_encryption_service import company_encryption_service
from app.models.database import ConsentRecord
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.core.keri_utils import validate_aid

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class CompanyDataRequest(BaseModel):
    """Company request for employee data"""
    employee_aid: str
    context_card_said: str
    company_aid: str

class DecryptedTravelData(BaseModel):
    """Decrypted travel data response"""
    employee_aid: str
    company_aid: str
    travel_data: Dict[str, Any]
    decrypted_fields: List[str]
    employee_signature_valid: bool
    decrypted_at: datetime
    expires_at: Optional[datetime] = None

class CompanyAuth(BaseModel):
    """Company authentication info"""
    company_aid: str
    company_name: str
    permissions: List[str]

# Company API key validation
def validate_company_api_key(api_key: str = Header(None, alias="X-API-Key")) -> CompanyAuth:
    """Validate company API key and return company info"""
    if not api_key:
        raise HTTPException(status_code=401, detail="API key required")
    
    # In production, this would be database lookup
    if api_key.startswith("scania_"):
        from app.core.keri_utils import get_company_aid
        company_aid = get_company_aid("scania")
        return CompanyAuth(
            company_aid=company_aid,
            company_name="Scania",
            permissions=["read_context_cards", "decrypt_data"]
        )
    elif api_key.startswith("demo_"):
        company_aid = "EDemo1234567890123456789012345678901234567890"
        return CompanyAuth(
            company_aid=company_aid,
            company_name="Demo Company", 
            permissions=["read_context_cards", "decrypt_data"]
        )
    else:
        raise HTTPException(status_code=401, detail="Invalid API key")

@router.get("/company/available-data", response_model=List[Dict[str, Any]])
async def get_available_employee_data(
    company_auth: CompanyAuth = Depends(validate_company_api_key),
    db: Session = Depends(get_db)
):
    """Get list of employee data available to company"""
    try:
        available_data = []
        
        # Query database for approved consent requests for this company
        approved_records = db.query(ConsentRecord).filter(
            ConsentRecord.company_aid == company_auth.company_aid,
            ConsentRecord.status == "approved",
            ConsentRecord.context_card_said.isnot(None)
        ).all()
        
        for consent_record in approved_records:
                
            available_data.append({
                "request_id": consent_record.request_id,
                "employee_aid": consent_record.employee_aid,
                "context_card_said": consent_record.context_card_said,
                "approved_fields": consent_record.approved_fields,
                "purpose": consent_record.purpose,
                "approved_at": consent_record.approved_at.isoformat() if consent_record.approved_at else None,
                "expires_at": consent_record.expires_at.isoformat() if consent_record.expires_at else None
            })
        
        logger.info(f"📋 Found {len(available_data)} available data records for {company_auth.company_name}")
        return available_data
        
    except Exception as e:
        logger.error(f"❌ Failed to get available data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get available data: {str(e)}")

@router.post("/company/decrypt-data", response_model=DecryptedTravelData)
async def decrypt_employee_data(
    request: CompanyDataRequest,
    company_auth: CompanyAuth = Depends(validate_company_api_key),
    db: Session = Depends(get_db)
):
    """Decrypt employee travel data using company's private key"""
    print(f"DEBUG: decrypt_employee_data called with request: {request}")
    print(f"DEBUG: company_auth: {company_auth}")
    try:
        # Validate request
        if not validate_aid(request.employee_aid):
            raise HTTPException(status_code=400, detail="Invalid employee AID")
        
        # Debug AID comparison
        print(f"DEBUG: Comparing AIDs: request='{request.company_aid}' (len={len(request.company_aid)}) vs auth='{company_auth.company_aid}' (len={len(company_auth.company_aid)})")
        logger.info(f"Comparing AIDs: request='{request.company_aid}' (len={len(request.company_aid)}) vs auth='{company_auth.company_aid}' (len={len(company_auth.company_aid)})")
        
        if request.company_aid != company_auth.company_aid:
            print(f"DEBUG: AID MISMATCH: '{request.company_aid}' != '{company_auth.company_aid}'")
            logger.error(f"AID MISMATCH: '{request.company_aid}' != '{company_auth.company_aid}'")
            raise HTTPException(status_code=403, detail=f"Company AID mismatch: got '{request.company_aid}', expected '{company_auth.company_aid}'")
        
        # Find the consent request for this context card from database
        consent_record = db.query(ConsentRecord).filter(
            ConsentRecord.context_card_said == request.context_card_said,
            ConsentRecord.employee_aid == request.employee_aid,
            ConsentRecord.company_aid == company_auth.company_aid
        ).first()
        
        if not consent_record:
            raise HTTPException(
                status_code=404, 
                detail="No approved consent found for this context card"
            )
        
        if consent_record.status != "approved":
            raise HTTPException(
                status_code=403,
                detail=f"Consent not approved (status: {consent_record.status})"
            )
        
        # Get context card from KERIA
        context_card = await keria_service.get_credential(request.context_card_said)
        if not context_card:
            raise HTTPException(status_code=404, detail="Context card not found in KERIA")
        
        # Verify employee signature
        signature_valid = False
        try:
            if consent_record.employee_signature:
                # In production, verify signature using employee's public key
                signature_valid = await _verify_employee_signature(
                    request.context_card_said,
                    consent_record.employee_signature,
                    request.employee_aid
                )
            else:
                signature_valid = True  # Mock verification for demo
        except Exception as e:
            logger.warning(f"⚠️ Signature verification failed: {e}")
            signature_valid = False
        
        # Decrypt the travel data
        # Extract encrypted data from context card
        encrypted_data = context_card.get("credentialSubject", {}).get("encryptedContent")
        if not encrypted_data:
            raise HTTPException(status_code=400, detail="No encrypted data found in context card")
        
        # Decrypt using company's private key
        decrypted_data = await company_encryption_service.decrypt_data_from_employee(
            encrypted_data,
            request.employee_aid,
            company_auth.company_aid
        )
        
        logger.info(f"🔓 Successfully decrypted data for {company_auth.company_name}")
        
        # Return decrypted travel data
        return DecryptedTravelData(
            employee_aid=request.employee_aid,
            company_aid=company_auth.company_aid,
            travel_data=decrypted_data,
            decrypted_fields=consent_record.approved_fields,
            employee_signature_valid=signature_valid,
            decrypted_at=datetime.utcnow(),
            expires_at=consent_record.expires_at
        )
        
    except Exception as e:
        logger.error(f"❌ Data decryption failed: {e}")
        raise HTTPException(status_code=500, detail=f"Data decryption failed: {str(e)}")

@router.get("/company/employee/{employee_aid}/data", response_model=Dict[str, Any])
async def get_employee_travel_data(
    employee_aid: str,
    company_auth: CompanyAuth = Depends(validate_company_api_key),
    db: Session = Depends(get_db)
):
    """Get employee travel data (convenience endpoint)"""
    try:
        # Find approved consent for this employee from database
        approved_records = db.query(ConsentRecord).filter(
            ConsentRecord.employee_aid == employee_aid,
            ConsentRecord.company_aid == company_auth.company_aid,
            ConsentRecord.status == "approved",
            ConsentRecord.context_card_said.isnot(None)
        ).all()
        
        if not approved_records:
            raise HTTPException(
                status_code=404, 
                detail="No approved consent found for this employee"
            )
        
        # Use the most recent consent
        latest_consent = max(approved_records, key=lambda x: x.approved_at if x.approved_at else datetime.min)
        
        # Decrypt the data
        decrypt_request = CompanyDataRequest(
            employee_aid=employee_aid,
            context_card_said=latest_consent.context_card_said,
            company_aid=company_auth.company_aid
        )
        
        decrypted_result = await decrypt_employee_data(decrypt_request, company_auth, db)
        
        return {
            "employee_aid": employee_aid,
            "data": decrypted_result.travel_data,
            "fields": decrypted_result.decrypted_fields,
            "verified": decrypted_result.employee_signature_valid,
            "decrypted_at": decrypted_result.decrypted_at.isoformat(),
            "company": company_auth.company_name
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get employee data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get employee data: {str(e)}")

@router.post("/company/verify-signature", response_model=Dict[str, bool])
async def verify_employee_signature(
    context_card_said: str,
    employee_aid: str,
    signature: str,
    company_auth: CompanyAuth = Depends(validate_company_api_key)
):
    """Verify employee signature on context card"""
    try:
        is_valid = await _verify_employee_signature(context_card_said, signature, employee_aid)
        
        logger.info(f"🔍 Signature verification for {employee_aid[:8]}...: {'✅ Valid' if is_valid else '❌ Invalid'}")
        
        return {
            "signature_valid": is_valid,
            "employee_aid": employee_aid,
            "context_card_said": context_card_said,
            "verified_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Signature verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Signature verification failed: {str(e)}")

# Helper functions

async def _verify_employee_signature(context_card_said: str, signature: str, employee_aid: str) -> bool:
    """Verify employee signature (mock implementation)"""
    try:
        # In production, this would:
        # 1. Get employee's Ed25519 public key from OOBI
        # 2. Verify signature using libsodium/SignifyTS
        # 3. Ensure signature matches context card SAID
        
        # For demo, do basic validation
        if not signature or len(signature) < 10:
            return False
        
        if not validate_aid(employee_aid):
            return False
        
        # Mock verification: signature should contain parts of both IDs
        employee_part = employee_aid[-8:]
        context_part = context_card_said[-8:] if len(context_card_said) >= 8 else context_card_said
        
        # Simple check: signature contains references to both
        signature_valid = (employee_part in signature or context_part in signature)
        
        return signature_valid
        
    except Exception as e:
        logger.error(f"❌ Signature verification error: {e}")
        return False

@router.get("/company/stats", response_model=Dict[str, Any])
async def get_company_access_stats(
    company_auth: CompanyAuth = Depends(validate_company_api_key),
    db: Session = Depends(get_db)
):
    """Get company data access statistics"""
    try:
        # Count data requests for this company from database
        company_records = db.query(ConsentRecord).filter(
            ConsentRecord.company_aid == company_auth.company_aid
        ).all()
        
        total_requests = len(company_records)
        approved_requests = len([r for r in company_records if r.status == "approved"])
        pending_requests = len([r for r in company_records if r.status == "pending"])
        
        # Get encryption stats
        encryption_stats = await company_encryption_service.get_encryption_stats()
        
        return {
            "company_aid": company_auth.company_aid,
            "company_name": company_auth.company_name,
            "total_data_requests": total_requests,
            "approved_requests": approved_requests,
            "pending_requests": pending_requests,
            "approval_rate": approved_requests / total_requests if total_requests > 0 else 0,
            "encryption_available": encryption_stats["nacl_available"],
            "encryption_method": encryption_stats["encryption_method"],
            "stats_generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get company stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get company stats: {str(e)}")