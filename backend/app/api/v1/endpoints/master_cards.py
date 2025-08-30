from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.core.database import get_db
from app.models.master_cards import MasterCard, MasterCardAccessLog, MasterCardBackup
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

class MasterCardCreate(BaseModel):
    employeeAid: str
    encryptedProfileData: str
    encryptionCipherQb64: str
    profileCompleteness: dict
    profileVersion: str = "1.0"
    credentialSaid: Optional[str] = None

class MasterCardUpdate(BaseModel):
    encryptedProfileData: Optional[str] = None
    encryptionCipherQb64: Optional[str] = None
    profileCompleteness: Optional[dict] = None
    profileVersion: Optional[str] = None
    credentialSaid: Optional[str] = None

class MasterCardResponse(BaseModel):
    id: str
    employeeAid: str
    profileCompleteness: dict
    profileVersion: str
    isActive: bool
    createdAt: datetime
    updatedAt: datetime
    lastAccessedAt: Optional[datetime]
    credentialSaid: Optional[str]

    class Config:
        from_attributes = True

class MasterCardWithDataResponse(MasterCardResponse):
    encryptedProfileData: str
    encryptionCipherQb64: str

def verify_employee_access(x_employee_aid: str = Header(...)):
    """Verify employee AID header for authentication"""
    if not x_employee_aid or len(x_employee_aid) < 10:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Employee-AID header")
    return x_employee_aid

@router.post("/master-cards", response_model=MasterCardResponse)
async def create_master_card(
    card_data: MasterCardCreate,
    employee_aid: str = Depends(verify_employee_access),
    db: Session = Depends(get_db)
):
    """Create a new master card for an employee"""
    try:
        # Verify employee AID matches
        if card_data.employeeAid != employee_aid:
            raise HTTPException(status_code=403, detail="Employee AID mismatch")
        
        logger.info(f"Creating master card for employee {employee_aid[:8]}...")
        
        # Check if master card already exists
        existing_card = db.query(MasterCard).filter(
            MasterCard.employee_aid == employee_aid,
            MasterCard.is_active == True
        ).first()
        
        if existing_card:
            raise HTTPException(status_code=409, detail="Master card already exists for this employee")
        
        # Create master card
        master_card = MasterCard(
            employee_aid=card_data.employeeAid,
            encrypted_profile_data=card_data.encryptedProfileData,
            encryption_cipher_qb64=card_data.encryptionCipherQb64,
            profile_completeness=card_data.profileCompleteness,
            profile_version=card_data.profileVersion,
            credential_said=card_data.credentialSaid
        )
        
        db.add(master_card)
        db.commit()
        db.refresh(master_card)
        
        # Log access
        access_log = MasterCardAccessLog(
            master_card_id=master_card.id,
            access_type="create"
        )
        db.add(access_log)
        db.commit()
        
        logger.info(f"✅ Master card created with ID: {master_card.id}")
        return master_card
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to create master card: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create master card: {str(e)}")

@router.get("/master-cards/employee/{employee_aid}", response_model=MasterCardResponse)
async def get_employee_master_card(
    employee_aid: str,
    requesting_employee_aid: str = Depends(verify_employee_access),
    db: Session = Depends(get_db)
):
    """Get employee's master card (metadata only)"""
    try:
        # Verify employee can only access their own master card
        if employee_aid != requesting_employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - can only access your own master card")
        
        master_card = db.query(MasterCard).filter(
            MasterCard.employee_aid == employee_aid,
            MasterCard.is_active == True
        ).first()
        
        if not master_card:
            raise HTTPException(status_code=404, detail="Master card not found")
        
        # Log access
        access_log = MasterCardAccessLog(
            master_card_id=master_card.id,
            access_type="read"
        )
        db.add(access_log)
        
        # Update last accessed time
        master_card.last_accessed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Master card accessed by employee {employee_aid[:8]}...")
        return master_card
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get master card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get master card: {str(e)}")

