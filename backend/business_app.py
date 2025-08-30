"""
Travlr-ID Business Logic Backend
Business operations only - NO KERI operations (those happen in mobile via SignifyTS)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
from datetime import datetime, timedelta

# Business Models (no KERI fields)
class EmployeeProfile(BaseModel):
    employee_id: str
    full_name: str
    department: str
    email: str
    phone: Optional[str] = None

class EmployeeAIDUpdate(BaseModel):
    """Mobile app sends real AID after SignifyTS creates it"""
    employee_id: str
    aid: str  # Real AID from SignifyTS inception
    oobi: str  # Real OOBI from KERIA

class TravelPreferences(BaseModel):
    flight_preferences: Optional[Dict[str, Any]] = None
    hotel_preferences: Optional[Dict[str, Any]] = None
    accessibility_needs: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    dietary_requirements: Optional[List[str]] = None

class ConsentDecision(BaseModel):
    employee_id: str
    company_name: str
    approved_fields: List[str]
    purpose: str
    expires_at: Optional[datetime] = None

# Create FastAPI app
app = FastAPI(
    title="Travlr-ID Business Logic API",
    description="Business operations only - KERI handled by mobile SignifyTS",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"], 
    allow_headers=["*"],
)

# Business data storage
employee_profiles = {}
travel_preferences = {}  
consent_records = {}
company_bookings = {}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "Travlr-ID Business Logic",
        "version": "2.0.0",
        "keri_note": "KERI operations handled by mobile SignifyTS",
        "timestamp": datetime.now().isoformat()
    }

# === EMPLOYEE BUSINESS LOGIC ===

@app.post("/api/v1/employee/profile")
async def create_employee_profile(profile: EmployeeProfile):
    """Create employee business profile (no KERI operations)"""
    employee_profiles[profile.employee_id] = {
        **profile.dict(),
        "created_at": datetime.now().isoformat(),
        "aid": None,  # Will be updated when mobile creates AID
        "keri_status": "pending_mobile_inception"
    }
    
    return {
        "success": True,
        "employee_id": profile.employee_id,
        "message": "Profile created. Please create KERI identity in mobile app.",
        "next_step": "mobile_signify_inception"
    }

@app.put("/api/v1/employee/{employee_id}/aid")
async def update_employee_aid(employee_id: str, aid_data: EmployeeAIDUpdate):
    """Mobile app updates with real AID after SignifyTS inception"""
    if employee_id not in employee_profiles:
        raise HTTPException(404, "Employee not found")
    
    employee_profiles[employee_id].update({
        "aid": aid_data.aid,
        "oobi": aid_data.oobi,
        "keri_status": "active",
        "aid_updated_at": datetime.now().isoformat()
    })
    
    return {
        "success": True,
        "message": "Employee AID updated from mobile SignifyTS",
        "aid": aid_data.aid
    }

@app.get("/api/v1/employee/{employee_id}/profile")
async def get_employee_profile(employee_id: str):
    """Get employee business profile"""
    if employee_id not in employee_profiles:
        raise HTTPException(404, "Employee not found")
    
    return employee_profiles[employee_id]

# === TRAVEL PREFERENCES (Business Logic) ===

@app.post("/api/v1/employee/{employee_id}/travel-preferences")
async def save_travel_preferences(employee_id: str, prefs: TravelPreferences):
    """Save travel preferences (business data only)"""
    if employee_id not in employee_profiles:
        raise HTTPException(404, "Employee not found")
    
    travel_preferences[employee_id] = {
        **prefs.dict(),
        "employee_id": employee_id,
        "created_at": datetime.now().isoformat()
    }
    
    return {
        "success": True,
        "message": "Travel preferences saved. Mobile app should issue ACDC credential via SignifyTS.",
        "next_step": "mobile_issue_acdc_credential"
    }

@app.get("/api/v1/employee/{employee_id}/travel-preferences")
async def get_travel_preferences(employee_id: str):
    """Get travel preferences"""
    if employee_id not in travel_preferences:
        raise HTTPException(404, "Travel preferences not found")
    
    return travel_preferences[employee_id]

# === CONSENT MANAGEMENT (Business Logic) ===

@app.post("/api/v1/consent/decision")
async def record_consent_decision(decision: ConsentDecision):
    """Record consent decision (business logic only)"""
    consent_id = str(uuid.uuid4())
    
    consent_records[consent_id] = {
        **decision.dict(),
        "consent_id": consent_id,
        "decided_at": datetime.now().isoformat(),
        "status": "active"
    }
    
    return {
        "success": True,
        "consent_id": consent_id,
        "message": "Consent recorded. Mobile app should create context card via SignifyTS."
    }

@app.get("/api/v1/employee/{employee_id}/consents")
async def get_employee_consents(employee_id: str):
    """Get all consent decisions for employee"""
    employee_consents = [
        consent for consent in consent_records.values()
        if consent["employee_id"] == employee_id
    ]
    
    return {
        "employee_id": employee_id,
        "consents": employee_consents,
        "total": len(employee_consents)
    }

# === COMPANY INTEGRATION ===

@app.post("/api/v1/company/{company_name}/book-travel")
async def company_book_travel(company_name: str, booking_data: Dict[str, Any]):
    """Company booking integration (business logic)"""
    booking_id = str(uuid.uuid4())
    
    company_bookings[booking_id] = {
        "booking_id": booking_id,
        "company_name": company_name,
        "booking_data": booking_data,
        "created_at": datetime.now().isoformat(),
        "status": "pending_employee_consent"
    }
    
    return {
        "success": True,
        "booking_id": booking_id,
        "message": "Booking created. Request employee consent via mobile app KERI flow."
    }

@app.get("/api/v1/admin/stats")
async def get_admin_stats():
    """Admin statistics"""
    return {
        "total_employees": len(employee_profiles),
        "employees_with_aid": len([e for e in employee_profiles.values() if e.get("aid")]),
        "total_preferences": len(travel_preferences),
        "total_consents": len(consent_records),
        "total_bookings": len(company_bookings),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)