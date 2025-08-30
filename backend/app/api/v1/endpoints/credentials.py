"""Credential management endpoints."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

from app.services.keria import keria_service
from app.services.travel_preferences_service import travel_preferences_service
from app.core.keri_utils import get_schema_said, generate_company_aid
from app.models.travel_preferences import (
    TravelPreferencesCredentialRequest,
    TravelPreferencesCredentialResponse,
    TravelPreferencesData
)
from app.models.credential_sharing import (
    CredentialSharingRequest,
    CredentialSharingResponse,
    SharedCredentialAccess,
    SharedCredentialData,
    SharingPermission,
    SharingPurpose
)
from app.models.credential_verification import (
    CredentialVerificationRequest,
    CredentialVerificationResponse,
    BatchVerificationRequest,
    BatchVerificationResponse,
    VerificationStatus,
    VerificationLevel,
    VerificationCheck
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/issue")
async def issue_employee_credential(
    issuer_aid: str,
    recipient_aid: str,
    employee_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Issue an ACDC credential for an employee."""
    try:
        # Use real schema SAID for employee credential
        schema_said = get_schema_said("travlr_employee_registration")
        
        # Issue credential using Veridian KERIA
        result = await keria_service.issue_credential(
            issuer_aid=issuer_aid,
            recipient_aid=recipient_aid,
            schema_said=schema_said,
            credential_data=employee_data
        )
        
        logger.info(f"✅ Issued credential: {result['said']}")
        
        return {
            "success": True,
            "credential_said": result["said"],
            "issuer": result["issuer"],
            "recipient": result["recipient"],
            "schema": result["schema"],
            "data": result["data"],
            "message": "Employee credential issued successfully",
            "powered_by": "Veridian KERIA"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to issue credential: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to issue credential: {str(e)}"
        )

@router.post("/travel-preferences")
async def issue_travel_preferences_credential(
    request: TravelPreferencesCredentialRequest
) -> TravelPreferencesCredentialResponse:
    """Issue hash-based ACDC credential for travel preferences with encrypted PostgreSQL storage."""
    try:
        # Travel preferences schema SAID for minimal ACDC
        travel_preferences_schema_said = get_schema_said("travlr_minimal_travel_preferences")
        
        # Extract full travel preferences data
        full_preferences = {
            "employee_id": request.travel_preferences.employee_id,
            "full_name": request.travel_preferences.full_name,
            "seat_preference": request.travel_preferences.seat_preference.value,
            "meal_preference": request.travel_preferences.meal_preference.value,
            "preferred_airlines": request.travel_preferences.preferred_airlines,
            "frequent_flyer_numbers": request.travel_preferences.frequent_flyer_numbers,
            "accommodation_type": request.travel_preferences.accommodation_type.value,
            "preferred_hotel_chains": request.travel_preferences.preferred_hotel_chains,
            "loyalty_program_numbers": request.travel_preferences.loyalty_program_numbers,
            "dietary_preferences": getattr(request.travel_preferences, 'dietary_preferences', None),
            "accessibility_needs": getattr(request.travel_preferences, 'accessibility_needs', None),
            "emergency_contact": getattr(request.travel_preferences, 'emergency_contact', None),
            "preferred_class": getattr(request.travel_preferences, 'preferred_class', 'economy'),
            "travel_frequency": getattr(request.travel_preferences, 'travel_frequency', 'occasional')
        }
        
        # Generate employee encryption key (in production, this would come from mobile app)
        employee_key = f"employee-key-{request.travel_preferences.employee_id}-{request.recipient_aid[:8]}"
        
        # Create hash-based credential with encrypted PostgreSQL storage
        travlr_issuer_aid = generate_company_aid("Travlr-ID")
        credential_result = await travel_preferences_service.create_hash_based_credential(
            issuer_aid=travlr_issuer_aid,
            recipient_aid=request.recipient_aid,
            employee_id=request.travel_preferences.employee_id,
            full_preferences=full_preferences,
            employee_key=employee_key,
            schema_said=travel_preferences_schema_said
        )
        
        # Issue minimal ACDC credential via KERIA
        result = await keria_service.issue_credential(
            issuer_aid=credential_result["issuer_aid"],
            recipient_aid=credential_result["recipient_aid"],
            schema_said=credential_result["schema_said"],
            credential_data=credential_result["acdc_attributes"]
        )
        
        logger.info(f"✅ Issued hash-based travel preferences credential: {result['said']}")
        logger.info(f"✅ Encrypted detailed preferences stored with hash: {credential_result['storage_reference']['preferences_hash'][:8]}...")
        
        return TravelPreferencesCredentialResponse(
            success=True,
            credential_said=result["said"],
            message="Hash-based travel preferences credential issued successfully with encrypted storage"
        )
        
    except Exception as e:
        logger.error(f"Failed to issue travel preferences credential: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to issue travel preferences credential: {str(e)}")

