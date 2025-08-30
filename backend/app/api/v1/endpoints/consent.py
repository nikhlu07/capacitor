"""
Consent Management API Endpoints
REST API for employee consent control in Travlr-ID system
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import logging

from app.services.keria import keria_service
# from app.core.database import get_db
# from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for consent management
class ConsentSettings(BaseModel):
    """Employee consent settings for data sharing"""
    share_with_scania: bool = Field(..., description="Allow Scania to access travel data")
    share_flight_prefs: bool = Field(default=False, description="Share flight preferences")
    share_hotel_prefs: bool = Field(default=False, description="Share hotel preferences")
    share_accessibility_needs: bool = Field(default=False, description="Share accessibility requirements")
    share_emergency_contact: bool = Field(default=False, description="Share emergency contact info")
    ai_processing_consent: bool = Field(default=False, description="Allow AI processing of travel data")
    data_retention_days: int = Field(default=365, ge=30, le=2555, description="Data retention period in days")

class ConsentRequest(BaseModel):
    """Request to update employee consent settings"""
    employee_id: str = Field(..., description="Employee identifier")
    consent_settings: ConsentSettings
    reason: Optional[str] = Field(None, description="Reason for consent change")

class ConsentResponse(BaseModel):
    """Response for consent operations"""
    success: bool
    employee_id: str
    consent_settings: ConsentSettings
    updated_at: datetime
    expires_at: datetime
    consent_id: str

class ConsentAuditEntry(BaseModel):
    """Audit entry for consent changes"""
    consent_id: str
    employee_id: str
    action: str  # "granted", "revoked", "updated"
    changed_fields: List[str]
    reason: Optional[str]
    timestamp: datetime
    ip_address: Optional[str]

class DataAccessRequest(BaseModel):
    """Request for data access by external party"""
    requester: str = Field(..., description="Who is requesting access (e.g., 'scania-admin', 'scania-ai')")
    employee_id: str = Field(..., description="Employee whose data is requested")
    requested_fields: List[str] = Field(..., description="List of data fields requested")
    purpose: str = Field(..., description="Purpose of data access")

class DataAccessResponse(BaseModel):
    """Response for data access requests"""
    access_granted: bool
    employee_id: str
    disclosed_fields: List[str]
    denied_fields: List[str]
    access_token: Optional[str]
    expires_at: Optional[datetime]
    audit_id: str

# Database imports for production storage
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.database import ConsentRecord, AuditLog

# In-memory storage for demo (in production use database)
consent_storage: Dict[str, Dict[str, Any]] = {}

@router.post("/consent/grant", response_model=ConsentResponse)
async def grant_consent(
    consent_request: ConsentRequest,
    db: Session = Depends(get_db)
):
    """
    Grant or update employee consent settings and create encrypted context card
    """
    try:
        # Generate unique consent ID
        consent_id = f"consent-{consent_request.employee_id}-{int(datetime.now().timestamp())}"
        
        # Create consent record in PostgreSQL
        consent_record = ConsentRecord(
            consent_id=consent_id,
            employee_id=consent_request.employee_id,
            company=consent_request.company,
            data_types=consent_request.data_types,
            purposes=consent_request.purposes,
            retention_period=consent_request.retention_period,
            can_withdraw=consent_request.can_withdraw,
            third_party_sharing=consent_request.third_party_sharing,
            granted_at=datetime.now(),
            status="active",
            version="1.0"
        )
        
        # Store consent in PostgreSQL
        db.add(consent_record)
        db.commit()
        db.refresh(consent_record)
        
        # Create encrypted context card for company if master card exists
        context_card_created = False
        if hasattr(consent_request, 'master_credential_said') and consent_request.master_credential_said:
            try:
                from app.services.keria import keria_service
                
                # Create encrypted context card for company
                context_result = await keria_service.create_company_context_card(
                    employee_aid=consent_request.employee_aid,
                    company_aid=consent_request.company_aid,
                    company_public_key=consent_request.company_public_key,
                    approved_fields=consent_request.data_types,
                    master_credential_said=consent_request.master_credential_said
                )
                
                # Store context card reference in consent record
                consent_record["context_card_said"] = context_result["context_card_said"]
                consent_record["encrypted_delivery"] = True
                consent_record["zero_trust_validated"] = context_result["zero_trust_validated"]
                context_card_created = True
                
                logger.info(f"✅ Created encrypted context card: {context_result['context_card_said']}")
                
            except Exception as e:
                logger.warning(f"Failed to create context card: {e}")
                # Continue with consent grant even if context card creation fails
        
        # Create audit entry
        audit_entry = ConsentAuditEntry(
            employee_id=consent_request.employee_id,
            action="consent_granted_with_encryption" if context_card_created else "consent_granted",
            data_types=consent_request.data_types,
            company=consent_request.company,
            timestamp=datetime.now(),
            ip_address="127.0.0.1",  # In production, get from request
            user_agent="Travlr-Mobile-App/1.0"
        )
        audit_storage.append(audit_entry.dict())
        
        logger.info(f"✅ Consent granted for employee {consent_request.employee_id} (encrypted: {context_card_created})")
        
        return ConsentResponse(
            success=True,
            consent_id=consent_id,
            employee_id=consent_request.employee_id,
            company=consent_request.company,
            status="active",
            granted_at=datetime.now(),
            encrypted_delivery=context_card_created,
            zero_trust_validated=context_card_created,
            message=f"Consent granted successfully for {len(consent_request.data_types)} data types" + 
                   (" with encrypted context card" if context_card_created else "")
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to process consent request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process consent request: {str(e)}")

@router.get("/consent/{employee_id}", response_model=ConsentResponse)
async def get_consent(
    employee_id: str
    # db: Session = Depends(get_db)
):
    """
    Get current consent settings for an employee
    """
    try:
        if employee_id not in consent_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No consent record found for employee: {employee_id}"
            )
        
        consent_record = consent_storage[employee_id]
        
        # Check if consent has expired
        if datetime.now() > consent_record["expires_at"]:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Consent has expired"
            )
        
        return ConsentResponse(
            success=True,
            employee_id=employee_id,
            consent_settings=ConsentSettings(**consent_record["consent_settings"]),
            updated_at=consent_record["updated_at"],
            expires_at=consent_record["expires_at"],
            consent_id=consent_record["consent_id"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get consent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve consent: {str(e)}"
        )

@router.delete("/consent/{employee_id}")
async def revoke_consent(
    employee_id: str,
    reason: Optional[str] = None
    # db: Session = Depends(get_db)
):
    """
    Revoke all consent for an employee
    """
    try:
        if employee_id not in consent_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No consent record found for employee: {employee_id}"
            )
        
        # Mark consent as revoked
        consent_record = consent_storage[employee_id]
        consent_record["active"] = False
        consent_record["revoked_at"] = datetime.now()
        
        # Create audit entry
        audit_entry = ConsentAuditEntry(
            consent_id=consent_record["consent_id"],
            employee_id=employee_id,
            action="revoked",
            changed_fields=["all"],
            reason=reason or "Employee revoked consent",
            timestamp=datetime.now(),
            ip_address=None
        )
        
        audit_storage.append(audit_entry.dict())
        
        logger.info(f"Consent revoked for employee {employee_id}")
        
        return {
            "success": True,
            "message": f"Consent revoked for employee {employee_id}",
            "revoked_at": datetime.now()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke consent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke consent: {str(e)}"
        )

@router.post("/consent/access-request", response_model=DataAccessResponse)
async def request_data_access(
    access_request: DataAccessRequest
    # db: Session = Depends(get_db)
):
    """
    Request access to employee data based on consent settings
    """
    try:
        logger.info(f"Data access request from {access_request.requester} for employee {access_request.employee_id}")
        
        # Check if employee has active consent
        if access_request.employee_id not in consent_storage:
            return DataAccessResponse(
                access_granted=False,
                employee_id=access_request.employee_id,
                disclosed_fields=[],
                denied_fields=access_request.requested_fields,
                access_token=None,
                expires_at=None,
                audit_id=f"audit-{int(datetime.now().timestamp())}"
            )
        
        consent_record = consent_storage[access_request.employee_id]
        
        # Check if consent is active and not expired
        if not consent_record["active"] or datetime.now() > consent_record["expires_at"]:
            return DataAccessResponse(
                access_granted=False,
                employee_id=access_request.employee_id,
                disclosed_fields=[],
                denied_fields=access_request.requested_fields,
                access_token=None,
                expires_at=None,
                audit_id=f"audit-{int(datetime.now().timestamp())}"
            )
        
        consent_settings = consent_record["consent_settings"]
        
        # Determine which fields can be disclosed based on consent
        disclosed_fields = []
        denied_fields = []
        
        # Map requested fields to consent settings
        field_consent_mapping = {
            "employee_info": consent_settings.get("share_with_scania", False),
            "flight_preferences": consent_settings.get("share_flight_prefs", False),
            "hotel_preferences": consent_settings.get("share_hotel_prefs", False),
            "accessibility_needs": consent_settings.get("share_accessibility_needs", False),
            "emergency_contact": consent_settings.get("share_emergency_contact", False)
        }
        
        # Special handling for AI requests
        if access_request.requester.endswith("-ai"):
            ai_consent = consent_settings.get("ai_processing_consent", False)
            if not ai_consent:
                # AI access denied entirely
                denied_fields = access_request.requested_fields
            else:
                # AI gets anonymized data only
                for field in access_request.requested_fields:
                    if field in ["flight_preferences", "hotel_preferences"]:
                        disclosed_fields.append(field)
                    else:
                        denied_fields.append(field)
        else:
            # Regular access based on field-specific consent
            for field in access_request.requested_fields:
                if field in field_consent_mapping and field_consent_mapping[field]:
                    disclosed_fields.append(field)
                else:
                    denied_fields.append(field)
        
        access_granted = len(disclosed_fields) > 0
        access_token = None
        expires_at = None
        
        if access_granted:
            access_token = f"token-{access_request.employee_id}-{int(datetime.now().timestamp())}"
            expires_at = datetime.now() + timedelta(hours=1)  # Token valid for 1 hour
        
        # Create audit entry
        audit_id = f"audit-{int(datetime.now().timestamp())}"
        audit_entry = {
            "audit_id": audit_id,
            "employee_id": access_request.employee_id,
            "requester": access_request.requester,
            "purpose": access_request.purpose,
            "requested_fields": access_request.requested_fields,
            "disclosed_fields": disclosed_fields,
            "denied_fields": denied_fields,
            "access_granted": access_granted,
            "timestamp": datetime.now()
        }
        
        audit_storage.append(audit_entry)
        
        logger.info(f"Data access {'granted' if access_granted else 'denied'} for {access_request.requester}")
        
        return DataAccessResponse(
            access_granted=access_granted,
            employee_id=access_request.employee_id,
            disclosed_fields=disclosed_fields,
            denied_fields=denied_fields,
            access_token=access_token,
            expires_at=expires_at,
            audit_id=audit_id
        )
        
    except Exception as e:
        logger.error(f"Failed to process data access request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process data access request: {str(e)}"
        )

@router.get("/consent/{employee_id}/audit", response_model=List[Dict[str, Any]])
async def get_consent_audit(
    employee_id: str,
    limit: int = 50
    # db: Session = Depends(get_db)
):
    """
    Get audit trail for employee consent changes and data access
    """
    try:
        # Filter audit entries for this employee
        employee_audit = [
            entry for entry in audit_storage 
            if entry.get("employee_id") == employee_id
        ]
        
        # Sort by timestamp (most recent first) and limit
        employee_audit.sort(key=lambda x: x.get("timestamp", datetime.min), reverse=True)
        employee_audit = employee_audit[:limit]
        
        return employee_audit
        
    except Exception as e:
        logger.error(f"Failed to get audit trail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit trail: {str(e)}"
        )

@router.get("/consent/stats")
async def get_consent_stats():
    """
    Get consent statistics for admin dashboard
    """
    try:
        total_employees = len(consent_storage)
        active_consents = len([c for c in consent_storage.values() if c["active"]])
        expired_consents = len([
            c for c in consent_storage.values() 
            if datetime.now() > c["expires_at"]
        ])
        
        # Consent breakdown
        scania_sharing = len([
            c for c in consent_storage.values() 
            if c["consent_settings"].get("share_with_scania", False)
        ])
        
        ai_consent = len([
            c for c in consent_storage.values() 
            if c["consent_settings"].get("ai_processing_consent", False)
        ])
        
        return {
            "total_employees": total_employees,
            "active_consents": active_consents,
            "expired_consents": expired_consents,
            "scania_sharing_consent": scania_sharing,
            "ai_processing_consent": ai_consent,
            "total_audit_entries": len(audit_storage),
            "last_updated": datetime.now()
        }
        
    except Exception as e:
        logger.error(f"Failed to get consent stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve consent statistics: {str(e)}"
        )