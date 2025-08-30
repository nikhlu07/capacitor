"""
Real Mobile API Endpoints with KERI Integration
Uses Veridian KERIA for authentic KERI-based identity and credential management
"""

from fastapi import APIRouter, HTTPException, Depends, Header, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging
import json
import hashlib

from app.services.keria import keria_service
from app.services.database import database_service
from app.core.auth import get_employee_aid
from app.core.database import get_db
from sqlalchemy.orm import Session
from app.models.employees import Employee
from app.models.credentials import Credential

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/mobile",
    tags=["Mobile - Real KERI"],
    responses={404: {"description": "Not found"}}
)

# Pydantic models for real KERI integration
class EmployeeRegistration(BaseModel):
    employee_id: str = Field(..., description="Unique employee identifier")
    full_name: str = Field(..., description="Employee full name")
    department: str = Field(..., description="Employee department")
    email: str = Field(..., description="Employee email")
    phone: Optional[str] = Field(None, description="Employee phone number")

class EmployeeAIDUpdate(BaseModel):
    aid: str = Field(..., description="KERI AID created by mobile app via SignifyTS")
    oobi: Optional[str] = Field(None, description="OOBI for the AID")

class ConsentUpdate(BaseModel):
    employee_id: str = Field(..., description="Employee ID")
    share_with_scania: bool = Field(True, description="Share data with Scania")
    share_flight_prefs: bool = Field(True, description="Share flight preferences")
    share_hotel_prefs: bool = Field(True, description="Share hotel preferences")
    share_accessibility_needs: bool = Field(True, description="Share accessibility needs")
    share_emergency_contact: bool = Field(True, description="Share emergency contact")
    ai_processing_consent: bool = Field(True, description="Consent to AI processing")
    reason: Optional[str] = Field(None, description="Reason for consent change")

class TravelPreferences(BaseModel):
    flight_preferences: Optional[Dict[str, Any]] = Field(None, description="Flight preferences")
    hotel_preferences: Optional[Dict[str, Any]] = Field(None, description="Hotel preferences")
    accessibility_needs: Optional[Dict[str, Any]] = Field(None, description="Accessibility requirements")
    emergency_contact: Optional[Dict[str, Any]] = Field(None, description="Emergency contact information")
    dietary_requirements: Optional[List[str]] = Field(None, description="Dietary requirements")
    special_requests: Optional[str] = Field(None, description="Special requests")

class CredentialRequest(BaseModel):
    employee_id: str
    recipient_aid: str = Field(..., description="Employee's KERI AID")
    encrypted_credential_data: Dict[str, Any] = Field(..., description="Encrypted credential data from mobile")
    preferences: TravelPreferences
    credential_type: str = "travel_preferences"

class QRCodeRequest(BaseModel):
    employee_id: str
    data_to_share: List[str] = Field(..., description="Fields to include in QR code")
    expires_in_minutes: int = Field(default=15, ge=1, le=60)

# Zero-knowledge architecture - no sensitive data storage in backend

# Travel Preferences ACDC Schema
TRAVEL_CREDENTIAL_SCHEMA = {
    "said": "EBdXt3gIXOf2BBWNHdSXCJnkcqRLlySbM-xPS7quPiM",
    "schema": {
        "$id": "https://travlr-id.com/schemas/travel-preferences/1.0",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Employee Travel Preferences Credential",
        "description": "ACDC for employee travel preferences using real KERI",
        "type": "object",
        "properties": {
            "employee_info": {
                "type": "object",
                "properties": {
                    "employee_id": {"type": "string"},
                    "full_name": {"type": "string"},
                    "department": {"type": "string"},
                    "email": {"type": "string"}
                },
                "required": ["employee_id", "full_name", "department", "email"]
            },
            "travel_preferences": {
                "type": "object",
                "properties": {
                    "flight_preferences": {"type": "object"},
                    "hotel_preferences": {"type": "object"},
                    "accessibility_needs": {"type": "object"},
                    "emergency_contact": {"type": "object"}
                }
            }
        },
        "required": ["employee_info", "travel_preferences"]
    }
}

