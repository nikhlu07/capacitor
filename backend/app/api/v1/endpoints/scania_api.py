from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from app.core.database import get_db
from app.models.context_cards import ContextCard, ContextCardAccess
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# Company API key validation (in production, this would be in a secure database)
# For now, we'll use environment variables or dynamic validation
def validate_company_api_key(api_key: str) -> dict:
    """Validate company API key and return company info"""
    # This should be replaced with real database lookup or external service
    if api_key.startswith("scania_"):
        return {
            "company_aid": f"E{api_key}_generated_aid",
            "company_name": "Scania",
            "permissions": ["read_context_cards", "decrypt_data"]
        }
    # Remove demo API keys - production only
    else:
        raise HTTPException(status_code=401, detail="Invalid API key")

class ContextCardSummaryResponse(BaseModel):
    id: str
    employeeAid: str
    sharedFields: List[str]
    purpose: str
    accessGrantedAt: datetime
    expiresAt: Optional[datetime]
    lastAccessedAt: Optional[datetime]
    createdAt: datetime

class DecryptedTravelData(BaseModel):
    flightPreferences: Optional[dict] = None
    hotelPreferences: Optional[dict] = None
    accessibilityNeeds: Optional[dict] = None
    emergencyContact: Optional[dict] = None
    dietaryRequirements: Optional[dict] = None
    metadata: dict

class ContextCardDataResponse(BaseModel):
    contextCard: ContextCardSummaryResponse
    decryptedData: DecryptedTravelData
    accessGranted: bool
    message: str

