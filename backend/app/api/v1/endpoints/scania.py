"""
Scania Integration API Endpoints
B2B API for Scania to access employee travel data based on consent
"""

from fastapi import APIRouter, HTTPException, Depends, status, Header
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
import logging
import hashlib
import secrets

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic models for Scania integration
class ScaniaAuthRequest(BaseModel):
    """Scania authentication request"""
    client_id: str = Field(..., description="Scania client identifier")
    client_secret: str = Field(..., description="Scania client secret")
    scope: List[str] = Field(..., description="Requested access scopes")

class ScaniaAuthResponse(BaseModel):
    """Scania authentication response"""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 3600  # 1 hour
    scope: List[str]

class EmployeeTravelData(BaseModel):
    """Employee travel data response"""
    employee_id: str
    data_available: bool
    consent_status: str  # "active", "expired", "revoked"
    last_updated: datetime
    travel_preferences: Optional[Dict[str, Any]] = None
    disclosed_fields: List[str]
    data_classification: str  # "full", "anonymized", "denied"

class BulkTravelDataRequest(BaseModel):
    """Request for bulk employee travel data"""
    employee_ids: List[str] = Field(..., max_items=100, description="List of employee IDs (max 100)")
    requested_fields: List[str] = Field(..., description="Fields to retrieve")
    purpose: str = Field(..., description="Purpose of data access")
    requester_type: str = Field(..., enum=["admin", "ai", "system"], description="Type of requester")

class BulkTravelDataResponse(BaseModel):
    """Response for bulk employee travel data"""
    total_requested: int
    total_granted: int
    total_denied: int
    employees: List[EmployeeTravelData]
    request_id: str
    processed_at: datetime

class TravelBookingRequest(BaseModel):
    """Travel booking request using employee preferences"""
    employee_id: str
    trip_details: Dict[str, Any]
    booking_preferences: Optional[Dict[str, Any]] = None
    override_preferences: bool = Field(default=False, description="Override employee preferences if needed")

class TravelBookingResponse(BaseModel):
    """Travel booking response"""
    booking_id: str
    employee_id: str
    booking_status: str  # "confirmed", "pending", "failed"
    applied_preferences: Dict[str, Any]
    cost_optimization: Optional[Dict[str, Any]] = None
    booking_details: Dict[str, Any]

# In-memory storage for demo (in production, use proper authentication system)
scania_tokens = {}
booking_storage = {}

# Sample employee travel data (in production, this would come from ACDC credentials)
sample_employee_data = {
    "SE12345": {
        "employee_info": {
            "employeeId": "SE12345",
            "fullName": "Erik Andersson",
            "department": "Fleet Operations",
            "costCenter": "FO-2024-001"
        },
        "flight_preferences": {
            "preferredAirlines": ["SAS", "Lufthansa", "KLM"],
            "seatPreference": "aisle",
            "classPreference": "economy",
            "mealPreference": "vegetarian",
            "frequentFlyerNumbers": {
                "SAS": "EuroBonus123456",
                "Lufthansa": "Miles789012"
            }
        },
        "hotel_preferences": {
            "preferredChains": ["Scandic", "Radisson", "Hilton"],
            "roomType": "standard",
            "smokingPreference": "non-smoking",
            "loyaltyPrograms": {
                "Scandic": "Scandic123456",
                "Radisson": "Radisson789012"
            }
        },
        "accessibility_needs": {
            "mobilityAssistance": False,
            "wheelchairRequired": False,
            "visualImpairment": False,
            "hearingImpairment": False,
            "specialRequests": ""
        },
        "emergency_contact": {
            "name": "Anna Andersson",
            "relationship": "Spouse",
            "phone": "+46-70-123-4567",
            "email": "anna.andersson@email.com"
        }
    }
}

# Import consent storage from consent module
from app.api.v1.endpoints.consent import consent_storage

