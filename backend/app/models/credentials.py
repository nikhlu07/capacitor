from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

# Import SQLAlchemy components for real database models
from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

# SQLAlchemy models
class Credential(Base):
    __tablename__ = "credentials"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_aid = Column(String, nullable=False, index=True)
    credential_said = Column(String, nullable=False, unique=True, index=True)
    schema_said = Column(String, nullable=False, index=True)
    
    # Credential metadata
    credential_type = Column(String, nullable=False)  # "travel_preferences", "master_card", etc.
    status = Column(String, default="active")  # "active", "revoked", "expired"
    
    # ACDC hash/reference (full ACDC stored in KERIA/LMDB)
    acdc_hash = Column(String, nullable=True, index=True)  # Blake3 hash of full ACDC
    acdc_metadata = Column(JSON, nullable=True)  # Business metadata only
    
    # Full credential payload (business data)
    credential_data = Column(JSON, nullable=False)  # Travel preferences, etc.
    
    # Issuance info
    issuer_aid = Column(String, nullable=False)  # Usually same as employee_aid for self-issued
    issued_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Credential(id={self.credential_said[:8]}..., type={self.credential_type}, employee={self.employee_aid[:8]}...)>"

logger.info("✅ Credential SQLAlchemy model loaded")