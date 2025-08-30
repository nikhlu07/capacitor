"""
Simplified Travlr-ID Backend API
Your actual backend without missing dependencies
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
import json
from datetime import datetime, timedelta

# Simple data models
class EmployeeRegistration(BaseModel):
    employee_id: str
    full_name: str
    department: str
    email: str
    phone: Optional[str] = None

class TravelPreferences(BaseModel):
    flight_preferences: Optional[Dict[str, Any]] = None
    hotel_preferences: Optional[Dict[str, Any]] = None
    accessibility_needs: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[Dict[str, Any]] = None

class EmployeeAIDUpdate(BaseModel):
    aid: str
    oobi: str

# Create FastAPI app
app = FastAPI(
    title="Travlr-ID API",
    description="Your actual Travlr-ID Employee Travel Identity Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage (for demo)
employees = {}
credentials = {}
context_cards = {}

@app.get("/", response_class=HTMLResponse)
async def root():
    return HTMLResponse(content="""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Travlr-ID API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
            .container { max-width: 800px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2c3e50; }
            .status { color: #27ae60; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Travlr-ID API</h1>
            <p class="status">Status: Your Backend is Running! ✅</p>
            <p>This is YOUR actual Travlr-ID backend API</p>
            <p><a href="/docs">📖 API Documentation</a></p>
            <p><a href="/health">🔍 Health Check</a></p>
        </div>
    </body>
    </html>
    """)

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "Travlr-ID API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/health")
async def api_health():
    return {
        "status": "healthy",
        "service": "Travlr-ID API",
        "version": "1.0.0",
        "backend": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/mobile/employee/register")
async def register_employee(employee: EmployeeRegistration):
    """Register a new employee - AID will be created by mobile app"""
    
    # Check if employee already exists
    if employee.employee_id in employees:
        raise HTTPException(status_code=409, detail="Employee already registered")
    
    # Store employee data WITHOUT AID (AID will come from mobile app)
    employees[employee.employee_id] = {
        "employee_id": employee.employee_id,
        "full_name": employee.full_name,
        "department": employee.department,
        "email": employee.email,
        "phone": employee.phone,
        "aid": None,  # Will be set later by mobile app
        "oobi": None,  # Will be set later by mobile app
        "created_at": datetime.now().isoformat()
    }
    
    return {
        "success": True,
        "employee_id": employee.employee_id,
        "message": "Employee profile created. Please complete KERI identity setup in mobile app.",
        "created_at": datetime.now().isoformat(),
        "next_step": "create_keri_identity"
    }

@app.put("/api/v1/mobile/employee/{employee_id}/aid")
async def update_employee_aid(employee_id: str, aid_data: EmployeeAIDUpdate):
    """Update employee with KERI AID created by mobile app"""
    if employee_id not in employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update employee with AID
    employees[employee_id]["aid"] = aid_data.aid
    employees[employee_id]["oobi"] = aid_data.oobi
    employees[employee_id]["aid_created_at"] = datetime.now().isoformat()
    
    return {
        "success": True,
        "employee_id": employee_id,
        "aid": aid_data.aid,
        "oobi": aid_data.oobi,
        "message": "KERI identity linked to employee profile successfully",
        "updated_at": datetime.now().isoformat()
    }

@app.get("/api/v1/mobile/employee/{employee_id}")
async def get_employee(employee_id: str):
    """Get employee information"""
    if employee_id not in employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employees[employee_id]

@app.post("/api/v1/mobile/employee/{employee_id}/issue-credential")
async def issue_travel_credential(employee_id: str, preferences: TravelPreferences):
    """Issue travel preferences credential"""
    if employee_id not in employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    credential_id = f"CRED{uuid.uuid4().hex[:16]}"
    
    credentials[credential_id] = {
        "credential_id": credential_id,
        "employee_id": employee_id,
        "aid": employees[employee_id]["aid"],
        "credential_type": "travel_preferences",
        "preferences": preferences.dict(),
        "issued_at": datetime.now().isoformat(),
        "expires_at": (datetime.now() + timedelta(days=365)).isoformat(),
        "status": "active"
    }
    
    return {
        "success": True,
        "credential_id": credential_id,
        "employee_id": employee_id,
        "aid": employees[employee_id]["aid"],
        "issued_at": datetime.now().isoformat(),
        "message": "Travel preferences credential issued successfully"
    }

@app.get("/api/v1/mobile/employee/{employee_id}/credentials")
async def get_employee_credentials(employee_id: str):
    """Get all credentials for an employee"""
    if employee_id not in employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee_credentials = [
        cred for cred in credentials.values() 
        if cred["employee_id"] == employee_id
    ]
    
    return {
        "employee_id": employee_id,
        "aid": employees[employee_id]["aid"],
        "total_credentials": len(employee_credentials),
        "credentials": employee_credentials
    }

@app.post("/api/v1/mobile/employee/{employee_id}/generate-qr")
async def generate_qr_code(employee_id: str, request: Dict[str, Any]):
    """Generate QR code for data sharing"""
    if employee_id not in employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    context_id = f"CTX{uuid.uuid4().hex[:12]}"
    expires_at = datetime.now() + timedelta(minutes=request.get("expires_in_minutes", 60))
    
    qr_data = {
        "type": "travlr_context_card",
        "version": "1.0",
        "employee_id": employee_id,
        "aid": employees[employee_id]["aid"],
        "context_id": context_id,
        "data_to_share": request.get("data_to_share", []),
        "expires_at": expires_at.isoformat(),
        "generated_at": datetime.now().isoformat()
    }
    
    context_cards[context_id] = qr_data
    
    return {
        "success": True,
        "qr_code_data": qr_data,
        "expires_at": expires_at.isoformat(),
        "shared_fields": request.get("data_to_share", []),
        "message": "QR code generated successfully"
    }

@app.get("/api/v1/mobile/employee/{employee_id}/dashboard")
async def get_dashboard(employee_id: str):
    """Get mobile dashboard data"""
    if employee_id not in employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee_creds = [c for c in credentials.values() if c["employee_id"] == employee_id]
    
    return {
        "employee_id": employee_id,
        "aid": employees[employee_id]["aid"],
        "credentials_count": len(employee_creds),
        "active_sharing": {
            "scania": True,
            "flight_prefs": len(employee_creds) > 0,
            "hotel_prefs": len(employee_creds) > 0,
            "accessibility_needs": False,
            "emergency_contact": False,
            "ai_processing": True
        },
        "recent_access": [],
        "consent_status": "active",
        "last_updated": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)