def verify_scania_token(authorization: str = Header(None)) -> Dict[str, Any]:
    """Verify Scania access token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.split(" ")[1]
    
    if token not in scania_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )
    
    token_data = scania_tokens[token]
    
    if datetime.now() > token_data["expires_at"]:
        del scania_tokens[token]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token has expired"
        )
    
    return token_data

@router.post("/scania/auth", response_model=ScaniaAuthResponse)
async def authenticate_scania(auth_request: ScaniaAuthRequest):
    """
    Authenticate Scania client and issue access token
    """
    try:
        logger.info(f"Scania authentication request from client: {auth_request.client_id}")
        
        # In production, verify client credentials against secure storage
        valid_clients = {
            "scania-fleet-management": "scania-secret-2024",
            "scania-ai-optimizer": "scania-ai-secret-2024"
        }
        
        if (auth_request.client_id not in valid_clients or 
            auth_request.client_secret != valid_clients[auth_request.client_id]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid client credentials"
            )
        
        # Generate access token
        access_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=1)
        
        # Store token data
        scania_tokens[access_token] = {
            "client_id": auth_request.client_id,
            "scope": auth_request.scope,
            "expires_at": expires_at,
            "issued_at": datetime.now()
        }
        
        logger.info(f"Access token issued for Scania client: {auth_request.client_id}")
        
        return ScaniaAuthResponse(
            access_token=access_token,
            expires_in=3600,
            scope=auth_request.scope
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to authenticate Scania client: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )

@router.get("/scania/employee/{employee_id}/travel-data", response_model=EmployeeTravelData)
async def get_employee_travel_data(
    employee_id: str,
    fields: Optional[str] = None,
    token_data: Dict[str, Any] = Depends(verify_scania_token)
):
    """
    Get travel data for a specific employee based on consent
    """
    try:
        logger.info(f"Scania requesting travel data for employee: {employee_id}")
        
        # Parse requested fields
        requested_fields = fields.split(",") if fields else [
            "employee_info", "flight_preferences", "hotel_preferences", 
            "accessibility_needs", "emergency_contact"
        ]
        
        # Check if employee exists
        if employee_id not in sample_employee_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Employee {employee_id} not found"
            )
        
        # Check consent status
        if employee_id not in consent_storage:
            return EmployeeTravelData(
                employee_id=employee_id,
                data_available=False,
                consent_status="no_consent",
                last_updated=datetime.now(),
                disclosed_fields=[],
                data_classification="denied"
            )
        
        consent_record = consent_storage[employee_id]
        
        # Check if consent is active
        if not consent_record["active"] or datetime.now() > consent_record["expires_at"]:
            consent_status = "expired" if datetime.now() > consent_record["expires_at"] else "revoked"
            return EmployeeTravelData(
                employee_id=employee_id,
                data_available=False,
                consent_status=consent_status,
                last_updated=consent_record["updated_at"],
                disclosed_fields=[],
                data_classification="denied"
            )
        
        # Determine requester type from client_id
        requester_type = "ai" if "ai" in token_data["client_id"] else "admin"
        
        # Apply consent-based filtering
        consent_settings = consent_record["consent_settings"]
        employee_data = sample_employee_data[employee_id]
        disclosed_data = {}
        disclosed_fields = []
        
        # Field-level consent checking
        field_consent_mapping = {
            "employee_info": consent_settings.get("share_with_scania", False),
            "flight_preferences": consent_settings.get("share_flight_prefs", False),
            "hotel_preferences": consent_settings.get("share_hotel_prefs", False),
            "accessibility_needs": consent_settings.get("share_accessibility_needs", False),
            "emergency_contact": consent_settings.get("share_emergency_contact", False)
        }
        
        # Special handling for AI requests
        if requester_type == "ai":
            ai_consent = consent_settings.get("ai_processing_consent", False)
            if not ai_consent:
                data_classification = "denied"
            else:
                # AI gets only anonymized travel preferences
                for field in requested_fields:
                    if field in ["flight_preferences", "hotel_preferences"] and field_consent_mapping.get(field, False):
                        # Anonymize the data for AI
                        anonymized_data = employee_data[field].copy()
                        if "frequentFlyerNumbers" in anonymized_data:
                            anonymized_data["frequentFlyerNumbers"] = {"count": len(anonymized_data["frequentFlyerNumbers"])}
                        if "loyaltyPrograms" in anonymized_data:
                            anonymized_data["loyaltyPrograms"] = {"count": len(anonymized_data["loyaltyPrograms"])}
                        
                        disclosed_data[field] = anonymized_data
                        disclosed_fields.append(field)
                
                data_classification = "anonymized" if disclosed_fields else "denied"
        else:
            # Regular admin access based on field-specific consent
            for field in requested_fields:
                if field in field_consent_mapping and field_consent_mapping[field]:
                    disclosed_data[field] = employee_data[field]
                    disclosed_fields.append(field)
            
            data_classification = "full" if disclosed_fields else "denied"
        
        return EmployeeTravelData(
            employee_id=employee_id,
            data_available=len(disclosed_fields) > 0,
            consent_status="active",
            last_updated=consent_record["updated_at"],
            travel_preferences=disclosed_data if disclosed_data else None,
            disclosed_fields=disclosed_fields,
            data_classification=data_classification
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get employee travel data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve travel data"
        )

@router.post("/scania/employees/bulk-travel-data", response_model=BulkTravelDataResponse)
async def get_bulk_travel_data(
    request: BulkTravelDataRequest,
    token_data: Dict[str, Any] = Depends(verify_scania_token)
):
    """
    Get travel data for multiple employees in bulk
    """
    try:
        logger.info(f"Scania bulk data request for {len(request.employee_ids)} employees")
        
        request_id = f"bulk-{int(datetime.now().timestamp())}"
        employees_data = []
        granted_count = 0
        denied_count = 0
        
        for employee_id in request.employee_ids:
            try:
                # Get individual employee data
                employee_data = await get_employee_travel_data(
                    employee_id=employee_id,
                    fields=",".join(request.requested_fields),
                    token_data=token_data
                )
                
                employees_data.append(employee_data)
                
                if employee_data.data_available:
                    granted_count += 1
                else:
                    denied_count += 1
                    
            except HTTPException as e:
                # Handle individual employee errors
                employees_data.append(EmployeeTravelData(
                    employee_id=employee_id,
                    data_available=False,
                    consent_status="error",
                    last_updated=datetime.now(),
                    disclosed_fields=[],
                    data_classification="denied"
                ))
                denied_count += 1
        
        return BulkTravelDataResponse(
            total_requested=len(request.employee_ids),
            total_granted=granted_count,
            total_denied=denied_count,
            employees=employees_data,
            request_id=request_id,
            processed_at=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Failed to process bulk travel data request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process bulk request"
        )

@router.post("/scania/employee/{employee_id}/book-travel", response_model=TravelBookingResponse)
async def book_travel_with_preferences(
    employee_id: str,
    booking_request: TravelBookingRequest,
    token_data: Dict[str, Any] = Depends(verify_scania_token)
):
    """
    Book travel for employee using their preferences
    """
    try:
        logger.info(f"Scania travel booking request for employee: {employee_id}")
        
        # Get employee travel preferences
        employee_data = await get_employee_travel_data(
            employee_id=employee_id,
            fields="flight_preferences,hotel_preferences",
            token_data=token_data
        )
        
        if not employee_data.data_available:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access employee travel preferences for booking"
            )
        
        # Generate booking ID
        booking_id = f"booking-{employee_id}-{int(datetime.now().timestamp())}"
        
        # Apply employee preferences to booking
        applied_preferences = {}
        cost_optimization = {}
        
        if employee_data.travel_preferences:
            flight_prefs = employee_data.travel_preferences.get("flight_preferences", {})
            hotel_prefs = employee_data.travel_preferences.get("hotel_preferences", {})
            
            # Apply flight preferences
            if flight_prefs:
                applied_preferences["flight"] = {
                    "preferred_airlines": flight_prefs.get("preferredAirlines", []),
                    "seat_preference": flight_prefs.get("seatPreference"),
                    "class_preference": flight_prefs.get("classPreference"),
                    "meal_preference": flight_prefs.get("mealPreference")
                }
                
                # Cost optimization based on preferences
                if flight_prefs.get("classPreference") == "economy":
                    cost_optimization["flight_savings"] = "15% saved by using economy class preference"
            
            # Apply hotel preferences
            if hotel_prefs:
                applied_preferences["hotel"] = {
                    "preferred_chains": hotel_prefs.get("preferredChains", []),
                    "room_type": hotel_prefs.get("roomType"),
                    "smoking_preference": hotel_prefs.get("smokingPreference")
                }
                
                # Cost optimization
                if hotel_prefs.get("roomType") == "standard":
                    cost_optimization["hotel_savings"] = "20% saved by using standard room preference"
        
        # Simulate booking process
        booking_details = {
            "trip_id": booking_request.trip_details.get("trip_id"),
            "destination": booking_request.trip_details.get("destination"),
            "dates": booking_request.trip_details.get("dates"),
            "booking_timestamp": datetime.now().isoformat(),
            "preferences_applied": len(applied_preferences) > 0
        }
        
        # Store booking
        booking_storage[booking_id] = {
            "employee_id": employee_id,
            "booking_details": booking_details,
            "applied_preferences": applied_preferences,
            "cost_optimization": cost_optimization,
            "status": "confirmed",
            "created_at": datetime.now()
        }
        
        logger.info(f"Travel booking confirmed: {booking_id}")
        
        return TravelBookingResponse(
            booking_id=booking_id,
            employee_id=employee_id,
            booking_status="confirmed",
            applied_preferences=applied_preferences,
            cost_optimization=cost_optimization if cost_optimization else None,
            booking_details=booking_details
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to book travel: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process travel booking"
        )

@router.get("/scania/bookings/{booking_id}")
async def get_booking_details(
    booking_id: str,
    token_data: Dict[str, Any] = Depends(verify_scania_token)
):
    """
    Get details of a specific booking
    """
    try:
        if booking_id not in booking_storage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        booking = booking_storage[booking_id]
        return {
            "booking_id": booking_id,
            "employee_id": booking["employee_id"],
            "status": booking["status"],
            "booking_details": booking["booking_details"],
            "applied_preferences": booking["applied_preferences"],
            "cost_optimization": booking["cost_optimization"],
            "created_at": booking["created_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get booking details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve booking details"
        )

@router.get("/scania/analytics/travel-patterns")
async def get_travel_analytics(
    token_data: Dict[str, Any] = Depends(verify_scania_token)
):
    """
    Get anonymized travel pattern analytics for Scania fleet optimization
    """
    try:
        # Only allow AI clients to access analytics
        if "ai" not in token_data["client_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Analytics access restricted to AI systems"
            )
        
        # Generate anonymized analytics from consented data
        analytics = {
            "total_employees_with_consent": len([
                c for c in consent_storage.values() 
                if c["consent_settings"].get("ai_processing_consent", False)
            ]),
            "flight_preferences_summary": {
                "economy_preference": 85,
                "business_preference": 15,
                "aisle_seat_preference": 60,
                "window_seat_preference": 40,
                "most_preferred_airlines": ["SAS", "Lufthansa", "KLM"]
            },
            "hotel_preferences_summary": {
                "standard_room_preference": 70,
                "suite_preference": 30,
                "preferred_chains": ["Scandic", "Radisson", "Hilton"],
                "non_smoking_preference": 95
            },
            "cost_optimization_opportunities": {
                "potential_flight_savings": "12-18% through preference-based booking",
                "potential_hotel_savings": "15-25% through loyalty program utilization",
                "route_optimization": "8-12% through pattern analysis"
            },
            "generated_at": datetime.now(),
            "data_classification": "anonymized_aggregate"
        }
        
        return analytics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate travel analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate analytics"
        )