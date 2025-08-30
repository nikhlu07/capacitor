"""
OOBI-Based Key Exchange API
Handles Out-of-Band Introduction for secure key exchange between employees and companies
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from app.services.keria import keria_service
from app.services.company_encryption_service import company_encryption_service
from app.core.keri_utils import validate_aid, generate_company_aid
from app.core.database import get_db
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class OOBIRequest(BaseModel):
    """Request for an AID's OOBI"""
    aid: str = Field(..., description="AID to get OOBI for")
    
class OOBIResponse(BaseModel):
    """OOBI response containing keys and endpoints"""
    aid: str
    ed25519_public_key: str
    x25519_public_key: str
    witnesses: List[str]
    endpoints: List[str]
    oobi_url: str
    created_at: datetime

class KeyExchangeRequest(BaseModel):
    """Request to exchange keys between employee and company"""
    employee_aid: str
    company_aid: str
    employee_oobi: Optional[str] = None
    company_oobi: Optional[str] = None

class CompanyRegistration(BaseModel):
    """Company registration for OOBI system"""
    company_name: str
    x25519_public_key: Optional[str] = None
    api_key: str
    webhook_url: Optional[str] = None

# In-memory OOBI storage (in production, use PostgreSQL)
oobi_store: Dict[str, Dict[str, Any]] = {}
company_oobis: Dict[str, Dict[str, Any]] = {}

@router.post("/oobi/generate", response_model=OOBIResponse)
async def generate_oobi(request: OOBIRequest):
    """Generate OOBI for an AID (employee or company)"""
    try:
        if not validate_aid(request.aid):
            raise HTTPException(status_code=400, detail="Invalid AID format")
        
        # Check if OOBI already exists
        if request.aid in oobi_store:
            existing_oobi = oobi_store[request.aid]
            logger.info(f"📋 Returning existing OOBI for {request.aid[:8]}...")
            return OOBIResponse(**existing_oobi)
        
        # Get AID information from KERIA
        try:
            aid_info = await keria_service.get_aid_keys(request.aid)
        except Exception as e:
            logger.warning(f"⚠️ Could not get AID info from KERIA: {e}")
            aid_info = None
        
        # If AID not in KERIA, this is an error in production
        if not aid_info:
            logger.error(f"❌ AID {request.aid[:8]}... not found in KERIA - production requires real AIDs")
            raise HTTPException(
                status_code=404, 
                detail="AID not found in KERIA - only real KERI identifiers supported"
            )
        
        # Real OOBI from KERIA
        oobi_data = {
            "aid": request.aid,
            "ed25519_public_key": aid_info.get("ed25519_public_key", ""),
            "x25519_public_key": aid_info.get("x25519_public_key", ""),
            "witnesses": aid_info.get("witnesses", []),
            "endpoints": aid_info.get("endpoints", []),
            "oobi_url": f"http://localhost:8000/oobi/{request.aid}",
            "created_at": datetime.utcnow()
        }
        
        # Store OOBI
        oobi_store[request.aid] = oobi_data
        
        logger.info(f"📋 Generated OOBI for {request.aid[:8]}...")
        return OOBIResponse(**oobi_data)
        
    except Exception as e:
        logger.error(f"❌ Failed to generate OOBI: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate OOBI: {str(e)}")

@router.get("/oobi/{aid}", response_model=OOBIResponse)
async def get_oobi(aid: str):
    """Get OOBI for specific AID"""
    try:
        if not validate_aid(aid):
            raise HTTPException(status_code=400, detail="Invalid AID format")
        
        # Check stored OOBIs
        if aid in oobi_store:
            oobi_data = oobi_store[aid]
            logger.info(f"📋 Retrieved OOBI for {aid[:8]}...")
            return OOBIResponse(**oobi_data)
        
        # Generate OOBI if not exists
        logger.info(f"🔧 OOBI not found, generating for {aid[:8]}...")
        return await generate_oobi(OOBIRequest(aid=aid))
        
    except Exception as e:
        logger.error(f"❌ Failed to get OOBI: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get OOBI: {str(e)}")

@router.post("/oobi/resolve", response_model=Dict[str, Any])
async def resolve_oobi(oobi_url: str):
    """Resolve OOBI URL to get AID information"""
    try:
        # Extract AID from OOBI URL
        # Format: http://localhost:8000/oobi/{aid}
        if "/oobi/" not in oobi_url:
            raise HTTPException(status_code=400, detail="Invalid OOBI URL format")
        
        aid = oobi_url.split("/oobi/")[-1]
        
        if not validate_aid(aid):
            raise HTTPException(status_code=400, detail="Invalid AID in OOBI URL")
        
        # Get OOBI data
        oobi_response = await get_oobi(aid)
        
        logger.info(f"🔗 Resolved OOBI URL for {aid[:8]}...")
        
        return {
            "success": True,
            "aid": aid,
            "oobi": oobi_response.dict(),
            "resolved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to resolve OOBI: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to resolve OOBI: {str(e)}")