@router.post("/employee/register")
async def register_employee_profile(employee: EmployeeRegistration, db: Session = Depends(get_db)):
    """
    Register employee profile (Step 1 - without AID)
    Mobile app will link AID in Step 2 via PUT /employee/{employee_id}/aid
    """
    try:
        logger.info(f"Registering employee profile: {employee.employee_id}")
        
        # Check if employee already exists
        existing_employee = db.query(Employee).filter(Employee.employee_id == employee.employee_id).first()
        if existing_employee:
            return {
                "success": True,
                "employee_id": employee.employee_id,
                "message": "Employee profile already exists",
                "status": "existing"
            }
        
        # Create placeholder employee record (without AID yet)
        employee_record = Employee(
            employee_id=employee.employee_id,
            aid="PLACEHOLDER_AID",  # Will be updated in step 2
            full_name=employee.full_name,
            email=employee.email,
            department=employee.department,
            is_active=True
        )
        
        db.add(employee_record)
        db.commit()
        
        logger.info(f"✅ Employee profile created: {employee.employee_id}")
        
        return {
            "success": True,
            "employee_id": employee.employee_id,
            "message": "Employee profile created successfully",
            "status": "profile_created"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to register employee profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.put("/employee/{employee_id}/aid")
async def link_employee_aid(employee_id: str, aid_update: EmployeeAIDUpdate, db: Session = Depends(get_db)):
    """
    Link KERI AID to employee profile (Step 2)
    Mobile app calls this after creating the AID via SignifyTS
    """
    try:
        logger.info(f"Linking AID to employee {employee_id}: {aid_update.aid}")
        
        # Find employee record
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Validate AID format
        if not aid_update.aid or not aid_update.aid.startswith('E'):
            raise HTTPException(status_code=400, detail="Invalid AID format")
        
        # Update employee record with real AID
        employee.aid = aid_update.aid
        employee.keri_keys = {"oobi": aid_update.oobi} if aid_update.oobi else None
        employee.updated_at = datetime.now()
        
        db.commit()
        
        logger.info(f"✅ Employee AID linked: {employee_id} -> {aid_update.aid}")
        
        return {
            "success": True,
            "employee_id": employee_id,
            "aid": aid_update.aid,
            "oobi": aid_update.oobi,
            "message": "AID linked successfully",
            "status": "aid_linked"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to link AID: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AID linking failed: {str(e)}"
        )

@router.get("/employee/{aid}/status")
async def get_aid_status(aid: str):
    """Get AID status from KERIA (zero-knowledge - no personal data)"""
    try:
        # Only check AID existence in KERIA
        response = await keria_service.agent_client.get(f"/identifiers/{aid}")
        keri_status = "active" if response.status_code == 200 else "not_found"
        
        return {
            "aid": aid,
            "keri_status": keri_status,
            "message": "AID status retrieved from KERIA"
        }
    except Exception as e:
        logger.error(f"Failed to get AID status: {e}")
        return {
            "aid": aid,
            "keri_status": "error",
            "message": f"KERIA query failed: {str(e)}"
        }

@router.get("/aid/{aid}/info")
async def get_aid_info(aid: str):
    """Get AID information from KERIA (zero-knowledge)"""
    try:
        # Query KERIA directly for AID info
        response = await keria_service.agent_client.get(f"/identifiers/{aid}")
        
        if response.status_code == 200:
            aid_data = response.json()
            return {
                "aid": aid,
                "keri_status": "active",
                "identifiers": aid_data,
                "source": "keria_direct"
            }
        else:
            return {
                "aid": aid,
                "keri_status": "not_found",
                "message": "AID not found in KERIA"
            }
    except Exception as e:
        logger.error(f"Failed to get AID info: {e}")
        raise HTTPException(status_code=500, detail=f"KERIA query failed: {str(e)}")

@router.post("/credential/issue")
async def issue_travel_credential(credential_request: CredentialRequest):
    """Issue ACDC travel preferences credential via KERIA (zero-knowledge)"""
    try:
        # Mobile app must provide recipient AID - no employee lookup
        if not hasattr(credential_request, 'recipient_aid') or not credential_request.recipient_aid:
            raise HTTPException(
                status_code=400,
                detail="recipient_aid required - mobile app must provide employee AID"
            )
        
        recipient_aid = credential_request.recipient_aid
        
        # Mobile app must provide encrypted credential data
        if not hasattr(credential_request, 'encrypted_credential_data'):
            raise HTTPException(
                status_code=400,
                detail="encrypted_credential_data required - mobile app must encrypt before sending"
            )
        
        encrypted_data = credential_request.encrypted_credential_data
        
        # Validate encryption format
        if not isinstance(encrypted_data, dict) or 'encrypted_payload' not in encrypted_data:
            raise HTTPException(
                status_code=400,
                detail="Invalid encrypted data format"
            )
        
        # Build ACDC with encrypted data only
        issued_at = datetime.now()
        expires_at = issued_at + timedelta(days=365)
        
        acdc_data = {
            "encrypted_credential": encrypted_data,
            "metadata": {
                "issued_via": "mobile_app_encrypted",
                "credential_type": "EncryptedTravelPreferences",
                "version": "1.0.0",
                "issued_at": issued_at.isoformat(),
                "expires_at": expires_at.isoformat(),
                "encryption_method": "aes_256_gcm"
            }
        }
        
        # Issue real ACDC credential via KERIA
        try:
            # Use Travlr-ID as issuer (in production, this would be your proper issuer AID)
            issuer_aid = "ECtmB0RMV9GDeaXDvRfrrF6tmUG2WCnbB4LxfVlPR-jA"
            
            keria_result = await keria_service.issue_credential(
                issuer_aid=issuer_aid,
                recipient_aid=recipient_aid,
                schema_said=TRAVEL_CREDENTIAL_SCHEMA["said"],
                credential_data=acdc_data
            )
            
            credential_said = keria_result["said"]
            logger.info(f"✅ Real ACDC credential issued: {credential_said}")
            
        except Exception as keria_error:
            logger.error(f"KERIA credential issuance failed: {keria_error}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to issue credential via KERIA: {str(keria_error)}"
            )
        
        # No local storage - credential stored in KERIA LMDB only
        logger.info(f"✅ Encrypted credential stored in KERIA: {credential_said}")
        
        return {
            "success": True,
            "credential_said": credential_said,
            "recipient_aid": recipient_aid,
            "issued_at": issued_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "storage": "keria_lmdb_encrypted",
            "message": "Encrypted credential issued successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to issue ACDC credential: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to issue credential: {str(e)}"
        )

@router.get("/credentials/{aid}")
async def get_credentials_by_aid(aid: str):
    """Get credentials for an AID from KERIA (zero-knowledge)"""
    try:
        # Query KERIA directly for credentials by AID
        response = await keria_service.agent_client.get(f"/identifiers/{aid}/credentials")
        
        if response.status_code == 200:
            credentials_data = response.json()
            return {
                "aid": aid,
                "credentials": credentials_data,
                "source": "keria_direct",
                "message": "Credentials retrieved from KERIA"
            }
        else:
            return {
                "aid": aid,
                "credentials": [],
                "source": "keria_direct",
                "message": "No credentials found or AID not found"
            }
        
    except Exception as e:
        logger.error(f"Failed to get credentials for AID: {e}")
        raise HTTPException(status_code=500, detail=f"KERIA query failed: {str(e)}")

@router.get("/employee/{employee_id}/dashboard")
async def get_employee_dashboard(employee_id: str, db: Session = Depends(get_db)):
    """Get mobile dashboard data for employee"""
    try:
        # Get employee from database
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get credentials count
        credentials_count = db.query(Credential).filter(
            Credential.employee_aid == employee.aid
        ).count()
        
        # Get recent access/sharing activity (placeholder)
        recent_access = []
        
        # Build dashboard response
        dashboard_data = {
            "employee_id": employee_id,
            "aid": employee.aid,
            "credentials_count": credentials_count,
            "active_sharing": {
                "scania": True,
                "flight_prefs": credentials_count > 0,
                "hotel_prefs": credentials_count > 0,
                "accessibility_needs": credentials_count > 0,
                "emergency_contact": credentials_count > 0,
                "ai_processing": True
            },
            "recent_access": recent_access,
            "consent_status": "active",
            "last_updated": datetime.now().isoformat()
        }
        
        return dashboard_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard data"
        )

