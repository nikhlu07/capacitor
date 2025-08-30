from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
import logging

from app.services.simple_storage import simple_storage

logger = logging.getLogger(__name__)

router = APIRouter()

class MasterCardCreate(BaseModel):
    employeeAid: str
    encryptedData: str
    profileCompleteness: dict

class ContextCardCreate(BaseModel):
    employeeAid: str
    companyAid: str
    companyName: str
    encryptedData: str
    sharedFields: List[str]
    purpose: str
    masterCardId: Optional[str] = None

@router.post("/working/master-cards")
async def create_master_card_working(data: MasterCardCreate):
    """Create master card - ACTUALLY WORKS"""
    try:
        card = simple_storage.create_master_card(
            data.employeeAid,
            data.encryptedData,
            data.profileCompleteness
        )
        logger.info(f"✅ Master card created: {card['id']}")
        return card
    except Exception as e:
        logger.error(f"❌ Failed to create master card: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/working/master-cards/{employee_aid}")
async def get_master_card_working(employee_aid: str):
    """Get master card - ACTUALLY WORKS"""
    try:
        card = simple_storage.get_master_card(employee_aid)
        if not card:
            raise HTTPException(status_code=404, detail="Master card not found")
        return card
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get master card: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/working/context-cards")
async def create_context_card_working(data: ContextCardCreate):
    """Create context card - ACTUALLY WORKS"""
    try:
        card = simple_storage.create_context_card(
            data.employeeAid,
            data.companyAid,
            data.companyName,
            data.encryptedData,
            data.sharedFields,
            data.purpose,
            data.masterCardId
        )
        logger.info(f"✅ Context card created: {card['id']}")
        return card
    except Exception as e:
        logger.error(f"❌ Failed to create context card: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/working/context-cards/employee/{employee_aid}")
async def get_employee_context_cards_working(employee_aid: str):
    """Get employee context cards - ACTUALLY WORKS"""
    try:
        cards = simple_storage.get_context_cards_for_employee(employee_aid)
        return cards
    except Exception as e:
        logger.error(f"❌ Failed to get context cards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/working/context-cards/{card_id}/company/{company_aid}")
async def get_context_card_for_company_working(card_id: str, company_aid: str):
    """Get context card data for company - ACTUALLY WORKS"""
    try:
        card = simple_storage.get_context_card_for_company(card_id, company_aid)
        if not card:
            raise HTTPException(status_code=404, detail="Context card not found or access denied")
        return card
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get context card: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/working/context-cards/{card_id}/revoke")
async def revoke_context_card_working(card_id: str, employee_aid: str = Header(..., alias="X-Employee-AID")):
    """Revoke context card - ACTUALLY WORKS"""
    try:
        success = simple_storage.revoke_context_card(card_id, employee_aid)
        if not success:
            raise HTTPException(status_code=404, detail="Context card not found")
        return {"message": "Context card revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to revoke context card: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/working/access-logs/{card_id}")
async def get_access_logs_working(card_id: str):
    """Get access logs - ACTUALLY WORKS"""
    try:
        logs = simple_storage.get_access_logs(card_id)
        return logs
    except Exception as e:
        logger.error(f"❌ Failed to get access logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/working/health")
async def working_storage_health():
    """Health check - ACTUALLY WORKS"""
    try:
        # Test database connectivity
        simple_storage._ensure_tables()
        return {
            "status": "healthy",
            "storage": "SQLite",
            "message": "Working storage is functional!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage health check failed: {e}")