"""Travel Preferences Data Models"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime

class SeatPreference(str, Enum):
    """Seat preference options"""
    AISLE = "aisle"
    WINDOW = "window"
    MIDDLE = "middle"
    NO_PREFERENCE = "no_preference"

class MealPreference(str, Enum):
    """Meal preference options"""
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    KOSHER = "kosher"
    HALAL = "halal"
    GLUTEN_FREE = "gluten_free"
    STANDARD = "standard"
    NO_MEAL = "no_meal"

class AccommodationType(str, Enum):
    """Accommodation type preferences"""
    HOTEL = "hotel"
    RESORT = "resort"
    APARTMENT = "apartment"
    HOSTEL = "hostel"
    BED_AND_BREAKFAST = "bed_and_breakfast"
    NO_PREFERENCE = "no_preference"

class TransportationMode(str, Enum):
    """Transportation mode preferences"""
    FLIGHT = "flight"
    TRAIN = "train"
    BUS = "bus"
    CAR_RENTAL = "car_rental"
    TAXI = "taxi"
    PUBLIC_TRANSPORT = "public_transport"

class TravelPreferencesData(BaseModel):
    """Travel preferences data for ACDC credential"""
    
    # Personal Information
    employee_id: str = Field(..., description="Employee identifier")
    full_name: str = Field(..., description="Full name of the traveler")
    
    # Flight Preferences
    seat_preference: SeatPreference = Field(default=SeatPreference.NO_PREFERENCE)
    meal_preference: MealPreference = Field(default=MealPreference.STANDARD)
    preferred_airlines: List[str] = Field(default_factory=list, description="Preferred airline codes")
    frequent_flyer_numbers: Dict[str, str] = Field(default_factory=dict, description="Airline -> FF number mapping")
    
    # Accommodation Preferences
    accommodation_type: AccommodationType = Field(default=AccommodationType.NO_PREFERENCE)
    preferred_hotel_chains: List[str] = Field(default_factory=list)
    loyalty_program_numbers: Dict[str, str] = Field(default_factory=dict, description="Hotel chain -> loyalty number")
    room_preferences: List[str] = Field(default_factory=list, description="e.g., non-smoking, high floor, quiet")
    
    # Transportation Preferences
    preferred_transportation: List[TransportationMode] = Field(default_factory=list)
    car_rental_preferences: Dict[str, str] = Field(default_factory=dict, description="Company -> preferences")
    
    # Accessibility & Special Requirements
    accessibility_requirements: List[str] = Field(default_factory=list)
    medical_requirements: List[str] = Field(default_factory=list)
    special_assistance: List[str] = Field(default_factory=list)
    
    # Budget & Policy
    budget_category: Optional[str] = Field(None, description="Budget category for travel")
    policy_exceptions: List[str] = Field(default_factory=list)
    
    # Contact & Emergency
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_contact_method: Optional[str] = Field(default="email")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    version: str = Field(default="1.0")

class TravelPreferencesCredentialRequest(BaseModel):
    """Request model for issuing travel preferences credential"""
    
    issuer_aid: str = Field(..., description="AID of the credential issuer")
    recipient_aid: str = Field(..., description="AID of the credential recipient")
    travel_preferences: TravelPreferencesData = Field(..., description="Travel preferences data")

class TravelPreferencesCredentialResponse(BaseModel):
    """Response model for travel preferences credential"""
    
    success: bool
    credential_said: str
    issuer: str
    recipient: str
    schema_said: str
    travel_preferences: TravelPreferencesData
    message: str
    powered_by: str = "Veridian KERIA"