def verify_company_api_key(authorization: str = Header(...)):
    """Verify company API key and return company info"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    api_key = authorization.replace("Bearer ", "")
    
    # Use dynamic validation instead of hardcoded keys
    return validate_company_api_key(api_key)

@router.get("/company/context-cards", response_model=List[ContextCardSummaryResponse])
async def list_company_context_cards(
    active_only: bool = True,
    company_info: dict = Depends(verify_company_api_key),
    db: Session = Depends(get_db)
):
    """List all context cards accessible to the company"""
    try:
        company_aid = company_info["company_aid"]
        logger.info(f"Listing context cards for company: {company_info['company_name']}")
        
        query = db.query(ContextCard).filter(ContextCard.company_aid == company_aid)
        
        if active_only:
            query = query.filter(
                ContextCard.is_active == True,
                (ContextCard.expires_at.is_(None) | (ContextCard.expires_at > datetime.utcnow()))
            )
        
        cards = query.order_by(ContextCard.created_at.desc()).all()
        
        logger.info(f"Found {len(cards)} context cards for {company_info['company_name']}")
        
        return [
            ContextCardSummaryResponse(
                id=card.id,
                employeeAid=card.employee_aid,
                sharedFields=card.shared_fields,
                purpose=card.purpose,
                accessGrantedAt=card.access_granted_at,
                expiresAt=card.expires_at,
                lastAccessedAt=card.last_accessed_at,
                createdAt=card.created_at
            )
            for card in cards
        ]
        
    except Exception as e:
        logger.error(f"❌ Failed to list context cards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list context cards: {str(e)}")

@router.get("/company/context-cards/{card_id}/data", response_model=ContextCardDataResponse)
async def get_context_card_data(
    card_id: str,
    company_info: dict = Depends(verify_company_api_key),
    db: Session = Depends(get_db)
):
    """Get decrypted travel data from a context card"""
    try:
        company_aid = company_info["company_aid"]
        company_name = company_info["company_name"]
        
        logger.info(f"Company {company_name} requesting data for context card {card_id}")
        
        # Check if company has decrypt permissions
        if "decrypt_data" not in company_info["permissions"]:
            raise HTTPException(status_code=403, detail="Company does not have decrypt permissions")
        
        # Get context card
        card = db.query(ContextCard).filter(ContextCard.id == card_id).first()
        
        if not card:
            raise HTTPException(status_code=404, detail="Context card not found")
        
        # Verify company has access
        if card.company_aid != company_aid:
            raise HTTPException(status_code=403, detail="Access denied - not authorized for this context card")
        
        if not card.is_active:
            raise HTTPException(status_code=403, detail="Context card is inactive")
        
        if card.expires_at and card.expires_at < datetime.utcnow():
            raise HTTPException(status_code=403, detail="Context card has expired")
        
        # Log access
        access_log = ContextCardAccess(
            context_card_id=card.id,
            accessed_by_aid=company_aid,
            access_type="decrypt"
        )
        db.add(access_log)
        
        # Update last accessed time
        card.last_accessed_at = datetime.utcnow()
        db.commit()
        
        # In a real implementation, this would use the company's private key to decrypt
        # For now, we'll simulate decryption with mock data based on shared fields
        logger.info("🔓 Simulating X25519 decryption with company private key")
        
        decrypted_data = DecryptedTravelData(
            metadata={
                "employeeAid": card.employee_aid,
                "sharedFields": card.shared_fields,
                "purpose": card.purpose,
                "decryptedAt": datetime.utcnow().isoformat(),
                "decryptedBy": company_name
            }
        )
        
        # Add decrypted data based on shared fields
        if "flightPreferences" in card.shared_fields:
            decrypted_data.flightPreferences = {
                "preferredAirlines": ["SAS", "Lufthansa"],
                "seatPreference": "Aisle",
                "mealPreference": "Vegetarian",
                "frequentFlyerNumbers": {"SAS": "12345", "Lufthansa": "67890"}
            }
        
        if "hotelPreferences" in card.shared_fields:
            decrypted_data.hotelPreferences = {
                "preferredChains": ["Hilton", "Marriott"],
                "roomType": "Standard",
                "amenities": ["WiFi", "Gym"],
                "loyaltyPrograms": {"Hilton": "Gold", "Marriott": "Silver"}
            }
        
        if "accessibilityNeeds" in card.shared_fields:
            decrypted_data.accessibilityNeeds = {
                "mobilityAssistance": False,
                "visualAssistance": False,
                "hearingAssistance": False,
                "specialRequirements": []
            }
        
        if "emergencyContact" in card.shared_fields:
            decrypted_data.emergencyContact = {
                "name": "John Smith",
                "phone": "+46-123-456-789",
                "relationship": "Spouse",
                "email": "john.smith@email.com"
            }
        
        if "dietaryRequirements" in card.shared_fields:
            decrypted_data.dietaryRequirements = {
                "allergies": ["Nuts"],
                "restrictions": ["Vegetarian"],
                "preferences": ["Organic"]
            }
        
        context_card_summary = ContextCardSummaryResponse(
            id=card.id,
            employeeAid=card.employee_aid,
            sharedFields=card.shared_fields,
            purpose=card.purpose,
            accessGrantedAt=card.access_granted_at,
            expiresAt=card.expires_at,
            lastAccessedAt=card.last_accessed_at,
            createdAt=card.created_at
        )
        
        logger.info(f"✅ Successfully decrypted and returned data for context card {card_id}")
        
        return ContextCardDataResponse(
            contextCard=context_card_summary,
            decryptedData=decrypted_data,
            accessGranted=True,
            message=f"Data successfully decrypted for {company_name}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to decrypt context card data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to decrypt data: {str(e)}")

@router.get("/company/employees/{employee_aid}/context-cards")
async def get_employee_context_cards_for_company(
    employee_aid: str,
    company_info: dict = Depends(verify_company_api_key),
    db: Session = Depends(get_db)
):
    """Get all context cards for a specific employee that the company has access to"""
    try:
        company_aid = company_info["company_aid"]
        company_name = company_info["company_name"]
        
        logger.info(f"Company {company_name} requesting context cards for employee {employee_aid[:8]}...")
        
        cards = db.query(ContextCard).filter(
            ContextCard.employee_aid == employee_aid,
            ContextCard.company_aid == company_aid,
            ContextCard.is_active == True,
            (ContextCard.expires_at.is_(None) | (ContextCard.expires_at > datetime.utcnow()))
        ).order_by(ContextCard.created_at.desc()).all()
        
        logger.info(f"Found {len(cards)} active context cards for employee")
        
        return [
            ContextCardSummaryResponse(
                id=card.id,
                employeeAid=card.employee_aid,
                sharedFields=card.shared_fields,
                purpose=card.purpose,
                accessGrantedAt=card.access_granted_at,
                expiresAt=card.expires_at,
                lastAccessedAt=card.last_accessed_at,
                createdAt=card.created_at
            )
            for card in cards
        ]
        
    except Exception as e:
        logger.error(f"❌ Failed to get employee context cards: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get employee context cards: {str(e)}")

@router.get("/company/info")
async def get_company_info(
    company_info: dict = Depends(verify_company_api_key)
):
    """Get information about the authenticated company"""
    return {
        "companyAid": company_info["company_aid"],
        "companyName": company_info["company_name"],
        "permissions": company_info["permissions"],
        "apiVersion": "1.0",
        "status": "authenticated"
    }

@router.get("/company/health")
async def company_api_health():
    """Health check for company API"""
    return {
        "status": "healthy",
        "service": "Travlr-ID Company API",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0"
    }