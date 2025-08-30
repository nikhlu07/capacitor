-- Travlr-ID PostgreSQL Schema
-- Business logic database (KERI data stored in LMDB)

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table (business metadata, AID stored in KERIA)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(100) NOT NULL,
    company_id UUID REFERENCES companies(id),
    aid VARCHAR(255), -- KERI AID from KERIA
    email VARCHAR(255),
    department VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, employee_id)
);

-- Credentials metadata (actual credentials in KERIA/LMDB)
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    credential_said VARCHAR(255) UNIQUE NOT NULL, -- KERI SAID
    credential_type VARCHAR(100) NOT NULL, -- 'master_card', 'context_card'
    schema_said VARCHAR(255), -- ACDC schema SAID
    status VARCHAR(50) DEFAULT 'active',
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB, -- Additional business metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Context cards (filtered credentials for companies)
CREATE TABLE context_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_credential_id UUID REFERENCES credentials(id),
    company_id UUID REFERENCES companies(id),
    employee_id UUID REFERENCES employees(id),
    credential_said VARCHAR(255) UNIQUE NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    fields_included TEXT[], -- Array of field names included
    expires_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Travel preferences (detailed data referenced by ACDC hash)
CREATE TABLE travel_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    preferences_hash VARCHAR(255) UNIQUE NOT NULL, -- Links to ACDC hash
    flight_preferences JSONB,
    hotel_preferences JSONB,
    accessibility_details JSONB,
    emergency_contact JSONB,
    dietary_requirements TEXT[],
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Encrypted ACDC blobs (optional hybrid storage)
CREATE TABLE acdc_blobs (
    said VARCHAR(255) PRIMARY KEY, -- SAID of ACDC (content-addressed id)
    issuer_aid VARCHAR(255) NOT NULL,
    holder_aid VARCHAR(255) NOT NULL,
    schema_said VARCHAR(255),
    digest_algo VARCHAR(32) DEFAULT 'blake3',
    digest VARCHAR(255) NOT NULL, -- hex or base64 digest of canonical ACDC
    size_bytes INTEGER,
    enc_blob BYTEA NOT NULL, -- encrypted ACDC payload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consent records
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    company_id UUID REFERENCES companies(id),
    context_card_id UUID REFERENCES context_cards(id),
    consent_type VARCHAR(100) NOT NULL, -- 'granted', 'revoked'
    fields_consented TEXT[], -- Array of field names
    purpose VARCHAR(255),
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL, -- 'credential', 'consent', 'access'
    entity_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'created', 'accessed', 'revoked'
    actor_type VARCHAR(100), -- 'employee', 'company', 'system'
    actor_id UUID,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company access logs
CREATE TABLE access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    employee_id UUID REFERENCES employees(id),
    context_card_id UUID REFERENCES context_cards(id),
    access_type VARCHAR(100) NOT NULL, -- 'read', 'verify'
    endpoint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    response_status INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (for web interface if needed)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_key VARCHAR(255) UNIQUE NOT NULL,
    employee_id UUID REFERENCES employees(id),
    company_id UUID REFERENCES companies(id),
    data JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_employees_aid ON employees(aid);
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_credentials_employee_id ON credentials(employee_id);
CREATE INDEX idx_credentials_said ON credentials(credential_said);
CREATE INDEX idx_context_cards_company_id ON context_cards(company_id);
CREATE INDEX idx_context_cards_employee_id ON context_cards(employee_id);
CREATE INDEX idx_consent_records_employee_id ON consent_records(employee_id);
CREATE INDEX idx_consent_records_company_id ON consent_records(company_id);
CREATE INDEX idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_travel_preferences_employee_id ON travel_preferences(employee_id);
CREATE INDEX idx_travel_preferences_hash ON travel_preferences(preferences_hash);
CREATE INDEX idx_acdc_blobs_holder_aid ON acdc_blobs(holder_aid);
CREATE INDEX idx_acdc_blobs_issuer_schema ON acdc_blobs(issuer_aid, schema_said);
CREATE INDEX idx_access_logs_company_id ON access_logs(company_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_travel_preferences_updated_at BEFORE UPDATE ON travel_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