@router.post("/share")
async def share_credential(
    request: CredentialSharingRequest
) -> CredentialSharingResponse:
    """Share a credential with another AID (e.g., Scania admin)."""
    try:
        # Share credential using KERIA
        result = await keria_service.share_credential(
            credential_said=request.credential_said,
            holder_aid=request.holder_aid,
            recipient_aid=request.recipient_aid,
            permission=request.permission.value,
            disclosed_fields=request.disclosed_fields
        )
        
        # Generate access URL and token (in production, these would be secure)
        access_url = f"/api/v1/credentials/shared/{result['sharing_id']}"
        access_token = f"token-{result['sharing_id']}"
        
        logger.info(f"✅ Shared credential {request.credential_said} with {request.recipient_aid}")
        
        return CredentialSharingResponse(
            success=True,
            sharing_id=result["sharing_id"],
            credential_said=request.credential_said,
            holder_aid=request.holder_aid,
            recipient_aid=request.recipient_aid,
            permission=request.permission,
            purpose=request.purpose,
            expires_at=request.expires_at,
            max_uses=request.max_uses,
            access_url=access_url,
            access_token=access_token,
            message=f"Credential shared successfully with {request.recipient_aid}"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to share credential: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to share credential: {str(e)}"
        )

@router.get("/shared/{sharing_id}")
async def access_shared_credential(
    sharing_id: str,
    recipient_aid: str,
    access_token: Optional[str] = None
) -> SharedCredentialData:
    """Access a shared credential."""
    try:
        # Verify access permissions
        access_result = await keria_service.access_shared_credential(
            sharing_id=sharing_id,
            recipient_aid=recipient_aid
        )
        
        if not access_result.get("access_granted"):
            raise HTTPException(
                status_code=403,
                detail="Access denied to shared credential"
            )
        
        # Return actual filtered credential data based on disclosed_fields
        shared_data = access_result.get("credential_data", {})
        
        # Filter data based on permission level and disclosed fields
        filtered_data = {}
        disclosed_fields = access_result.get("disclosed_fields", [])
        for field in disclosed_fields:
            if field in shared_data:
                filtered_data[field] = shared_data[field]
        
        logger.info(f"✅ Accessed shared credential: {sharing_id} by {recipient_aid}")
        
        return SharedCredentialData(
            credential_said=access_result.get("credential_said"),
            holder_aid=access_result.get("holder_aid"),
            shared_by=access_result.get("shared_by"),
            permission=SharingPermission(access_result.get("permission", "read_only")),
            purpose=SharingPurpose(access_result.get("purpose", "admin_review")),
            credential_data=filtered_data,
            shared_at=datetime.fromisoformat(access_result.get("shared_at", datetime.utcnow().isoformat())),
            verified=access_result.get("verified", False)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to access shared credential {sharing_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to access shared credential: {str(e)}"
        )

@router.delete("/share/{sharing_id}")
async def revoke_credential_sharing(
    sharing_id: str,
    holder_aid: str
) -> Dict[str, Any]:
    """Revoke credential sharing."""
    try:
        success = await keria_service.revoke_credential_sharing(
            sharing_id=sharing_id,
            holder_aid=holder_aid
        )
        
        if success:
            logger.info(f"✅ Revoked credential sharing: {sharing_id}")
            return {
                "success": True,
                "sharing_id": sharing_id,
                "message": "Credential sharing revoked successfully",
                "revoked_at": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=400,
                detail="Failed to revoke credential sharing"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to revoke sharing {sharing_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to revoke sharing: {str(e)}"
        )

@router.get("/verify/{credential_said}")
async def verify_credential(credential_said: str) -> Dict[str, Any]:
    """Basic verification of an ACDC credential."""
    try:
        is_valid = await keria_service.verify_credential(credential_said)
        
        return {
            "credential_said": credential_said,
            "valid": is_valid,
            "message": "Credential verified successfully" if is_valid else "Credential verification failed",
            "powered_by": "Veridian KERIA"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to verify credential {credential_said}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to verify credential: {str(e)}"
        )

@router.post("/verify/comprehensive")
async def verify_credential_comprehensive(
    request: CredentialVerificationRequest
) -> CredentialVerificationResponse:
    """Comprehensive verification of an ACDC credential with detailed analysis."""
    try:
        # Perform comprehensive verification
        result = await keria_service.verify_credential_comprehensive(
            credential_said=request.credential_said,
            verification_level=request.verification_level.value,
            verify_issuer=request.verify_issuer,
            verify_schema=request.verify_schema,
            verify_signatures=request.verify_signatures,
            verify_witnesses=request.verify_witnesses,
            verify_revocation=request.verify_revocation,
            expected_issuer=request.expected_issuer,
            expected_schema=request.expected_schema
        )
        
        # Convert to response model
        checks = [
            VerificationCheck(
                check_name=check["check_name"],
                status=VerificationStatus(check["status"]),
                details=check.get("details"),
                error_message=check.get("error_message")
            )
            for check in result["checks"]
        ]
        
        logger.info(f"✅ Comprehensive verification completed: {request.credential_said}")
        
        return CredentialVerificationResponse(
            credential_said=request.credential_said,
            overall_status=VerificationStatus(result["overall_status"]),
            verification_level=request.verification_level,
            checks=checks,
            issuer_aid=result.get("issuer_aid"),
            recipient_aid=result.get("recipient_aid"),
            schema_said=result.get("schema_said"),
            issued_at=datetime.fromisoformat(result["issued_at"]) if result.get("issued_at") else None,
            signature_valid=any(check["check_name"] == "signature_verification" and check["status"] == "valid" for check in result["checks"]),
            schema_compliant=any(check["check_name"] == "schema_validation" and check["status"] == "valid" for check in result["checks"]),
            issuer_verified=any(check["check_name"] == "issuer_verification" and check["status"] == "valid" for check in result["checks"]),
            witnesses_verified=any(check["check_name"] == "witness_verification" and check["status"] == "valid" for check in result["checks"]),
            revocation_checked=any(check["check_name"] == "revocation_check" for check in result["checks"]),
            trust_score=result["trust_score"],
            confidence_level=result.get("confidence_level", "unknown"),
            warnings=result.get("warnings", []),
            recommendations=result.get("recommendations", []),
            message=f"Comprehensive verification completed with {result['overall_status']} status"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed comprehensive verification: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed comprehensive verification: {str(e)}"
        )

@router.post("/verify/batch")
async def verify_credentials_batch(
    request: BatchVerificationRequest
) -> BatchVerificationResponse:
    """Batch verification of multiple ACDC credentials."""
    try:
        # Perform batch verification
        result = await keria_service.batch_verify_credentials(
            credential_saids=request.credential_saids,
            verification_level=request.verification_level.value
        )
        
        # Convert individual results to response models
        verification_responses = []
        for individual_result in result["results"]:
            checks = [
                VerificationCheck(
                    check_name=check["check_name"],
                    status=VerificationStatus(check["status"]),
                    details=check.get("details"),
                    error_message=check.get("error_message")
                )
                for check in individual_result["checks"]
            ]
            
            verification_responses.append(
                CredentialVerificationResponse(
                    credential_said=individual_result["credential_said"],
                    overall_status=VerificationStatus(individual_result["overall_status"]),
                    verification_level=request.verification_level,
                    checks=checks,
                    issuer_aid=individual_result.get("issuer_aid"),
                    recipient_aid=individual_result.get("recipient_aid"),
                    schema_said=individual_result.get("schema_said"),
                    trust_score=individual_result["trust_score"],
                    confidence_level=individual_result.get("confidence_level", "unknown"),
                    warnings=individual_result.get("warnings", []),
                    recommendations=individual_result.get("recommendations", [])
                )
            )
        
        logger.info(f"✅ Batch verification completed: {result['verified_credentials']}/{result['total_credentials']} valid")
        
        return BatchVerificationResponse(
            total_credentials=result["total_credentials"],
            verified_credentials=result["verified_credentials"],
            failed_credentials=result["failed_credentials"],
            processing_time_seconds=result["processing_time_seconds"],
            results=verification_responses,
            summary=result["summary"],
            message=f"Batch verification completed: {result['verified_credentials']}/{result['total_credentials']} credentials verified"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed batch verification: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed batch verification: {str(e)}"
        )