"""
Real KERI Identifier Management Endpoints
Uses actual KERIA service for proper KERI protocol implementation
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import logging

from app.services.keria import keria_service
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.models.employees import Employee

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/identifiers",
    tags=["KERI Identifiers"],
    responses={404: {"description": "Not found"}}
)

# Pydantic models
class IdentifierRequest(BaseModel):
    employee_id: str = Field(..., description="Employee identifier")
    full_name: str = Field(..., description="Employee full name")
    agent_name: Optional[str] = Field("travlr-agent", description="KERI agent name")

class IdentifierResponse(BaseModel):
    success: bool
    aid: str = Field(..., description="Generated KERI AID")
    employee_id: str
    full_name: str
    oobi: str = Field(..., description="Out-of-band introduction")
    witnesses: list = Field(..., description="Witness network")
    threshold: int = Field(..., description="Witness threshold")
    created_at: datetime
    keri_backend: str = "veridian"

@router.post("/create", response_model=IdentifierResponse)
async def create_keri_identifier(
    request: IdentifierRequest,
    db: Session = Depends(get_db)
):
    """
    Create a real KERI identifier using Veridian KERIA service
    
    This generates a proper KERI AID with:
    - Real Ed25519 key pairs
    - Proper inception event
    - Blake3 cryptographic hashing
    - Witness network integration
    """
    try:
        logger.info(f"🔑 Creating real KERI identifier for employee: {request.employee_id}")
        
        # Use real KERIA service to create identifier
        keri_result = await keria_service.create_identifier(
            name=f"{request.agent_name}-{request.employee_id}",
            employee_id=request.employee_id
        )
        
        if not keri_result or not keri_result.get("aid"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create KERI identifier - no AID returned"
            )
        
        aid = keri_result["aid"]
        logger.info(f"✅ Real KERI AID created: {aid}")
        
        # Verify AID format (KERI AIDs start with 'E' for Ed25519)
        if not aid.startswith('E') or len(aid) < 44:
            logger.warning(f"⚠️ Generated AID may not be valid KERI format: {aid}")
        
        # Return complete identifier information
        response = IdentifierResponse(
            success=True,
            aid=aid,
            employee_id=request.employee_id,
            full_name=request.full_name,
            oobi=keri_result.get("oobi", f"http://keria:3901/oobi/{aid}"),
            witnesses=keri_result.get("witnesses", []),
            threshold=keri_result.get("threshold", 0),
            created_at=datetime.now(),
            keri_backend="veridian"
        )
        
        logger.info(f"🎉 KERI identifier creation successful for {request.employee_id}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create KERI identifier: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"KERI identifier creation failed: {str(e)}"
        )

@router.get("/{aid}/status")
async def get_identifier_status(aid: str):
    """Get status of a KERI identifier"""
    try:
        # Query KERIA for identifier status
        aid_info = await keria_service.get_aid_keys(aid)
        
        if aid_info:
            return {
                "aid": aid,
                "status": "active",
                "keri_backend": "veridian",
                "key_info": aid_info
            }
        else:
            return {
                "aid": aid,
                "status": "not_found",
                "keri_backend": "veridian"
            }
            
    except Exception as e:
        logger.error(f"Failed to get identifier status: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.get("/")
async def list_identifiers():
    """List all identifiers managed by KERIA"""
    try:
        identifiers = await keria_service.get_identifiers()
        return {
            "identifiers": identifiers,
            "count": len(identifiers),
            "keri_backend": "veridian"
        }
    except Exception as e:
        logger.error(f"Failed to list identifiers: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list identifiers: {str(e)}")