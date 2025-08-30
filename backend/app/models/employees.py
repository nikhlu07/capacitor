from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

# Import SQLAlchemy components for real database models
from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON
from app.core.database import Base

# SQLAlchemy models
class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id = Column(String, nullable=False, unique=True, index=True)
    aid = Column(String, nullable=False, unique=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True, index=True)
    department = Column(String, nullable=True)
    position = Column(String, nullable=True)
    
    # KERI-related fields
    keri_keys = Column(JSON, nullable=True)  # Store public keys and OOBI info
    is_active = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Employee(id={self.employee_id}, aid={self.aid[:8]}..., name={self.full_name})>"

logger.info("✅ Employee SQLAlchemy model loaded")