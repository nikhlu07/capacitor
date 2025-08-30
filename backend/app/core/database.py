"""
Database configuration and session management
"""

import logging
from typing import Generator, Any, Optional
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create SQLAlchemy engine
try:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
    )
    
    # Create SessionLocal class
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Create Base class for models
    Base = declarative_base()
    
    logger.info("✅ SQLAlchemy database configured")
    
except Exception as e:
    logger.error(f"❌ Failed to configure database: {e}")
    raise RuntimeError(f"Database configuration failed: {e}")

def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {e}")
        raise

def get_db_session() -> Optional[Session]:
    """Get a database session (for direct use)"""
    try:
        return SessionLocal()
    except Exception as e:
        logger.error(f"❌ Failed to create database session: {e}")
        return None

def get_db() -> Generator[Any, None, None]:
    """
    Dependency to get database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        if hasattr(db, 'close'):
            db.close()