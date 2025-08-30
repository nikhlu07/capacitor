from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base

class MasterCard(Base):
    __tablename__ = "master_cards"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_aid = Column(String, nullable=False, unique=True, index=True)  # One master card per employee
    
    # Encrypted with employee's own Ed25519/X25519 key pair
    encrypted_profile_data = Column(Text, nullable=False)  # Full travel profile
    encryption_cipher_qb64 = Column(Text, nullable=False)  # CESR encoded cipher
    
    # Profile metadata (unencrypted for indexing/search)
    profile_version = Column(String, default="1.0")
    profile_completeness = Column(JSON, nullable=False)  # {"flightPreferences": true, "hotelPreferences": false, ...}
    
    # KERI-ACDC integration (hybrid storage)
    acdc_said = Column(String, nullable=False, unique=True, index=True)  # ACDC hash stored in LMDB
    acdc_schema_said = Column(String, nullable=True)  # Travel preferences schema SAID
    keri_signature = Column(Text, nullable=True)  # Employee's signature on the ACDC
    
    # Status and lifecycle
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_accessed_at = Column(DateTime, nullable=True)
    
    # Privacy controls
    profile_visibility = Column(String, default="private")  # private, limited, public
    data_retention_days = Column(Integer, default=365)  # How long to keep the data
    
    def __repr__(self):
        return f"<MasterCard(id={self.id}, employee={self.employee_aid[:8]}...)>"

class MasterCardAccessLog(Base):
    __tablename__ = "master_card_access"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    master_card_id = Column(String, ForeignKey("master_cards.id"), nullable=False)
    accessed_at = Column(DateTime, default=datetime.utcnow)
    access_type = Column(String, nullable=False)  # "read", "update", "create_context_card"
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    master_card = relationship("MasterCard", back_populates="access_logs")
    
    def __repr__(self):
        return f"<MasterCardAccessLog(card_id={self.master_card_id}, type={self.access_type})>"

class MasterCardBackup(Base):
    __tablename__ = "master_card_backups"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    master_card_id = Column(String, ForeignKey("master_cards.id"), nullable=False)
    backup_data = Column(Text, nullable=False)  # Encrypted backup of the data
    backup_reason = Column(String, nullable=False)  # "update", "migration", "manual"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    master_card = relationship("MasterCard", back_populates="backups")
    
    def __repr__(self):
        return f"<MasterCardBackup(card_id={self.master_card_id}, reason={self.backup_reason})>"

# Add back references
MasterCard.access_logs = relationship("MasterCardAccessLog", back_populates="master_card", cascade="all, delete-orphan")
MasterCard.backups = relationship("MasterCardBackup", back_populates="master_card", cascade="all, delete-orphan")

# Add index for better performance
Index('idx_employee_aid_active', MasterCard.employee_aid, MasterCard.is_active)