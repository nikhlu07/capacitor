"""
Pydantic schemas for Travlr-ID API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Employee Registration
class EmployeeRegistrationRequest(BaseModel):
    employee_id: str = Field(..., description="Unique employee identifier")
    full_name: str = Field(..., description="Employee full name")
    department: str = Field(..., description="Employee department")
    email: str = Field(..., description="Employee email")
    phone: Optional[str] = Field(None, description="Employee phone number")

class EmployeeRegistrationResponse(BaseModel):
    success: bool
    employee_id: str
    aid: str
    oobi: str
    qr_code_data: str
    created_at: str

# Travel Preferences
class TravelPreferencesRequest(BaseModel):
    flight_preferences: Optional[Dict[str, Any]] = None
    hotel_preferences: Optional[Dict[str, Any]] = None
    accessibility_needs: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[Dict[str, Any]] = None

class TravelPreferencesResponse(BaseModel):
    success: bool
    credential_id: str
    employee_id: str
    aid: str
    issued_at: str

# Context Card
class ContextCardRequest(BaseModel):
    employee_id: str
    data_to_share: List[str]
    expires_in_minutes: int = 60

class ContextCardResponse(BaseModel):
    success: bool
    context_id: str
    qr_code_data: Dict[str, Any]
    expires_at: str

# Consent
class ConsentRequest(BaseModel):
    employee_id: str
    share_with_scania: bool
    share_flight_prefs: bool = False
    share_hotel_prefs: bool = False
    share_accessibility_needs: bool = False
    share_emergency_contact: bool = False
    ai_processing_consent: bool = False

class ConsentResponse(BaseModel):
    success: bool
    employee_id: str
    consent_id: str
    updated_at: str

# Health
class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    keria: Optional[str] = None