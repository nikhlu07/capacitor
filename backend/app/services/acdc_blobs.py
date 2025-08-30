"""
Service for storing encrypted ACDC blobs in PostgreSQL.
"""

import json
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from app.services.database import database_service

logger = logging.getLogger(__name__)


class ACDCBlobStore:
    async def put(
        self,
        *,
        said: str,
        issuer_aid: str,
        holder_aid: str,
        schema_said: Optional[str],
        digest_algo: str,
        digest: str,
        enc_blob_bytes: bytes,
    ) -> None:
        if not database_service.pool:
            raise RuntimeError("Database pool not initialized")
        size_bytes = len(enc_blob_bytes)
        async with database_service.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO acdc_blobs (
                    said, issuer_aid, holder_aid, schema_said,
                    digest_algo, digest, size_bytes, enc_blob, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW())
                ON CONFLICT (said) DO UPDATE SET
                    issuer_aid = EXCLUDED.issuer_aid,
                    holder_aid = EXCLUDED.holder_aid,
                    schema_said = EXCLUDED.schema_said,
                    digest_algo = EXCLUDED.digest_algo,
                    digest = EXCLUDED.digest,
                    size_bytes = EXCLUDED.size_bytes,
                    enc_blob = EXCLUDED.enc_blob
                """,
                said,
                issuer_aid,
                holder_aid,
                schema_said,
                digest_algo,
                digest,
                size_bytes,
                enc_blob_bytes,
            )
        logger.info(f"✅ Stored ACDC blob in Postgres: {said} ({size_bytes} bytes)")

    async def get(self, said: str) -> Optional[Dict[str, Any]]:
        if not database_service.pool:
            raise RuntimeError("Database pool not initialized")
        async with database_service.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT said, issuer_aid, holder_aid, schema_said,
                       digest_algo, digest, size_bytes, enc_blob, created_at
                FROM acdc_blobs
                WHERE said = $1
                """,
                said,
            )
            if not row:
                return None
            return dict(row)


# Global instance
acdc_blob_store = ACDCBlobStore()
