"""
Database service for Travlr-ID
Handles database connections and operations
"""

import asyncpg
import logging
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class DatabaseService:
    """Database service for managing PostgreSQL connections."""
    
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        
    async def initialize(self):
        """Initialize database connection pool."""
        try:
            self.pool = await asyncpg.create_pool(
                host=settings.DATABASE_HOST,
                port=settings.DATABASE_PORT,
                user=settings.DATABASE_USER,
                password=settings.DATABASE_PASSWORD,
                database=settings.DATABASE_NAME,
                min_size=1,
                max_size=10
            )
            logger.info("✅ Database connection pool initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize database: {e}")
            raise
    
    async def health_check(self) -> bool:
        """Check database connection health."""
        if not self.pool:
            return False
        
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
    
    async def close(self):
        """Close database connection pool."""
        if self.pool:
            await self.pool.close()
            logger.info("✅ Database connection pool closed")

# Global database service instance
database_service = DatabaseService()