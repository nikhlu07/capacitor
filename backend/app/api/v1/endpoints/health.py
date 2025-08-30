"""Health check endpoints."""

from fastapi import APIRouter
from app.core.config import settings
from app.services.keria import keria_service

router = APIRouter()

@router.get("/")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

@router.get("/keria")
async def keria_health():
    """KERIA service health check."""
    keria_status = await keria_service.health_check()
    
    return {
        "service": "KERIA",
        "status": "healthy" if keria_status.get("admin_api") and keria_status.get("agent_api") else "unhealthy",
        "details": keria_status
    }