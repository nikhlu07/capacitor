"""
REST endpoints for encrypted ACDC blob storage and retrieval.
"""

import base64
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.services.acdc_blobs import acdc_blob_store
from app.services.keria import keria_service

logger = logging.getLogger(__name__)
router = APIRouter()


class ACDCBlobRequest(BaseModel):
    said: str
    issuer_aid: str
    holder_aid: str
    schema_said: Optional[str] = None
    digest_algo: str = "sha256"
    digest: str
    enc_blob_b64: str  # base64 encoded encrypted blob


class ACDCBlobResponse(BaseModel):
    said: str
    issuer_aid: str
    holder_aid: str
    schema_said: Optional[str]
    digest_algo: str
    digest: str
    size_bytes: int
    enc_blob_b64: str
    created_at: str


@router.put("/blobs/{said}")
async def store_acdc_blob(
    said: str,
    request: ACDCBlobRequest,
    aid_header: str = Header(..., alias="AID")
) -> Dict[str, Any]:
    """Store encrypted ACDC blob keyed by SAID."""
    try:
        # Verify SAID matches request
        if said != request.said:
            raise HTTPException(status_code=400, detail="SAID mismatch in path and body")
        
        # Basic auth: verify AID header matches issuer or holder
        if aid_header not in [request.issuer_aid, request.holder_aid]:
            raise HTTPException(status_code=403, detail="AID header must match issuer or holder")
        
        # Decode base64 blob
        try:
            enc_blob_bytes = base64.b64decode(request.enc_blob_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 encoded blob")
        
        # Store in Postgres
        await acdc_blob_store.put(
            said=request.said,
            issuer_aid=request.issuer_aid,
            holder_aid=request.holder_aid,
            schema_said=request.schema_said,
            digest_algo=request.digest_algo,
            digest=request.digest,
            enc_blob_bytes=enc_blob_bytes,
        )
        
        logger.info(f"✅ Stored ACDC blob: {said}")
        
        return {
            "success": True,
            "said": said,
            "size_bytes": len(enc_blob_bytes),
            "message": "ACDC blob stored successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to store ACDC blob {said}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to store blob: {str(e)}")


@router.get("/blobs/{said}")
async def get_acdc_blob(
    said: str,
    aid_header: str = Header(..., alias="AID")
) -> ACDCBlobResponse:
    """Retrieve encrypted ACDC blob by SAID."""
    try:
        # Get blob from Postgres
        blob_data = await acdc_blob_store.get(said)
        if not blob_data:
            raise HTTPException(status_code=404, detail="ACDC blob not found")
        
        # Basic auth: verify AID header matches issuer or holder
        if aid_header not in [blob_data["issuer_aid"], blob_data["holder_aid"]]:
            raise HTTPException(status_code=403, detail="AID header must match issuer or holder")
        
        # Encode blob as base64
        enc_blob_b64 = base64.b64encode(blob_data["enc_blob"]).decode()
        
        logger.info(f"✅ Retrieved ACDC blob: {said}")
        
        return ACDCBlobResponse(
            said=blob_data["said"],
            issuer_aid=blob_data["issuer_aid"],
            holder_aid=blob_data["holder_aid"],
            schema_said=blob_data["schema_said"],
            digest_algo=blob_data["digest_algo"],
            digest=blob_data["digest"],
            size_bytes=blob_data["size_bytes"],
            enc_blob_b64=enc_blob_b64,
            created_at=blob_data["created_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to retrieve ACDC blob {said}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve blob: {str(e)}")


@router.get("/blobs/{said}/verify")
async def verify_acdc_blob_integrity(
    said: str,
    aid_header: str = Header(..., alias="AID")
) -> Dict[str, Any]:
    """Verify ACDC blob integrity against KERIA."""
    try:
        # Get blob from Postgres
        blob_data = await acdc_blob_store.get(said)
        if not blob_data:
            raise HTTPException(status_code=404, detail="ACDC blob not found")
        
        # Basic auth check
        if aid_header not in [blob_data["issuer_aid"], blob_data["holder_aid"]]:
            raise HTTPException(status_code=403, detail="AID header must match issuer or holder")
        
        # Verify credential exists in KERIA
        keria_valid = await keria_service.verify_credential(said)
        
        # Compute current digest
        import hashlib
        current_digest = hashlib.sha256(blob_data["enc_blob"]).hexdigest()
        digest_match = current_digest == blob_data["digest"]
        
        integrity_status = "valid" if (keria_valid and digest_match) else "invalid"
        
        logger.info(f"✅ Verified ACDC blob integrity: {said} - {integrity_status}")
        
        return {
            "said": said,
            "integrity_status": integrity_status,
            "keria_valid": keria_valid,
            "digest_match": digest_match,
            "stored_digest": blob_data["digest"],
            "computed_digest": current_digest,
            "size_bytes": blob_data["size_bytes"],
            "created_at": blob_data["created_at"].isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to verify ACDC blob {said}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to verify blob: {str(e)}")
