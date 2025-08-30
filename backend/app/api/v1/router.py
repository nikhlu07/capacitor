"""API v1 router."""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    identity,
    credentials,
    mobile_keri,
    scania,
    master_cards,
    context_cards,
    consent,
    company_vault,
    working_storage,
    docs,
    acdc_blobs,
    consent_workflow,
    oobi_exchange,
    company_data_access,
    keri_identifiers,
    metadata
)
from app.services.notification_service import notification_router

api_router = APIRouter()

# Include essential endpoint routers for testing
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(identity.router, prefix="/identity", tags=["🆔 KERI Identity"])
api_router.include_router(working_storage.router, tags=[" WORKING Storage"])
api_router.include_router(working_storage.router, tags=["🟢 WORKING Storage"])
api_router.include_router(mobile_keri.router, tags=["Mobile"])
api_router.include_router(master_cards.router, tags=["Master Cards"])
api_router.include_router(context_cards.router, tags=["Context Cards"])
api_router.include_router(scania.router, tags=["Company API"])
api_router.include_router(acdc_blobs.router, prefix="/credentials", tags=["ACDC Blobs"])

# New consent workflow and data access endpoints
api_router.include_router(consent_workflow.router, tags=["🔄 Consent Workflow"])
api_router.include_router(oobi_exchange.router, tags=["🤝 OOBI Exchange"])
api_router.include_router(company_data_access.router, tags=["🏢 Company Data Access"])
api_router.include_router(notification_router, tags=["📱 Notifications"])

# REAL KERI identifiers endpoint - THE MISSING PIECE!
api_router.include_router(keri_identifiers.router, tags=["🔑 REAL KERI Identifiers"])

# Metadata-only endpoints (mobile issues via SignifyTS; backend stores metadata)
api_router.include_router(metadata.router, tags=["🗂️ Metadata Store"])