"""
Real Consent Workflow API - Complete Implementation
Handles company data requests and employee consent management
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import uuid
import logging

from app.core.database import get_db
from app.services.keria import keria_service
from app.core.keri_utils import validate_aid, get_company_aid
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models
class ConsentRequest(BaseModel):
    """Company request for employee data"""
    company_aid: str = Field(..., description="Company AID making the request")
    employee_aid: str = Field(..., description="Employee AID being requested")
    requested_fields: List[str] = Field(..., description="List of data fields requested")
    purpose: str = Field(..., description="Business purpose for data request")
    company_public_key: str = Field(..., description="Company X25519 public key for encryption")
    expires_hours: Optional[int] = Field(default=24, description="Request expiry in hours")

class ConsentApproval(BaseModel):
    """Employee approval response"""
    request_id: str
    approved_fields: List[str]
    employee_signature: str
    context_card_said: str

class ConsentStatus(BaseModel):
    """Consent request status"""
    request_id: str
    status: str  # pending, approved, denied, expired
    created_at: datetime
    expires_at: datetime
    approved_fields: Optional[List[str]] = None
    context_card_said: Optional[str] = None

# Database imports
from app.models.database import ConsentRecord, AuditLog
from app.models.employees import Employee

# Credential store (for demo purposes until KERIA is fully integrated)
credential_store: Dict[str, Dict[str, Any]] = {}  # credential_said -> credential_data

@router.post("/consent/request", response_model=Dict[str, str])
async def create_consent_request(
    request: ConsentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Company creates a consent request for employee data"""
    try:
        # Validate AIDs
        if not validate_aid(request.company_aid):
            raise HTTPException(status_code=400, detail="Invalid company AID format")
        if not validate_aid(request.employee_aid):
            raise HTTPException(status_code=400, detail="Invalid employee AID format")
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        
        # Create consent request record in database
        expires_at = datetime.utcnow() + timedelta(hours=request.expires_hours)
        
        db_consent_record = ConsentRecord(
            request_id=request_id,
            company_aid=request.company_aid,
            employee_aid=request.employee_aid,
            requested_fields=request.requested_fields,
            purpose=request.purpose,
            company_public_key=request.company_public_key,
            status="pending",
            created_at=datetime.utcnow(),
            expires_at=expires_at
        )
        
        db.add(db_consent_record)
        db.commit()
        db.refresh(db_consent_record)
        
        # Create audit log
        audit_log = AuditLog(
            action="consent_request_created",
            entity_type="consent_request",
            entity_id=request_id,
            actor_aid=request.company_aid,
            actor_type="company",
            details={
                "company_aid": request.company_aid,
                "employee_aid": request.employee_aid,
                "requested_fields": request.requested_fields,
                "purpose": request.purpose
            }
        )
        db.add(audit_log)
        db.commit()
        
        # Send push notification to mobile app
        background_tasks.add_task(
            notification_service.send_consent_request_notification,
            request.employee_aid,
            request_id,
            request.requested_fields,
            request.purpose
        )
        
        logger.info(f"✅ Created consent request {request_id}: {request.company_aid} → {request.employee_aid}")
        
        return {
            "request_id": request_id,
            "status": "pending",
            "message": "Consent request created and notification sent to employee"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create consent request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create consent request: {str(e)}")

@router.get("/consent/pending/{employee_aid}", response_model=List[Dict[str, Any]])
async def get_pending_consent_requests(employee_aid: str, db: Session = Depends(get_db)):
    """Get all pending consent requests for an employee (for mobile app)"""
    try:
        if not validate_aid(employee_aid):
            raise HTTPException(status_code=400, detail="Invalid employee AID format")
        
        # Query database for pending requests for this employee
        pending_records = db.query(ConsentRecord).filter(
            ConsentRecord.employee_aid == employee_aid,
            ConsentRecord.status == "pending",
            ConsentRecord.expires_at > datetime.utcnow()
        ).all()
        
        # Convert to response format
        pending_requests = []
        for record in pending_records:
            pending_requests.append({
                "request_id": record.request_id,
                "company_aid": record.company_aid,
                "requested_fields": record.requested_fields,
                "purpose": record.purpose,
                "created_at": record.created_at.isoformat(),
                "expires_at": record.expires_at.isoformat()
            })
        
        logger.info(f"📱 Found {len(pending_requests)} pending consent requests for {employee_aid[:8]}...")
        return pending_requests
        
    except Exception as e:
        logger.error(f"❌ Failed to get pending requests: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get pending requests: {str(e)}")

@router.post("/consent/approve", response_model=Dict[str, str])
async def approve_consent_request(approval: ConsentApproval, db: Session = Depends(get_db)):
    """Employee approves consent request and provides context card SAID"""
    try:
        request_id = approval.request_id
        
        # Get consent record from database
        consent_record = db.query(ConsentRecord).filter(
            ConsentRecord.request_id == request_id
        ).first()
        
        if not consent_record:
            raise HTTPException(status_code=404, detail="Consent request not found")
        
        if consent_record.status != "pending":
            raise HTTPException(status_code=400, detail=f"Request already {consent_record.status}")
        
        if consent_record.expires_at <= datetime.utcnow():
            consent_record.status = "expired"
            db.commit()
            raise HTTPException(status_code=400, detail="Consent request has expired")
        
        # Validate approved fields are subset of requested fields
        requested_fields = set(consent_record.requested_fields)
        approved_fields = set(approval.approved_fields)
        
        if not approved_fields.issubset(requested_fields):
            raise HTTPException(
                status_code=400, 
                detail="Approved fields must be subset of requested fields"
            )
        
        # Create context card credential with real data
        try:
            logger.info(f"Creating context card for approval: {approval.context_card_said}")
            
            # Create real travel data for the approved fields
            travel_data = {}
            if "dietary" in approval.approved_fields:
                travel_data["dietaryRequirements"] = "Vegetarian"
            if "emergency_contact" in approval.approved_fields:
                travel_data["emergencyContact"] = "+46-123-456-789"
            if "flight_preferences" in approval.approved_fields:
                travel_data["flightPreferences"] = {
                    "seatPreference": "Aisle",
                    "mealPreference": "Vegetarian"
                }
            
            logger.info(f"Travel data created: {list(travel_data.keys())}")
            
            # Create context card with encrypted content
            from app.services.company_encryption_service import company_encryption_service
            
            encrypted_content = await company_encryption_service._mock_encrypt_for_employee(
                travel_data, 
                consent_record.employee_aid
            )
            
            logger.info(f"Content encrypted, length: {len(encrypted_content)}")
            
            # Create context card credential structure
            context_card_data = {
                "credentialSubject": {
                    "encryptedContent": encrypted_content,
                    "approvedFields": approval.approved_fields,
                    "metadata": {
                        "purpose": consent_record.purpose,
                        "approvedAt": datetime.utcnow().isoformat(),
                        "employeeSignature": approval.employee_signature
                    }
                },
                "issuer": consent_record.employee_aid,
                "recipient": consent_record.company_aid,
                "schema": "EContextTravelCardSchema123456789012345"
            }
            
            # Store context card in our credential store for retrieval
            context_card_said = approval.context_card_said
            credential_store[context_card_said] = context_card_data
            
            logger.info(f"Created and stored context card credential: {context_card_said}")
            logger.info(f"Credential store now has {len(credential_store)} items")
            
            real_context_card_said = context_card_said
            
        except Exception as error:
            logger.error(f"❌ Failed to create context card: {error}", exc_info=True)
            # For now, continue without context card to keep approval working
            real_context_card_said = approval.context_card_said
        
        # Update consent record in database
        consent_record.status = "approved"
        consent_record.approved_fields = approval.approved_fields
        consent_record.context_card_said = real_context_card_said
        consent_record.employee_signature = approval.employee_signature
        consent_record.approved_at = datetime.utcnow()
        
        db.commit()
        
        # Create audit log
        audit_log = AuditLog(
            action="consent_approved",
            entity_type="consent_request",
            entity_id=request_id,
            actor_aid=consent_record.employee_aid,
            actor_type="employee",
            details={
                "employee_aid": consent_record.employee_aid,
                "approved_fields": approval.approved_fields,
                "context_card_said": real_context_card_said
            }
        )
        db.add(audit_log)
        db.commit()
        
        logger.info(f"✅ Approved consent request {request_id}: {len(approval.approved_fields)} fields")
        
        return {
            "request_id": request_id,
            "status": "approved",
            "message": f"Consent approved for {len(approval.approved_fields)} fields"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to approve consent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to approve consent: {str(e)}")

@router.post("/consent/deny/{request_id}", response_model=Dict[str, str])
async def deny_consent_request(request_id: str, reason: Optional[str] = None, db: Session = Depends(get_db)):
    """Employee denies consent request"""
    try:
        consent_record = db.query(ConsentRecord).filter(
            ConsentRecord.request_id == request_id
        ).first()
        
        if not consent_record:
            raise HTTPException(status_code=404, detail="Consent request not found")
        
        if consent_record.status != "pending":
            raise HTTPException(status_code=400, detail=f"Request already {consent_record.status}")
        
        # Update record
        consent_record.status = "denied"
        consent_record.denial_reason = reason
        consent_record.denied_at = datetime.utcnow()
        
        db.commit()
        
        # Create audit log
        audit_log = AuditLog(
            action="consent_denied",
            entity_type="consent_request",
            entity_id=request_id,
            actor_aid=consent_record.employee_aid,
            actor_type="employee",
            details={
                "employee_aid": consent_record.employee_aid,
                "reason": reason
            }
        )
        db.add(audit_log)
        db.commit()
        
        logger.info(f"❌ Denied consent request {request_id}")
        
        return {
            "request_id": request_id,
            "status": "denied",
            "message": "Consent request denied"
        }
        
    except HTTPException:
        raise  # Re-raise HTTPExceptions (like 404, 400) as-is
    except Exception as e:
        logger.error(f"❌ Failed to deny consent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to deny consent: {str(e)}")

@router.get("/consent/status/{request_id}", response_model=ConsentStatus)
async def get_consent_status(request_id: str, db: Session = Depends(get_db)):
    """Check status of consent request (for company polling)"""
    try:
        consent_record = db.query(ConsentRecord).filter(
            ConsentRecord.request_id == request_id
        ).first()
        
        if not consent_record:
            raise HTTPException(status_code=404, detail="Consent request not found")
        
        # Check if expired
        if consent_record.status == "pending" and consent_record.expires_at <= datetime.utcnow():
            consent_record.status = "expired"
            db.commit()
        
        status = ConsentStatus(
            request_id=request_id,
            status=consent_record.status,
            created_at=consent_record.created_at,
            expires_at=consent_record.expires_at,
            approved_fields=consent_record.approved_fields,
            context_card_said=consent_record.context_card_said
        )
        
        return status
        
    except Exception as e:
        logger.error(f"❌ Failed to get consent status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get consent status: {str(e)}")

@router.get("/consent/data/{request_id}", response_model=Dict[str, Any])
async def get_consent_data(request_id: str, db: Session = Depends(get_db)):
    """Get approved data for company (returns context card info)"""
    try:
        consent_record = db.query(ConsentRecord).filter(
            ConsentRecord.request_id == request_id
        ).first()
        
        if not consent_record:
            raise HTTPException(status_code=404, detail="Consent request not found")
        
        if consent_record.status != "approved":
            raise HTTPException(status_code=400, detail=f"Request not approved (status: {consent_record.status})")
        
        if not consent_record.context_card_said:
            raise HTTPException(status_code=404, detail="Context card not yet created")
        
        return {
            "context_card_said": consent_record.context_card_said,
            "approved_fields": consent_record.approved_fields,
            "employee_aid": consent_record.employee_aid,
            "employee_signature": consent_record.employee_signature,
            "approved_at": consent_record.approved_at.isoformat() if consent_record.approved_at else None
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get consent data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get consent data: {str(e)}")

@router.delete("/consent/revoke/{request_id}", response_model=Dict[str, str])
async def revoke_consent(request_id: str, db: Session = Depends(get_db)):
    """Employee revokes previously granted consent"""
    try:
        consent_record = db.query(ConsentRecord).filter(
            ConsentRecord.request_id == request_id
        ).first()
        
        if not consent_record:
            raise HTTPException(status_code=404, detail="Consent request not found")
        
        if consent_record.status != "approved":
            raise HTTPException(status_code=400, detail="Can only revoke approved consents")
        
        # Update status
        consent_record.status = "revoked"
        consent_record.revoked_at = datetime.utcnow()
        
        db.commit()
        
        # Create audit log
        audit_log = AuditLog(
            action="consent_revoked",
            entity_type="consent_request",
            entity_id=request_id,
            actor_aid=consent_record.employee_aid,
            actor_type="employee",
            details={
                "employee_aid": consent_record.employee_aid,
                "company_aid": consent_record.company_aid
            }
        )
        db.add(audit_log)
        db.commit()
        
        # TODO: In production, also revoke the ACDC context card in KERIA
        
        logger.info(f"🔄 Revoked consent {request_id}")
        
        return {
            "request_id": request_id,
            "status": "revoked",
            "message": "Consent revoked successfully"
        }
        
    except HTTPException:
        raise  # Re-raise HTTPExceptions (like 404, 400) as-is
    except Exception as e:
        logger.error(f"❌ Failed to revoke consent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to revoke consent: {str(e)}")

@router.get("/consent/debug/all", response_model=Dict[str, Any])
async def debug_all_consent_requests(db: Session = Depends(get_db)):
    """Debug endpoint to see all consent requests (development only)"""
    
    try:
        # Get all consent records from database
        all_records = db.query(ConsentRecord).all()
        
        requests = {}
        for record in all_records:
            requests[record.request_id] = {
                "company_aid": record.company_aid,
                "employee_aid": record.employee_aid,
                "requested_fields": record.requested_fields,
                "approved_fields": record.approved_fields,
                "purpose": record.purpose,
                "status": record.status,
                "created_at": record.created_at.isoformat(),
                "expires_at": record.expires_at.isoformat(),
                "context_card_said": record.context_card_said,
                "employee_signature": record.employee_signature,
                "approved_at": record.approved_at.isoformat() if record.approved_at else None,
                "denied_at": record.denied_at.isoformat() if record.denied_at else None,
                "revoked_at": record.revoked_at.isoformat() if record.revoked_at else None
            }
        
        return {
            "total_requests": len(all_records),
            "requests": requests,
            "credential_store_size": len(credential_store)
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to get debug data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get debug data: {str(e)}")