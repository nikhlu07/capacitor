"""Credential Sharing Data Models"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class SharingPermission(str, Enum):
    """Permission levels for credential sharing"""
    READ_ONLY = "read_only"
    VERIFY_ONLY = "verify_only"
    FULL_ACCESS = "full_access"

class SharingPurpose(str, Enum):
    """Purpose of credential sharing"""
    TRAVEL_BOOKING = "travel_booking"
    EXPENSE_VERIFICATION = "expense_verification"
    COMPLIANCE_AUDIT = "compliance_audit"
    ADMIN_REVIEW = "admin_review"
    PARTNER_INTEGRATION = "partner_integration"

class CredentialSharingRequest(BaseModel):
    """Request model for sharing a credential"""
    
    credential_said: str = Field(..., description="SAID of the credential to share")
    holder_aid: str = Field(..., description="AID of the credential holder")
    recipient_aid: str = Field(..., description="AID of the recipient (e.g., Scania admin)")
    permission: SharingPermission = Field(..., description="Permission level for sharing")
    purpose: SharingPurpose = Field(..., description="Purpose of sharing")
    
    # Optional selective disclosure - specify which fields to share
    disclosed_fields: Optional[List[str]] = Field(None, description="Specific fields to disclose")
    
    # Sharing constraints
    expires_at: Optional[datetime] = Field(None, description="Expiration time for sharing")
    max_uses: Optional[int] = Field(None, description="Maximum number of times credential can be accessed")
    
    # Metadata
    sharing_reason: Optional[str] = Field(None, description="Human-readable reason for sharing")
    requester_context: Optional[Dict[str, Any]] = Field(None, description="Additional context from requester")

class CredentialSharingResponse(BaseModel):
    """Response model for credential sharing"""
    
    success: bool
    sharing_id: str = Field(..., description="Unique identifier for this sharing instance")
    credential_said: str
    holder_aid: str
    recipient_aid: str
    permission: SharingPermission
    purpose: SharingPurpose
    
    # Sharing details
    shared_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = None
    current_uses: int = Field(default=0)
    
    # Access information
    access_url: Optional[str] = Field(None, description="URL for recipient to access credential")
    access_token: Optional[str] = Field(None, description="Token for accessing shared credential")
    
    message: str
    powered_by: str = "Veridian KERIA"

class SharedCredentialAccess(BaseModel):
    """Model for accessing a shared credential"""
    
    sharing_id: str
    recipient_aid: str
    access_token: Optional[str] = None

class SharedCredentialData(BaseModel):
    """Model for shared credential data response"""
    
    credential_said: str
    holder_aid: str
    shared_by: str
    permission: SharingPermission
    purpose: SharingPurpose
    
    # Credential data (potentially filtered based on disclosed_fields)
    credential_data: Dict[str, Any]
    disclosed_fields: Optional[List[str]] = None
    
    # Sharing metadata
    shared_at: datetime
    expires_at: Optional[datetime] = None
    remaining_uses: Optional[int] = None
    
    # Verification status
    verified: bool = Field(default=True)
    verification_timestamp: datetime = Field(default_factory=datetime.utcnow)

class SharingAuditLog(BaseModel):
    """Audit log entry for credential sharing"""
    
    sharing_id: str
    credential_said: str
    holder_aid: str
    recipient_aid: str
    action: str  # "shared", "accessed", "revoked", "expired"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    details: Optional[Dict[str, Any]] = None