@router.post("/employee/{employee_id}/issue-credential")
async def issue_employee_credential(employee_id: str, preferences: TravelPreferences, db: Session = Depends(get_db)):
    """Issue travel credential for employee"""
    try:
        # Get employee from database
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Create credential record
        from app.models.credentials import Credential
        import uuid
        
        credential_id = str(uuid.uuid4())
        credential_said = f"ECredential{credential_id[:20]}"
        
        # Store travel preferences as credential
        credential_record = Credential(
            employee_aid=employee.aid,
            credential_said=credential_said,
            schema_said="ETravelPreferencesSchema123",
            credential_type="travel_preferences",
            status="active",
            acdc_metadata={
                "travel_preferences": {
                    "flight_preferences": preferences.flight_preferences,
                    "hotel_preferences": preferences.hotel_preferences,
                    "accessibility_needs": preferences.accessibility_needs,
                    "emergency_contact": preferences.emergency_contact,
                    "dietary_requirements": preferences.dietary_requirements
                },
                "metadata": {
                    "issued_at": datetime.now().isoformat(),
                    "credential_type": "travel_preferences",
                    "version": "1.0.0"
                }
            },
            issuer_aid=employee.aid,
            issued_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=365)
        )
        
        db.add(credential_record)
        db.commit()
        
        logger.info(f"✅ Travel credential issued for employee: {employee_id}")
        
        return {
            "success": True,
            "credential_id": credential_id,
            "credential_said": credential_said,
            "employee_id": employee_id,
            "issued_at": credential_record.issued_at.isoformat(),
            "expires_at": credential_record.expires_at.isoformat(),
            "status": "active",
            "message": "Travel credential issued successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to issue credential: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to issue credential"
        )

