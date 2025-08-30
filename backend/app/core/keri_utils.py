"""
Business Logic Utilities - NO KERI OPERATIONS
All KERI operations should be done via SignifyTS → KERIA
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# REMOVED: All fake KERI implementations
# All KERI operations (AIDs, SAIDs, credentials) should be done via:
# Mobile App → SignifyTS → KERIA → Witnesses

def validate_aid_format(aid: str) -> bool:
    """
    Basic AID format validation (but don't generate them here)
    Real AIDs come from KERIA via SignifyTS
    """
    if not aid or not isinstance(aid, str):
        return False
    return aid.startswith('E') and len(aid) == 45

# Business logic utilities only
def extract_aid_prefix(aid: str, prefix_length: int = 8) -> str:
    """
    Extract a short prefix from an AID for logging/display
    Used for business logic only - AIDs come from SignifyTS
    """
    if not aid or len(aid) < prefix_length:
        return aid
    return aid[:prefix_length] + "..."

# Business constants - not for KERI generation
KNOWN_COMPANIES = {
    "scania": "Scania AB",
    "volvo": "Volvo Group", 
    "daf": "DAF Trucks",
    "mercedes": "Mercedes-Benz",
    "man": "MAN Truck & Bus"
}

def get_company_name(company_key: str) -> str:
    """
    Get display name for known companies
    """
    return KNOWN_COMPANIES.get(company_key.lower(), company_key.title())