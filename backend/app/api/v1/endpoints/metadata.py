"""Metadata-only endpoints (no direct KERIA calls)"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from sqlalchemy.orm import Session
from app.models.credentials import Credential
from app.models.employees import Employee

router = APIRouter(prefix="/metadata", tags=["Metadata"])


class CredentialMetadata(BaseModel):
    acdc_said: str = Field(..., description="Credential SAID from SignifyTS")
    employee_aid: str = Field(..., description="Employee AID")
    schema_said: Optional[str] = Field(None, description="Schema SAID")
    credential_type: Optional[str] = Field("travel_preferences", description="Type of credential")
    issued_at: Optional[str] = Field(None, description="ISO timestamp of issuance")
    expires_at: Optional[str] = Field(None, description="ISO timestamp of expiry")


@router.post("/travel-card")
async def store_travel_card_metadata(payload: CredentialMetadata, db: Session = Depends(get_db)):
    try:
        employee = db.query(Employee).filter(Employee.aid == payload.employee_aid).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        # Upsert credential metadata by SAID
        existing = db.query(Credential).filter(Credential.credential_said == payload.acdc_said).first()
        if existing:
            existing.updated_at = datetime.utcnow()
            db.commit()
            return {"success": True, "credential_said": existing.credential_said, "status": "updated"}

        cred = Credential(
            employee_aid=payload.employee_aid,
            credential_said=payload.acdc_said,
            schema_said=payload.schema_said or "",
            credential_type=payload.credential_type or "travel_preferences",
            status="active",
            acdc_metadata=None,
            issuer_aid=payload.employee_aid,
            issued_at=datetime.fromisoformat(payload.issued_at) if payload.issued_at else datetime.utcnow(),
            expires_at=datetime.fromisoformat(payload.expires_at) if payload.expires_at else None,
        )
        db.add(cred)
        db.commit()

        return {
            "success": True,
            "credential_said": payload.acdc_said,
            "employee_aid": payload.employee_aid,
            "status": "stored",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to store metadata: {str(e)}")