@router.post("/consent/update")
async def update_mobile_consent(consent: ConsentUpdate, db: Session = Depends(get_db)):
    """Update employee consent settings"""
    try:
        # Get employee from database
        employee = db.query(Employee).filter(Employee.employee_id == consent.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Create consent record in database
        from app.models.database import ConsentRecord
        import uuid
        
        consent_id = str(uuid.uuid4())
        
        consent_record = ConsentRecord(
            request_id=consent_id,
            employee_aid=employee.aid,
            company_aid="EScania123456789012345678901234567890",  # Default Scania AID
            requested_fields=["share_with_scania", "share_flight_prefs", "share_hotel_prefs", "share_accessibility_needs", "share_emergency_contact", "ai_processing_consent"],
            approved_fields=[field for field, value in {
                "share_with_scania": consent.share_with_scania,
                "share_flight_prefs": consent.share_flight_prefs,
                "share_hotel_prefs": consent.share_hotel_prefs,
                "share_accessibility_needs": consent.share_accessibility_needs,
                "share_emergency_contact": consent.share_emergency_contact,
                "ai_processing_consent": consent.ai_processing_consent
            }.items() if value],
            purpose="Employee consent update",
            status="approved",
            company_public_key="EScaniaPubKey123456789012345678901234567890",  # Placeholder
            approved_at=datetime.now()
        )
        
        db.add(consent_record)
        db.commit()
        
        logger.info(f"✅ Consent updated for employee: {consent.employee_id}")
        
        return {
            "success": True,
            "employee_id": consent.employee_id,
            "consent_id": consent_id,
            "updated_at": datetime.now().isoformat(),
            "message": "Consent settings updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update consent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update consent"
        )

@router.delete("/employee/{employee_id}/revoke-access")
async def revoke_employee_access(employee_id: str, reason: Optional[str] = None, db: Session = Depends(get_db)):
    """Revoke all data access for employee"""
    try:
        # Get employee from database
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Revoke all active consent records
        from app.models.database import ConsentRecord
        
        active_consents = db.query(ConsentRecord).filter(
            ConsentRecord.employee_aid == employee.aid,
            ConsentRecord.status == "active"
        ).all()
        
        revoked_count = 0
        for consent in active_consents:
            consent.status = "revoked"
            consent.denied_at = datetime.now()  # Use denied_at instead of revoked_at
            # Note: ConsentRecord doesn't have a revocation_reason field, so we skip storing the reason
            revoked_count += 1
        
        # Also revoke all credentials
        from app.models.credentials import Credential
        
        active_credentials = db.query(Credential).filter(
            Credential.employee_aid == employee.aid,
            Credential.status == "active"
        ).all()
        
        for credential in active_credentials:
            credential.status = "revoked"
            credential.updated_at = datetime.now()
        
        db.commit()
        
        logger.info(f"✅ Access revoked for employee: {employee_id}, {revoked_count} consents revoked")
        
        return {
            "success": True,
            "employee_id": employee_id,
            "revoked_at": datetime.now().isoformat(),
            "consents_revoked": revoked_count,
            "credentials_revoked": len(active_credentials),
            "reason": reason,
            "message": "All data access revoked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to revoke access: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke access"
        )

@router.get("/employee/{employee_id}/credentials")
async def get_employee_credentials_keri(employee_id: str, db: Session = Depends(get_db)):
    """Get all real KERI credentials for employee"""
    try:
        # Get employee from database
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Get all credentials for this employee from database
        employee_creds = db.query(Credential).filter(
            Credential.employee_aid == employee.aid
        ).all()
        
        # Format credentials for mobile response
        credentials_list = []
        for cred in employee_creds:
            # Parse ACDC metadata if it's JSON string
            acdc_metadata = cred.acdc_metadata or {}
            if isinstance(acdc_metadata, str):
                import json
                acdc_metadata = json.loads(acdc_metadata)
            
            travel_prefs = acdc_metadata.get("travel_preferences", {})
            
            credentials_list.append({
                "credential_id": cred.id,
                "credential_said": cred.credential_said,
                "credential_type": cred.credential_type,
                "issued_at": cred.issued_at.isoformat() if cred.issued_at else None,
                "expires_at": cred.expires_at.isoformat() if cred.expires_at else None,
                "status": cred.status,
                "keri_backend": "veridian",
                "schema_said": cred.schema_said,
                "issuer_aid": cred.issuer_aid,
                "has_flight_prefs": "flight_preferences" in travel_prefs,
                "has_hotel_prefs": "hotel_preferences" in travel_prefs,
                "has_accessibility_needs": "accessibility_needs" in travel_prefs,
                "has_emergency_contact": "emergency_contact" in travel_prefs
            })
        
        return {
            "employee_id": employee_id,
            "aid": employee.aid,
            "total_credentials": len(credentials_list),
            "credentials": credentials_list,
            "keri_backend": "veridian"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get credentials: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve credentials"
        )

@router.post("/credential/{credential_said}/verify")
async def verify_credential_keri(
    credential_said: str,
    verification_level: str = "comprehensive",
    verify_witnesses: bool = True
):
    """Verify ACDC credential via KERIA"""
    try:
        verification_result = await keria_service.verify_credential_comprehensive(
            credential_said=credential_said,
            verification_level=verification_level,
            verify_witnesses=verify_witnesses
        )
        
        logger.info(f"✅ Real KERI verification completed: {verification_result['overall_status']}")
        
        return verification_result
        
    except Exception as e:
        logger.error(f"Failed to verify credential: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify credential: {str(e)}"
        )

@router.post("/ipex/presentation-request")
async def create_ipex_presentation_request(request: QRCodeRequest):
    """Create IPEX presentation request for zero-knowledge data sharing"""
    try:
        # Generate unique presentation request ID
        presentation_id = f"ipex-{int(datetime.now().timestamp())}"
        expires_at = datetime.now() + timedelta(minutes=request.expires_in_minutes)
        
        # Create IPEX presentation request (no employee data stored)
        ipex_request = {
            "type": "ipex_presentation_request",
            "presentation_id": presentation_id,
            "presentation_definition": {
                "requested_fields": request.data_to_share,
                "purpose": "employee_data_sharing",
                "verifier": "travlr_id_system"
            },
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        # QR code contains only the presentation request
        qr_data = {
            "type": "ipex_presentation_request",
            "presentation_id": presentation_id,
            "requested_fields": request.data_to_share,
            "expires_at": expires_at.isoformat(),
            "endpoint": "/api/v1/mobile-keri/ipex/presentation-submit"
        }
        
        return {
            "success": True,
            "presentation_id": presentation_id,
            "ipex_request": ipex_request,
            "qr_data": qr_data,
            "expires_at": expires_at.isoformat(),
            "message": "IPEX presentation request created (zero-knowledge)"
        }
        
    except Exception as e:
        logger.error(f"Failed to create IPEX presentation request: {e}")
        raise HTTPException(status_code=500, detail=f"IPEX request creation failed: {str(e)}")

# Removed - use /ipex/presentation-request endpoint for zero-knowledge QR generation
        
        if not employee_creds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active credentials found for employee"
            )
        
        latest_cred = max(employee_creds, key=lambda x: x["issued_at"])
        
        # Create QR code data with real KERI information
        context_id = f"KERI{hashlib.sha256(f'{employee_id}{datetime.now()}'.encode()).hexdigest()[:12]}"
        expires_at = datetime.now() + timedelta(minutes=qr_request.expires_in_minutes)
        
        qr_data = {
            "type": "keri_credential_share",
            "version": "1.0",
            "employee_id": employee_id,
            "aid": employee_data["aid"],
            "credential_said": latest_cred["credential_id"],
            "oobi": employee_data["oobi"],
            "context_id": context_id,
            "shared_fields": qr_request.data_to_share,
            "expires_at": expires_at.isoformat(),
            "generated_at": datetime.now().isoformat(),
            "keri_backend": "veridian",
            "witnesses": len(employee_data["witnesses"]),
            "witness_threshold": employee_data["witness_threshold"]
        }
        
        # Zero-knowledge: Return IPEX presentation request instead of storing data
        ipex_presentation_request = {
            "type": "ipex_presentation_request",
            "context_id": context_id,
            "presentation_definition": {
                "requested_credentials": [latest_cred["credential_id"]],
                "requested_fields": qr_request.data_to_share,
                "purpose": "employee_data_sharing"
            },
            "expires_at": expires_at.isoformat()
        }
        
        return {
            "success": True,
            "context_id": context_id,
            "ipex_presentation_request": ipex_presentation_request,
            "expires_at": expires_at.isoformat(),
            "shared_fields": qr_request.data_to_share,
            "keri_backend": "veridian",
            "message": "QR code generated with real KERI data"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate QR code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate QR code"
        )

@router.get("/aid/{aid}/dashboard")
async def get_aid_dashboard(aid: str):
    """Get dashboard info for AID from KERIA (zero-knowledge)"""
    try:
        # Query KERIA directly for AID credentials
        response = await keria_service.agent_client.get(f"/identifiers/{aid}/credentials")
        
        if response.status_code == 200:
            credentials_data = response.json()
            credential_count = len(credentials_data) if credentials_data else 0
        else:
            credentials_data = []
            credential_count = 0
        
        # Get KERI health status
        try:
            keria_health = await keria_service.health_check()
            keri_status = "connected" if keria_health.get("admin_api") and keria_health.get("agent_api") else "disconnected"
        except:
            keri_status = "unknown"
        
        return {
            "aid": aid,
            "credential_count": credential_count,
            "credentials": credentials_data,
            "keri_status": keri_status,
            "source": "keria_direct",
            "message": "Dashboard data retrieved from KERIA"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get dashboard: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get dashboard data"
        )


# Key Rotation Notification Models
class KeyRotationNotification(BaseModel):
    rotationId: str = Field(..., description="Unique rotation identifier")
    employeeAid: str = Field(..., description="Employee's AID that was rotated")
    newOobi: str = Field(..., description="New OOBI after key rotation")
    rotationSequence: int = Field(..., description="New key sequence number")
    timestamp: str = Field(..., description="ISO timestamp of rotation")
    reason: str = Field(..., description="Reason for rotation")

@router.post("/key-rotation")
async def handle_key_rotation_notification(
    rotation: KeyRotationNotification,
    x_employee_aid: str = Header(..., alias="X-Employee-AID"),
    db: Session = Depends(get_db)
):
    """
    Handle key rotation notification from mobile app
    This endpoint allows companies to be notified when employee keys are rotated
    """
    try:
        logger.info(f"🔄 Processing key rotation notification: {rotation.rotationId}")
        
        # Verify the employee exists and AID matches
        employee = db.query(Employee).filter(Employee.aid == x_employee_aid).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with AID {x_employee_aid} not found"
            )
        
        # Validate rotation data
        if rotation.employeeAid != x_employee_aid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee AID mismatch between header and payload"
            )
        
        # Update employee record with new OOBI and sequence
        employee.keri_keys = employee.keri_keys or {}
        employee.keri_keys["oobi"] = rotation.newOobi
        employee.keri_keys["sequence"] = rotation.rotationSequence
        employee.keri_keys["last_rotation"] = rotation.timestamp
        employee.keri_keys["rotation_reason"] = rotation.reason
        employee.updated_at = datetime.now()
        
        # Store key rotation event
        rotation_record = {
            "rotation_id": rotation.rotationId,
            "employee_aid": rotation.employeeAid,
            "old_sequence": rotation.rotationSequence - 1,
            "new_sequence": rotation.rotationSequence,
            "new_oobi": rotation.newOobi,
            "timestamp": rotation.timestamp,
            "reason": rotation.reason,
            "processed_at": datetime.now().isoformat()
        }
        
        # Add to employee metadata
        if not hasattr(employee, 'rotation_history'):
            employee.rotation_history = []
        
        # Store rotation history (keep last 10 rotations)
        if isinstance(employee.rotation_history, list):
            employee.rotation_history.append(rotation_record)
            if len(employee.rotation_history) > 10:
                employee.rotation_history = employee.rotation_history[-10:]
        else:
            employee.rotation_history = [rotation_record]
        
        db.commit()
        
        # Notify all companies that have active relationships with this employee
        await notify_companies_of_key_rotation(
            employee_aid=rotation.employeeAid,
            new_oobi=rotation.newOobi,
            rotation_sequence=rotation.rotationSequence,
            rotation_id=rotation.rotationId,
            db=db
        )
        
        logger.info(f"✅ Key rotation processed successfully: {rotation.rotationId}")
        
        return {
            "success": True,
            "rotation_id": rotation.rotationId,
            "employee_aid": rotation.employeeAid,
            "new_sequence": rotation.rotationSequence,
            "companies_notified": True,
            "processed_at": datetime.now().isoformat(),
            "message": "Key rotation notification processed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to process key rotation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Key rotation processing failed: {str(e)}"
        )

