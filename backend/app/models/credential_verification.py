"""Credential Verification Data Models"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class VerificationStatus(str, Enum):
    """Status of verification checks"""
    VALID = "valid"
    INVALID = "invalid"
    UNKNOWN = "unknown"
    PENDING = "pending"

class VerificationLevel(str, Enum):
    """Level of verification to perform"""
    BASIC = "basic"
    STANDARD = "standard"
    COMPREHENSIVE = "comprehensive"
    FORENSIC = "forensic"

class VerificationCheck(BaseModel):
    """Individual verification check result"""
    
    check_name: str = Field(..., description="Name of the verification check")
    status: VerificationStatus = Field(..., description="Status of the check")
    details: Optional[str] = Field(None, description="Additional details about the check")
    error_message: Optional[str] = Field(None, description="Error message if check failed")
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CredentialVerificationRequest(BaseModel):
    """Request model for comprehensive credential verification"""
    
    credential_said: str = Field(..., description="SAID of the credential to verify")
    verification_level: VerificationLevel = Field(default=VerificationLevel.STANDARD)
    
    # Verification options
    verify_issuer: bool = Field(default=True, description="Verify the issuer's identity and authority")
    verify_schema: bool = Field(default=True, description="Verify schema compliance")
    verify_signatures: bool = Field(default=True, description="Verify cryptographic signatures")
    verify_witnesses: bool = Field(default=False, description="Verify witness signatures")
    verify_revocation: bool = Field(default=True, description="Check revocation status")
    
    # Expected values for validation
    expected_issuer: Optional[str] = Field(None, description="Expected issuer AID")
    expected_schema: Optional[str] = Field(None, description="Expected schema SAID")
    expected_recipient: Optional[str] = Field(None, description="Expected recipient AID")

class CredentialVerificationResponse(BaseModel):
    """Response model for credential verification"""
    
    credential_said: str
    overall_status: VerificationStatus
    verification_level: VerificationLevel
    checks: List[VerificationCheck]
    
    # Credential metadata
    issuer_aid: Optional[str] = None
    recipient_aid: Optional[str] = None
    schema_said: Optional[str] = None
    issued_at: Optional[datetime] = None
    
    # Verification results
    signature_valid: bool = Field(default=False)
    schema_compliant: bool = Field(default=False)
    issuer_verified: bool = Field(default=False)
    witnesses_verified: bool = Field(default=False)
    revocation_checked: bool = Field(default=False)
    
    # Trust metrics
    trust_score: float = Field(default=0.0, description="Trust score from 0-100")
    confidence_level: str = Field(default="unknown", description="Confidence level: low, medium, high")
    
    # Additional information
    warnings: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    
    # Response metadata
    verified_at: datetime = Field(default_factory=datetime.utcnow)
    message: str = Field(default="Verification completed")

class BatchVerificationRequest(BaseModel):
    """Request model for batch credential verification"""
    
    credential_saids: List[str] = Field(..., description="List of credential SAIDs to verify")
    verification_level: VerificationLevel = Field(default=VerificationLevel.STANDARD)
    
    # Batch processing options
    fail_fast: bool = Field(default=False, description="Stop on first failure")
    parallel_processing: bool = Field(default=True, description="Process verifications in parallel")
    max_concurrent: int = Field(default=10, description="Maximum concurrent verifications")

class BatchVerificationResponse(BaseModel):
    """Response model for batch credential verification"""
    
    total_credentials: int
    verified_credentials: int
    failed_credentials: int
    processing_time_seconds: float
    
    # Individual results
    results: List[CredentialVerificationResponse]
    
    # Summary statistics
    summary: Dict[str, int] = Field(default_factory=dict, description="Status counts")
    
    # Batch metadata
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    message: str = Field(default="Batch verification completed")