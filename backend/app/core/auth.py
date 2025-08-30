"""
Authentication and authorization for Travlr-ID
"""

from fastapi import HTTPException, Header
from typing import Optional

async def get_employee_aid(x_employee_aid: Optional[str] = Header(None)) -> str:
    """Get employee AID from header."""
    if not x_employee_aid:
        raise HTTPException(status_code=401, detail="X-Employee-AID header required")
    return x_employee_aid

async def get_company_api_key(authorization: Optional[str] = Header(None)) -> str:
    """Get company API key from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    return authorization[7:]  # Remove "Bearer " prefix