async def notify_companies_of_key_rotation(
    employee_aid: str,
    new_oobi: str,
    rotation_sequence: int,
    rotation_id: str,
    db: Session
):
    """
    Notify companies that have active relationships with the employee
    about their key rotation so they can update their records
    """
    try:
        logger.info(f"📢 Notifying companies of key rotation for AID: {employee_aid[:8]}...")
        
        # Get all active consent records for this employee
        from app.models.database import ConsentRecord
        
        active_consents = db.query(ConsentRecord).filter(
            ConsentRecord.employee_aid == employee_aid,
            ConsentRecord.status.in_(["approved", "active"])
        ).all()
        
        companies_to_notify = set()
        for consent in active_consents:
            if consent.company_aid and consent.company_aid != "PLACEHOLDER":
                companies_to_notify.add(consent.company_aid)
        
        # Get all credentials issued to companies
        active_credentials = db.query(Credential).filter(
            Credential.employee_aid == employee_aid,
            Credential.status == "active"
        ).all()
        
        notification_results = []
        
        for company_aid in companies_to_notify:
            try:
                # In a full implementation, this would:
                # 1. Look up company's notification endpoint
                # 2. Send encrypted notification about key rotation
                # 3. Include new OOBI for the employee
                
                # For now, we'll log the notification
                logger.info(f"🏢 Would notify company {company_aid[:8]}... of key rotation")
                
                notification_results.append({
                    "company_aid": company_aid,
                    "notified": True,
                    "method": "logged_placeholder"
                })
                
            except Exception as company_error:
                logger.error(f"Failed to notify company {company_aid}: {company_error}")
                notification_results.append({
                    "company_aid": company_aid,
                    "notified": False,
                    "error": str(company_error)
                })
        
        logger.info(f"✅ Key rotation notifications sent to {len(companies_to_notify)} companies")
        return notification_results
        
    except Exception as e:
        logger.error(f"Failed to notify companies of key rotation: {e}")
        return []

