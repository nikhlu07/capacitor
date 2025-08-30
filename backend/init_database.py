#!/usr/bin/env python3
"""
Database initialization script for Travlr-ID
Creates all tables and initializes the database
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import Base, create_tables
from app.models import (
    employees, credentials, context_cards, 
    master_cards, database
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_database_if_not_exists():
    """Create the database if it doesn't exist"""
    try:
        if settings.DATABASE_URL.startswith("postgresql://"):
            # Parse database URL to get connection params
            db_parts = settings.DATABASE_URL.replace("postgresql://", "").split("/")
            db_name = db_parts[-1]
            base_url = "postgresql://" + "/".join(db_parts[:-1]) + "/postgres"
            
            logger.info(f"Checking if PostgreSQL database '{db_name}' exists...")
            
            # Connect to postgres database to create our database
            engine = create_engine(base_url)
            with engine.connect() as conn:
                # Use autocommit mode for database creation
                conn = conn.execution_options(autocommit=True)
                
                # Check if database exists
                result = conn.execute(text(
                    "SELECT 1 FROM pg_database WHERE datname = :db_name"
                ), {"db_name": db_name})
                
                if not result.fetchone():
                    logger.info(f"Creating database '{db_name}'...")
                    conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                    logger.info(f"✅ Database '{db_name}' created successfully")
                else:
                    logger.info(f"✅ Database '{db_name}' already exists")
        else:
            # SQLite - just check if data directory exists
            import os
            if "sqlite" in settings.DATABASE_URL:
                db_file = settings.DATABASE_URL.replace("sqlite:///", "")
                db_dir = os.path.dirname(db_file)
                
                if db_dir and not os.path.exists(db_dir):
                    os.makedirs(db_dir, exist_ok=True)
                    logger.info(f"✅ Created SQLite data directory: {db_dir}")
                
                logger.info(f"✅ SQLite database will be created at: {db_file}")
                
    except Exception as e:
        logger.error(f"❌ Failed to create database: {e}")
        raise

def init_tables():
    """Initialize all database tables"""
    try:
        logger.info("Creating database tables...")
        create_tables()
        logger.info("✅ All tables created successfully")
        
        # Import all models to ensure they're registered
        logger.info("Importing all models...")
        from app.models.employees import Employee
        from app.models.credentials import Credential
        from app.models.context_cards import ContextCard, ContextCardAccess
        from app.models.master_cards import MasterCard, MasterCardAccessLog, MasterCardBackup
        from app.models.database import ConsentRecord, AuditLog, CompanyKey, DeliveryLog
        
        logger.info("✅ All models imported successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        raise

def verify_database():
    """Verify database connection and tables"""
    try:
        from app.core.database import engine
        
        logger.info("Verifying database connection...")
        with engine.connect() as conn:
            # Test basic connection
            if settings.DATABASE_URL.startswith("postgresql://"):
                result = conn.execute(text("SELECT version()"))
                version = result.fetchone()[0]
                logger.info(f"✅ Connected to PostgreSQL: {version}")
                
                # Check tables exist
                result = conn.execute(text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """))
            else:
                # SQLite
                result = conn.execute(text("SELECT sqlite_version()"))
                version = result.fetchone()[0]
                logger.info(f"✅ Connected to SQLite: {version}")
                
                # Check tables exist
                result = conn.execute(text("""
                    SELECT name 
                    FROM sqlite_master 
                    WHERE type='table'
                    ORDER BY name
                """))
            
            tables = [row[0] for row in result.fetchall()]
            logger.info(f"✅ Found {len(tables)} tables: {', '.join(tables)}")
            
            return True
            
    except Exception as e:
        logger.error(f"❌ Database verification failed: {e}")
        return False

def main():
    """Main initialization function"""
    logger.info("🚀 Initializing Travlr-ID Database")
    logger.info("=" * 50)
    
    try:
        # Step 1: Create database if needed
        create_database_if_not_exists()
        
        # Step 2: Create all tables
        init_tables()
        
        # Step 3: Verify everything works
        if verify_database():
            logger.info("=" * 50)
            logger.info("✅ Database initialization completed successfully!")
            logger.info("🎯 Travlr-ID is ready to use PostgreSQL")
            return True
        else:
            logger.error("❌ Database verification failed")
            return False
            
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)