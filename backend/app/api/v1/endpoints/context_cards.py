from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.models.context_cards import ContextCard, ContextCardAccess
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

class ContextCardCreate(BaseModel):
    employeeAid: str
    companyAid: str
    companyName: str
    encryptedData: str
    encryptionCipherQb64: str
    sharedFields: List[str]
    purpose: str
    credentialSaid: Optional[str] = None
    expiresAt: Optional[datetime] = None

class ContextCardUpdate(BaseModel):
    encryptedData: Optional[str] = None
    encryptionCipherQb64: Optional[str] = None
    sharedFields: Optional[List[str]] = None
    purpose: Optional[str] = None
    isActive: Optional[bool] = None
    expiresAt: Optional[datetime] = None

class ContextCardResponse(BaseModel):
    id: str
    employeeAid: str
    companyAid: str
    companyName: str
    sharedFields: List[str]
    purpose: str
    isActive: bool
    accessGrantedAt: datetime
    expiresAt: Optional[datetime]
    lastAccessedAt: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime
    credentialSaid: Optional[str]
    ipexGrantSaid: Optional[str]

    class Config:
        from_attributes = True

class ContextCardWithDataResponse(ContextCardResponse):
    encryptedData: str
    encryptionCipherQb64: str

@router.post("/context-cards", response_model=ContextCardResponse)
async def create_context_card(
    card_data: ContextCardCreate,
    db: Session = Depends(get_db)
):
    """Create a new context card with encrypted travel data"""
    try:
        logger.info(f"Creating context card for employee {card_data.employeeAid[:8]}... to company {card_data.companyName}")
        
        # Create context card
        context_card = ContextCard(
            employee_aid=card_data.employeeAid,
            company_aid=card_data.companyAid,
            company_name=card_data.companyName,
            encrypted_data=card_data.encryptedData,
            encryption_cipher_qb64=card_data.encryptionCipherQb64,
            shared_fields=card_data.sharedFields,
            purpose=card_data.purpose,
            credential_said=card_data.credentialSaid,
            expires_at=card_data.expiresAt
        )
        
        db.add(context_card)
        db.commit()
        db.refresh(context_card)
        
        logger.info(f"✅ Context card created with ID: {context_card.id}")
        return context_card
        
    except Exception as e:
        logger.error(f"❌ Failed to create context card: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create context card: {str(e)}")