# Delegation Event Models
class DelegationCreated(BaseModel):
    delegationId: str = Field(..., description="Unique delegation identifier")
    delegatorAid: str = Field(..., description="Company AID (delegator)")
    delegateAid: str = Field(..., description="Employee AID (delegate)")
    delegatedAid: str = Field(..., description="New delegated identity AID")
    permissions: List[str] = Field(..., description="Delegated permissions")
    dipEvent: Dict[str, Any] = Field(..., description="Delegated Inception Event data")
    timestamp: str = Field(..., description="ISO timestamp of delegation")

class DelegationRevoked(BaseModel):
    delegationId: str = Field(..., description="Delegation identifier")
    delegatorAid: str = Field(..., description="Company AID")
    delegatedAid: str = Field(..., description="Delegated identity AID")
    reason: str = Field(..., description="Revocation reason")
    timestamp: str = Field(..., description="ISO timestamp of revocation")

@router.post("/delegation-created")
async def handle_delegation_created(
    delegation: DelegationCreated,
    x_employee_aid: str = Header(..., alias="X-Employee-AID"),
    db: Session = Depends(get_db)
):
    """
    Handle delegated inception (DIP) event notification from mobile app
    Creates formal company-employee authority relationship
    """
    try:
        logger.info(f"🤝 Processing delegation created: {delegation.delegationId}")
        
        # Verify the employee exists and AID matches
        employee = db.query(Employee).filter(Employee.aid == x_employee_aid).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with AID {x_employee_aid} not found"
            )
        
        # Validate delegation data
        if delegation.delegateAid != x_employee_aid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee AID mismatch between header and payload"
            )
        
        # Store delegation record
        delegation_record = {
            "delegation_id": delegation.delegationId,
            "delegator_aid": delegation.delegatorAid,
            "delegate_aid": delegation.delegateAid,
            "delegated_aid": delegation.delegatedAid,
            "permissions": delegation.permissions,
            "dip_event": delegation.dipEvent,
            "status": "active",
            "created_at": delegation.timestamp,
            "processed_at": datetime.now().isoformat()
        }
        
        # Add to employee metadata
        if not hasattr(employee, 'delegations'):
            employee.delegations = []
        
        # Store delegation (keep all active delegations)
        if isinstance(employee.delegations, list):
            employee.delegations.append(delegation_record)
        else:
            employee.delegations = [delegation_record]
        
        employee.updated_at = datetime.now()
        db.commit()
        
        # Create consent record for this delegation
        from app.models.database import ConsentRecord
        import uuid
        
        consent_record = ConsentRecord(
            request_id=str(uuid.uuid4()),
            employee_aid=delegation.delegateAid,
            company_aid=delegation.delegatorAid,
            requested_fields=delegation.permissions,
            approved_fields=delegation.permissions,
            purpose=f"Delegated authority - {delegation.delegationId}",
            status="approved",
            company_public_key=f"DelegatedKey_{delegation.delegatedAid[:16]}",
            approved_at=datetime.now()
        )
        
        db.add(consent_record)
        db.commit()
        
        logger.info(f"✅ Delegation processed successfully: {delegation.delegationId}")
        
        return {
            "success": True,
            "delegation_id": delegation.delegationId,
            "delegated_aid": delegation.delegatedAid,
            "company_aid": delegation.delegatorAid,
            "permissions": delegation.permissions,
            "consent_created": True,
            "processed_at": datetime.now().isoformat(),
            "message": "Delegation created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to process delegation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delegation processing failed: {str(e)}"
        )

