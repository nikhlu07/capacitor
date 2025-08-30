"""Identity management endpoints."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from app.services.keria import keria_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/create")
async def create_employee_identity(employee_id: str, company: str = "scania") -> Dict[str, Any]:
    """Create a new KERI identity for an employee using Veridian KERIA."""
    try:
        # Generate unique name for the identifier
        name = f"{company}-employee-{employee_id}"
        
        # Create KERI identifier using Veridian KERIA
        result = await keria_service.create_identifier(name, employee_id)
        
        logger.info(f"✅ Created KERI identity for employee {employee_id}: {result['aid']}")
        
        return {
            "success": True,
            "employee_id": employee_id,
            "company": company,
            "keri_aid": result["aid"],
            "oobi": result["oobi"],
            "witnesses": result["witnesses"],
            "threshold": result["threshold"],
            "message": f"KERI identity created successfully for {employee_id}",
            "powered_by": "Veridian KERIA"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to create identity for {employee_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create KERI identity: {str(e)}"
        )

@router.get("/list")
async def list_identities() -> Dict[str, Any]:
    """List all identities managed by our KERIA agent."""
    try:
        identifiers = await keria_service.get_identifiers()
        
        return {
            "success": True,
            "count": len(identifiers),
            "identifiers": identifiers,
            "powered_by": "Veridian KERIA"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to list identities: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list identities: {str(e)}"
        )

@router.get("/oobi/{aid}")
async def get_oobi(aid: str) -> Dict[str, Any]:
    """Get OOBI for a specific AID."""
    try:
        oobi = await keria_service.get_oobi(aid)
        return {
            "aid": aid,
            "oobi": oobi,
            "powered_by": "Veridian KERIA"
        }
    except Exception as e:
        logger.error(f"❌ Failed to get OOBI for {aid}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get OOBI: {str(e)}"
        )

@router.post("/resolve-oobi")
async def resolve_oobi(oobi_url: str) -> Dict[str, Any]:
    """Resolve OOBI to discover AID and establish connection."""
    try:
        result = await keria_service.resolve_oobi(oobi_url)
        
        logger.info(f"✅ OOBI resolved successfully: {result['aid']}")
        
        return {
            "success": True,
            "oobi_url": oobi_url,
            "discovered_aid": result["aid"],
            "witness_info": result.get("witnesses", []),
            "connection_status": "established",
            "message": "OOBI resolved and connection established",
            "powered_by": "Veridian KERIA"
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to resolve OOBI {oobi_url}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to resolve OOBI: {str(e)}"
        )

@router.post("/discover-employee")
async def discover_employee_aid(employee_id: str, oobi_url: str) -> Dict[str, Any]:
    """Discover employee AID via OOBI for company integration."""
    try:
        # Resolve OOBI to get AID
        oobi_result = await keria_service.resolve_oobi(oobi_url)
        discovered_aid = oobi_result["aid"]
        
        # Store mapping for company access
        from app.api.v1.endpoints.mobile import employee_aids
        
        # Create discovery record
        discovery_record = {
            "employee_id": employee_id,
            "aid": discovered_aid,
            "oobi": oobi_url,
            "discovered_at": "datetime.now()",
            "discovery_method": "oobi_resolution",
            "status": "discovered"
        }
        
        logger.info(f"✅ Employee AID discovered: {employee_id} -> {discovered_aid}")
        
        return {
            "success": True,
            "employee_id": employee_id,
            "discovered_aid": discovered_aid,
            "oobi_url": oobi_url,
            "witness_info": oobi_result.get("witnesses", []),
            "message": f"Employee {employee_id} AID discovered successfully",
            "next_steps": [
                "Employee can now create Master Card",
                "Company can request Context Cards via consent flow",
                "OOBI enables cryptographic verification"
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to discover employee AID: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to discover employee AID: {str(e)}"
        )