@router.post("/oobi/key-exchange", response_model=Dict[str, str])
async def perform_key_exchange(exchange: KeyExchangeRequest):
    """Perform key exchange between employee and company"""
    try:
        if not validate_aid(exchange.employee_aid) or not validate_aid(exchange.company_aid):
            raise HTTPException(status_code=400, detail="Invalid AID format")
        
        # Get or generate OOBIs for both parties
        employee_oobi = await get_oobi(exchange.employee_aid)
        company_oobi = await get_oobi(exchange.company_aid)
        
        # Store keys for encryption service
        await company_encryption_service.store_employee_public_key(
            exchange.employee_aid,
            employee_oobi.x25519_public_key
        )
        
        # Ensure company has keys
        await company_encryption_service.initialize_company_keys(exchange.company_aid)
        
        logger.info(f"🤝 Key exchange completed: {exchange.employee_aid[:8]}... ↔ {exchange.company_aid[:8]}...")
        
        return {
            "success": "true",
            "employee_aid": exchange.employee_aid,
            "company_aid": exchange.company_aid,
            "employee_oobi_url": employee_oobi.oobi_url,
            "company_oobi_url": company_oobi.oobi_url,
            "message": "Key exchange completed successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Key exchange failed: {e}")
        raise HTTPException(status_code=500, detail=f"Key exchange failed: {str(e)}")

@router.post("/companies/register", response_model=Dict[str, Any])
async def register_company(registration: CompanyRegistration):
    """Register company and generate OOBI"""
    try:
        # Generate company AID
        company_aid = generate_company_aid(registration.company_name)
        
        # Initialize encryption keys
        company_keys = await company_encryption_service.initialize_company_keys(company_aid)
        
        # Generate OOBI
        oobi_response = await generate_oobi(OOBIRequest(aid=company_aid))
        
        # Store company registration info
        company_info = {
            "company_aid": company_aid,
            "company_name": registration.company_name,
            "api_key": registration.api_key,
            "webhook_url": registration.webhook_url,
            "x25519_public_key": company_keys["x25519_public_key"],
            "oobi": oobi_response.dict(),
            "registered_at": datetime.utcnow()
        }
        
        company_oobis[company_aid] = company_info
        
        logger.info(f"🏢 Registered company: {registration.company_name} ({company_aid[:8]}...)")
        
        return {
            "success": True,
            "company_aid": company_aid,
            "company_name": registration.company_name,
            "oobi_url": oobi_response.oobi_url,
            "x25519_public_key": company_keys["x25519_public_key"],
            "message": f"Company {registration.company_name} registered successfully"
        }
        
    except Exception as e:
        logger.error(f"❌ Company registration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Company registration failed: {str(e)}")

@router.get("/companies", response_model=List[Dict[str, Any]])
async def list_registered_companies():
    """List all registered companies"""
    try:
        companies = []
        for company_aid, info in company_oobis.items():
            companies.append({
                "company_aid": company_aid,
                "company_name": info["company_name"],
                "oobi_url": info["oobi"]["oobi_url"],
                "registered_at": info["registered_at"].isoformat()
            })
        
        logger.info(f"📋 Listed {len(companies)} registered companies")
        return companies
        
    except Exception as e:
        logger.error(f"❌ Failed to list companies: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list companies: {str(e)}")

@router.get("/companies/{company_aid}/oobi", response_model=OOBIResponse)
async def get_company_oobi(company_aid: str):
    """Get OOBI for specific company"""
    try:
        if company_aid in company_oobis:
            company_info = company_oobis[company_aid]
            return OOBIResponse(**company_info["oobi"])
        else:
            # Fallback to general OOBI endpoint
            return await get_oobi(company_aid)
            
    except Exception as e:
        logger.error(f"❌ Failed to get company OOBI: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get company OOBI: {str(e)}")

@router.post("/oobi/share", response_model=Dict[str, str])
async def share_oobi_with_company(employee_aid: str, company_aid: str):
    """Share employee OOBI with company for key exchange"""
    try:
        if not validate_aid(employee_aid) or not validate_aid(company_aid):
            raise HTTPException(status_code=400, detail="Invalid AID format")
        
        # Get employee OOBI
        employee_oobi = await get_oobi(employee_aid)
        
        # Perform key exchange
        exchange_result = await perform_key_exchange(KeyExchangeRequest(
            employee_aid=employee_aid,
            company_aid=company_aid
        ))
        
        logger.info(f"📤 Shared OOBI: {employee_aid[:8]}... → {company_aid[:8]}...")
        
        return {
            "success": "true",
            "message": "OOBI shared and key exchange completed",
            "employee_oobi_url": employee_oobi.oobi_url,
            "shared_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ OOBI sharing failed: {e}")
        raise HTTPException(status_code=500, detail=f"OOBI sharing failed: {str(e)}")

@router.get("/oobi/debug/all", response_model=Dict[str, Any])
async def debug_all_oobis():
    """Debug endpoint to see all stored OOBIs"""
    return {
        "total_oobis": len(oobi_store),
        "total_companies": len(company_oobis),
        "oobis": {k: {**v, "created_at": v["created_at"].isoformat()} for k, v in oobi_store.items()},
        "companies": {k: {**v, "registered_at": v["registered_at"].isoformat()} for k, v in company_oobis.items()}
    }