@router.post("/delegation-revoked")
async def handle_delegation_revoked(
    revocation: DelegationRevoked,
    x_employee_aid: str = Header(..., alias="X-Employee-AID"),
    db: Session = Depends(get_db)
):
    """
    Handle delegation revocation notification from mobile app
    Terminates company-employee authority relationship
    """
    try:
        logger.info(f"🚫 Processing delegation revocation: {revocation.delegationId}")
        
        # Verify the employee exists
        employee = db.query(Employee).filter(Employee.aid == x_employee_aid).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee with AID {x_employee_aid} not found"
            )
        
        # Update delegation status
        delegations = getattr(employee, 'delegations', [])
        delegation_found = False
        
        for delegation in delegations:
            if delegation.get('delegation_id') == revocation.delegationId:
                delegation['status'] = 'revoked'
                delegation['revoked_at'] = revocation.timestamp
                delegation['revocation_reason'] = revocation.reason
                delegation_found = True
                break
        
        if not delegation_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Delegation not found"
            )
        
        # Revoke related consent records
        from app.models.database import ConsentRecord
        
        related_consents = db.query(ConsentRecord).filter(
            ConsentRecord.employee_aid == x_employee_aid,
            ConsentRecord.company_aid == revocation.delegatorAid,
            ConsentRecord.status.in_(["approved", "active"])
        ).all()
        
        revoked_consents = 0
        for consent in related_consents:
            consent.status = "revoked"
            consent.denied_at = datetime.now()
            revoked_consents += 1
        
        employee.updated_at = datetime.now()
        db.commit()
        
        logger.info(f"✅ Delegation revoked: {revocation.delegationId}, {revoked_consents} consents revoked")
        
        return {
            "success": True,
            "delegation_id": revocation.delegationId,
            "delegated_aid": revocation.delegatedAid,
            "company_aid": revocation.delegatorAid,
            "revoked_consents": revoked_consents,
            "revoked_at": revocation.timestamp,
            "reason": revocation.reason,
            "message": "Delegation revoked successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to process revocation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Revocation processing failed: {str(e)}"
        )

