from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

# Import SQLAlchemy components for real database models
from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON
from app.core.database import Base

# SQLAlchemy models
class ConsentRecord(Base):
    __tablename__ = "consent_records"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id = Column(String, nullable=False, unique=True, index=True)
    employee_aid = Column(String, nullable=False, index=True)
    company_aid = Column(String, nullable=False, index=True)
    
    # Consent details
    requested_fields = Column(JSON, nullable=False)
    approved_fields = Column(JSON, nullable=True)
    purpose = Column(String, nullable=False)
    status = Column(String, default="pending")  # "pending", "approved", "denied", "expired", "revoked"
    
    # Company encryption key
    company_public_key = Column(String, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    denied_at = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Denial reason
    denial_reason = Column(String, nullable=True)
    
    # ACDC/KERI integration
    context_card_said = Column(String, nullable=True, index=True)
    employee_signature = Column(String, nullable=True)
    
    def __repr__(self):
        return f"<ConsentRecord(id={self.request_id}, employee={self.employee_aid[:8]}..., status={self.status})>"

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String, nullable=False)  # "consent", "credential", "context_card", etc.
    entity_id = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # "created", "approved", "accessed", etc.
    
    # Who performed the action
    actor_aid = Column(String, nullable=False, index=True)
    actor_type = Column(String, nullable=False)  # "employee", "company", "system"
    
    # Action details
    details = Column(JSON, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<AuditLog(entity={self.entity_type}:{self.entity_id[:8]}..., action={self.action})>"

class CompanyKey(Base):
    __tablename__ = "company_keys"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_aid = Column(String, nullable=False, index=True)
    company_name = Column(String, nullable=False)
    
    # Encryption keys
    x25519_public_key = Column(String, nullable=False)
    x25519_private_key = Column(String, nullable=False)  # Encrypted in production
    api_key = Column(String, nullable=False, unique=True, index=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<CompanyKey(company={self.company_name}, aid={self.company_aid[:8]}...)>"

class DeliveryLog(Base):
    __tablename__ = "delivery_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    context_card_id = Column(String, nullable=False, index=True)
    company_aid = Column(String, nullable=False, index=True)
    
    # Delivery details
    delivery_method = Column(String, nullable=False)  # "webhook", "api", "manual"
    delivery_status = Column(String, default="pending")  # "pending", "delivered", "failed"
    delivery_url = Column(String, nullable=True)
    
    # Response info
    response_status = Column(String, nullable=True)
    response_body = Column(Text, nullable=True)
    error_message = Column(String, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<DeliveryLog(card={self.context_card_id[:8]}..., status={self.delivery_status})>"

logger.info("✅ Database SQLAlchemy models loaded")