@router.get("/master-cards/employee/{employee_aid}/encrypted", response_model=MasterCardWithDataResponse)
async def get_employee_master_card_encrypted(
    employee_aid: str,
    requesting_employee_aid: str = Depends(verify_employee_access),
    db: Session = Depends(get_db)
):
    """Get employee's master card with encrypted data (for decryption by employee)"""
    try:
        # Verify employee can only access their own master card
        if employee_aid != requesting_employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - can only access your own master card")
        
        master_card = db.query(MasterCard).filter(
            MasterCard.employee_aid == employee_aid,
            MasterCard.is_active == True
        ).first()
        
        if not master_card:
            raise HTTPException(status_code=404, detail="Master card not found")
        
        # Log access
        access_log = MasterCardAccessLog(
            master_card_id=master_card.id,
            access_type="decrypt"
        )
        db.add(access_log)
        
        # Update last accessed time
        master_card.last_accessed_at = datetime.utcnow()
        db.commit()
        
        logger.info(f"Master card encrypted data accessed by employee {employee_aid[:8]}...")
        
        return MasterCardWithDataResponse(
            id=master_card.id,
            employeeAid=master_card.employee_aid,
            encryptedProfileData=master_card.encrypted_profile_data,
            encryptionCipherQb64=master_card.encryption_cipher_qb64,
            profileCompleteness=master_card.profile_completeness,
            profileVersion=master_card.profile_version,
            isActive=master_card.is_active,
            createdAt=master_card.created_at,
            updatedAt=master_card.updated_at,
            lastAccessedAt=master_card.last_accessed_at,
            credentialSaid=master_card.credential_said
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get encrypted master card: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get encrypted master card: {str(e)}")

@router.put("/master-cards/employee/{employee_aid}", response_model=MasterCardResponse)
async def update_employee_master_card(
    employee_aid: str,
    updates: MasterCardUpdate,
    requesting_employee_aid: str = Depends(verify_employee_access),
    db: Session = Depends(get_db)
):
    """Update employee's master card"""
    try:
        # Verify employee can only update their own master card
        if employee_aid != requesting_employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - can only update your own master card")
        
        master_card = db.query(MasterCard).filter(
            MasterCard.employee_aid == employee_aid,
            MasterCard.is_active == True
        ).first()
        
        if not master_card:
            raise HTTPException(status_code=404, detail="Master card not found")
        
        # Create backup before updating
        backup = MasterCardBackup(
            master_card_id=master_card.id,
            backup_data=master_card.encrypted_profile_data,
            backup_reason="update"
        )
        db.add(backup)
        
        # Update fields
        update_data = updates.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "encryptedProfileData":
                master_card.encrypted_profile_data = value
            elif field == "encryptionCipherQb64":
                master_card.encryption_cipher_qb64 = value
            elif field == "profileCompleteness":
                master_card.profile_completeness = value
            elif field == "profileVersion":
                master_card.profile_version = value
            elif field == "credentialSaid":
                master_card.credential_said = value
        
        master_card.updated_at = datetime.utcnow()
        
        # Log access
        access_log = MasterCardAccessLog(
            master_card_id=master_card.id,
            access_type="update"
        )
        db.add(access_log)
        
        db.commit()
        db.refresh(master_card)
        
        logger.info(f"Master card updated by employee {employee_aid[:8]}...")
        return master_card
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to update master card: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update master card: {str(e)}")

@router.delete("/master-cards/employee/{employee_aid}")
async def delete_employee_master_card(
    employee_aid: str,
    requesting_employee_aid: str = Depends(verify_employee_access),
    db: Session = Depends(get_db)
):
    """Deactivate employee's master card (soft delete)"""
    try:
        # Verify employee can only delete their own master card
        if employee_aid != requesting_employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - can only delete your own master card")
        
        master_card = db.query(MasterCard).filter(
            MasterCard.employee_aid == employee_aid,
            MasterCard.is_active == True
        ).first()
        
        if not master_card:
            raise HTTPException(status_code=404, detail="Master card not found")
        
        # Create backup before deletion
        backup = MasterCardBackup(
            master_card_id=master_card.id,
            backup_data=master_card.encrypted_profile_data,
            backup_reason="deletion"
        )
        db.add(backup)
        
        # Soft delete (deactivate)
        master_card.is_active = False
        master_card.updated_at = datetime.utcnow()
        
        # Log access
        access_log = MasterCardAccessLog(
            master_card_id=master_card.id,
            access_type="delete"
        )
        db.add(access_log)
        
        db.commit()
        
        logger.info(f"Master card deactivated by employee {employee_aid[:8]}...")
        return {"message": "Master card successfully deactivated"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to delete master card: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete master card: {str(e)}")

@router.get("/master-cards/employee/{employee_aid}/access-logs")
async def get_master_card_access_logs(
    employee_aid: str,
    requesting_employee_aid: str = Depends(verify_employee_access),
    db: Session = Depends(get_db)
):
    """Get access logs for employee's master card"""
    try:
        # Verify employee can only access their own logs
        if employee_aid != requesting_employee_aid:
            raise HTTPException(status_code=403, detail="Access denied - can only access your own logs")
        
        master_card = db.query(MasterCard).filter(
            MasterCard.employee_aid == employee_aid
        ).first()
        
        if not master_card:
            raise HTTPException(status_code=404, detail="Master card not found")
        
        access_logs = db.query(MasterCardAccessLog).filter(
            MasterCardAccessLog.master_card_id == master_card.id
        ).order_by(MasterCardAccessLog.accessed_at.desc()).all()
        
        return access_logs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to get access logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get access logs: {str(e)}")