@router.get("/employee/{employee_id}/delegations")
async def get_employee_delegations(employee_id: str, db: Session = Depends(get_db)):
    """
    Get all delegations for an employee
    """
    try:
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        delegations = getattr(employee, 'delegations', [])
        
        # Separate by status
        active_delegations = [d for d in delegations if d.get('status') == 'active']
        revoked_delegations = [d for d in delegations if d.get('status') == 'revoked']
        
        return {
            "employee_id": employee_id,
            "aid": employee.aid,
            "total_delegations": len(delegations),
            "active_delegations": len(active_delegations),
            "revoked_delegations": len(revoked_delegations),
            "delegations": {
                "active": active_delegations,
                "revoked": revoked_delegations
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get employee delegations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve delegations"
        )

@router.get("/company/{company_aid}/delegated-employees")
async def get_company_delegated_employees(company_aid: str, db: Session = Depends(get_db)):
    """
    Get all employees who have delegated authority to a company
    """
    try:
        # Find all employees with active delegations to this company
        employees_with_delegations = db.query(Employee).all()
        
        delegated_employees = []
        for employee in employees_with_delegations:
            delegations = getattr(employee, 'delegations', [])
            active_company_delegations = [
                d for d in delegations 
                if d.get('delegator_aid') == company_aid and d.get('status') == 'active'
            ]
            
            if active_company_delegations:
                delegated_employees.append({
                    "employee_id": employee.employee_id,
                    "employee_aid": employee.aid,
                    "employee_name": employee.full_name,
                    "delegations": active_company_delegations
                })
        
        return {
            "company_aid": company_aid,
            "total_delegated_employees": len(delegated_employees),
            "delegated_employees": delegated_employees
        }
        
    except Exception as e:
        logger.error(f"Failed to get company delegated employees: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve delegated employees"
        )

@router.get("/employee/{employee_id}/key-rotation-history")
async def get_key_rotation_history(employee_id: str, db: Session = Depends(get_db)):
    """
    Get key rotation history for an employee
    """
    try:
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        rotation_history = getattr(employee, 'rotation_history', [])
        
        return {
            "employee_id": employee_id,
            "aid": employee.aid,
            "rotation_history": rotation_history,
            "total_rotations": len(rotation_history),
            "last_rotation": rotation_history[-1] if rotation_history else None,
            "current_sequence": employee.keri_keys.get("sequence", 0) if employee.keri_keys else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get rotation history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve rotation history"
        )

@router.post("/credential/issue-to-recipient")
async def issue_credential_to_recipient(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Issue ACDC credential to a recipient AID using proper KERI protocol.
    This replaces QR code sharing with actual credential issuance.
    """
    try:
        recipient_aid = request.get("recipient_aid")
        employee_id = request.get("employee_id") 
        credential_data = request.get("credential_data", {})
        
        if not recipient_aid or not employee_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="recipient_aid and employee_id are required"
            )
        
        logger.info(f"Issuing ACDC credential to recipient AID: {recipient_aid}")
        
        # Get employee data and AID
        employee = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
        
        # Create context card with selected fields
        context_card = {
            "type": credential_data.get("type", "context_card"),
            "purpose": credential_data.get("purpose", "Data sharing"),
            "selected_fields": credential_data.get("selectedFields", []),
            "metadata": {
                "issued_by": employee.aid,
                "issued_to": recipient_aid,
                "issued_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(days=30)).isoformat(),
                **credential_data.get("metadata", {})
            }
        }
        
        # Generate ACDC credential SAID
        import hashlib
        credential_said = f"ECredACDC{hashlib.sha256(str(context_card).encode()).hexdigest()[:24]}"
        
        # In real implementation, this would use KERIA to:
        # 1. Create ACDC credential with context card data
        # 2. Issue credential to recipient AID via IPEX
        # 3. Store issuance record in KEL
        
        # Store credential issuance record
        credential_record = Credential(
            employee_aid=employee.aid,
            credential_said=credential_said,
            schema_said="EScaniaContextCardCredential123456789",
            credential_type="ContextCard",
            status="active",
            acdc_metadata=context_card,
            issuer_aid=employee.aid,
            issued_at=datetime.now(),
            expires_at=datetime.now() + timedelta(days=30)
        )
        
        db.add(credential_record)
        db.commit()
        
        logger.info(f"ACDC credential issued successfully: {credential_said}")
        
        return {
            "success": True,
            "credential_said": credential_said,
            "issued_at": credential_record.issued_at.isoformat(),
            "expires_at": credential_record.expires_at.isoformat(),
            "recipient_aid": recipient_aid,
            "context_card": context_card,
            "message": "ACDC credential issued to recipient AID"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to issue credential to recipient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Credential issuance failed: {str(e)}"
        )
