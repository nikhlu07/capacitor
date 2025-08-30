from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

# Import SQLAlchemy components for real database models
from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

# SQLAlchemy models
class ContextCard(Base):
    __tablename__ = "context_cards"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_aid = Column(String, nullable=False, index=True)
    company_aid = Column(String, nullable=False, index=True)
    company_name = Column(String, nullable=False)
    
    # Encrypted travel preference data using X25519
    encrypted_data = Column(Text, nullable=False)
    encryption_cipher_qb64 = Column(Text, nullable=False)  # CESR encoded cipher
    
    # Which fields are shared (for display purposes)
    shared_fields = Column(JSON, nullable=False)  # ["flightPreferences", "hotelPreferences", etc.]
    
    # Access control
    is_active = Column(Boolean, default=True)
    access_granted_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Metadata
    purpose = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # KERI-ACDC integration (hybrid storage)
    acdc_said = Column(String, nullable=False, unique=True, index=True)  # ACDC hash stored in LMDB
    master_acdc_said = Column(String, nullable=True, index=True)  # Link to master card ACDC
    credential_schema_said = Column(String, nullable=True)  # ACDC schema reference
    
    def __repr__(self):
        return f"<ContextCard(id={self.id}, employee={self.employee_aid[:8]}..., company={self.company_name})>"

class ContextCardAccess(Base):
    __tablename__ = "context_card_access"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    context_card_id = Column(String, ForeignKey("context_cards.id"), nullable=False)
    accessed_at = Column(DateTime, default=datetime.utcnow)
    accessed_by_aid = Column(String, nullable=False)
    access_type = Column(String, nullable=False)  # "read", "export", "verify"
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    context_card = relationship("ContextCard", back_populates="access_logs")
    
    def __repr__(self):
        return f"<ContextCardAccess(card_id={self.context_card_id}, type={self.access_type})>"

# Add back reference to ContextCard
ContextCard.access_logs = relationship("ContextCardAccess", back_populates="context_card", cascade="all, delete-orphan")
    
logger.info("✅ SQLAlchemy context card models loaded")