@router.get("/context-cards/employee/{employee_aid}", response_model=List[ContextCardResponse])
async def get_employee_context_cards(
    employee_aid: str,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """Get all context cards for an employee"""
    try:
        query = db.query(ContextCard).filter(ContextCard.employee_aid == employee_aid)
        
        if not include_inactive:
            query = query.filter(ContextCard.is_active == True)
        
        cards = query.order_by(ContextCard.created_at.desc()).all()
        
        logger.info(f"Found {len(cards)} context cards for employee {employee_aid[:8]}...")
        return cards
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch employee context cards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch context cards: {str(e)}")

@router.get("/context-cards/{card_id}", response_model=ContextCardResponse)
async def get_context_card(
    card_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific context card by ID"""
    try:
        card = db.query(ContextCard).filter(ContextCard.id == card_id).first()
        
        if not card:
            raise HTTPException(status_code=404, detail="Context card not found")
        
        return card
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch context card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch context card: {str(e)}")

@router.get("/context-cards/{card_id}/encrypted", response_model=ContextCardWithDataResponse)
async def get_context_card_with_data(
    card_id: str,
    requesting_aid: str,
    db: Session = Depends(get_db)
):
    """Get context card with encrypted data (for authorized companies)"""
    try:
        card = db.query(ContextCard).filter(ContextCard.id == card_id).first()
        
        if not card:
            raise HTTPException(status_code=404, detail="Context card not found")
        
        # Verify requesting company has access
        if requesting_aid != card.company_aid:
            raise HTTPException(status_code=403, detail="Access denied - not authorized company")
        
        if not card.is_active:
            raise HTTPException(status_code=403, detail="Context card is inactive")
        
        if card.expires_at and card.expires_at < datetime.utcnow():
            raise HTTPException(status_code=403, detail="Context card has expired")
        
        # Log access
        access_log = ContextCardAccess(
            context_card_id=card.id,
            accessed_by_aid=requesting_aid,
            access_type="read"
        )
        db.add(access_log)
        
        # Update last accessed time
        card.last_accessed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Context card {card_id} accessed by company {requesting_aid[:8]}...")
        
        return ContextCardWithDataResponse(
            id=card.id,
            employeeAid=card.employee_aid,
            companyAid=card.company_aid,
            companyName=card.company_name,
            encryptedData=card.encrypted_data,
            encryptionCipherQb64=card.encryption_cipher_qb64,
            sharedFields=card.shared_fields,
            purpose=card.purpose,
            isActive=card.is_active,
            accessGrantedAt=card.access_granted_at,
            expiresAt=card.expires_at,
            lastAccessedAt=card.last_accessed_at,
            createdAt=card.created_at,
            updatedAt=card.updated_at,
            credentialSaid=card.credential_said,
            ipexGrantSaid=card.ipex_grant_said
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch context card with data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch context card: {str(e)}")

@router.put("/context-cards/{card_id}", response_model=ContextCardResponse)
async def update_context_card(
    card_id: str,
    updates: ContextCardUpdate,
    employee_aid: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """Update a context card (employee only)"""
    try:
        card = db.query(ContextCard).filter(ContextCard.id == card_id).first()
        
        if not card:
            raise HTTPException(status_code=404, detail="Context card not found")
        
        # Verify employee owns this card
        if card.employee_aid != employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - not your context card")
        
        # Update fields
        update_data = updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(card, field):
                setattr(card, field, value)
        
        card.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(card)
        
        logger.info(f"Context card {card_id} updated by employee {employee_aid[:8]}...")
        return card
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update context card: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update context card: {str(e)}")

@router.put("/context-cards/{card_id}/revoke")
async def revoke_context_card(
    card_id: str,
    employee_aid: str = Body(..., embed=True),
    db: Session = Depends(get_db)
):
    """Revoke access to a context card (employee only)"""
    try:
        card = db.query(ContextCard).filter(ContextCard.id == card_id).first()
        
        if not card:
            raise HTTPException(status_code=404, detail="Context card not found")
        
        # Verify employee owns this card
        if card.employee_aid != employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - not your context card")
        
        card.is_active = False
        card.updated_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Context card {card_id} revoked by employee {employee_aid[:8]}...")
        return {"message": "Context card access revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to revoke context card: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to revoke context card: {str(e)}")

@router.get("/context-cards/{card_id}/access-logs")
async def get_context_card_access_logs(
    card_id: str,
    employee_aid: str,
    db: Session = Depends(get_db)
):
    """Get access logs for a context card (employee only)"""
    try:
        card = db.query(ContextCard).filter(ContextCard.id == card_id).first()
        
        if not card:
            raise HTTPException(status_code=404, detail="Context card not found")
        
        # Verify employee owns this card
        if card.employee_aid != employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - not your context card")
        
        access_logs = db.query(ContextCardAccess).filter(
            ContextCardAccess.context_card_id == card_id
        ).order_by(ContextCardAccess.accessed_at.desc()).all()
        
        return access_logs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to fetch access logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch access logs: {str(e)}")

@router.get("/context-cards/company/{company_aid}")
async def get_company_context_cards(
    company_aid: str,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all context cards accessible to a company"""
    try:
        query = db.query(ContextCard).filter(ContextCard.company_aid == company_aid)
        
        if active_only:
            query = query.filter(
                ContextCard.is_active == True,
                (ContextCard.expires_at.is_(None) | (ContextCard.expires_at > datetime.utcnow()))
            )
        
        cards = query.order_by(ContextCard.created_at.desc()).all()
        
        logger.info(f"Found {len(cards)} context cards for company {company_aid[:8]}...")
        return cards
        
    except Exception as e:
        logger.error(f"❌ Failed to fetch company context cards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch context cards: {str(e)}")