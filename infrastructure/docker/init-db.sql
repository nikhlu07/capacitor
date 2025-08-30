-- Travlr-ID Business Database Schema
-- NOTE: KERI data (AIDs, credentials) are stored in KERIA, NOT here

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Business data schema
CREATE SCHEMA IF NOT EXISTS travlr;
SET search_path TO travlr;

-- Enums
CREATE TYPE consent_status AS ENUM ('pending', 'granted', 'denied', 'revoked');
CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'suspended');

-- Employees - MINIMAL business info only
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(100) UNIQUE NOT NULL,
    company VARCHAR(100) NOT NULL DEFAULT 'scania',
    department VARCHAR(100),
    email VARCHAR(255),
    
    -- KERI reference (AID stored in KERIA, we just reference it)
    keri_aid VARCHAR(200) UNIQUE,
    
    -- Business status
    status employee_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Consent requests - Workflow tracking only
CREATE TABLE consent_requests (
    id SERIAL PRIMARY KEY,
    request_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    
    -- Who's asking
    requester_aid VARCHAR(200) NOT NULL,
    requester_name VARCHAR(200) NOT NULL,
    requester_company VARCHAR(100),
    
    -- Who's being asked
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- What's being requested
    requested_data JSONB NOT NULL, -- e.g., {"name": true, "department": true}
    purpose TEXT NOT NULL,
    duration_days INTEGER DEFAULT 30,
    
    -- Status
    status consent_status DEFAULT 'pending',
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for compliance
CREATE TABLE audit_events (
    id SERIAL PRIMARY KEY,
    event_id UUID DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL, -- 'consent_granted', 'credential_issued', etc.
    
    -- Actors
    actor_aid VARCHAR(200),
    employee_id INTEGER REFERENCES employees(id),
    
    -- Context
    consent_request_id INTEGER REFERENCES consent_requests(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- KERI witness configuration - Our witness network
CREATE TABLE witness_config (
    id SERIAL PRIMARY KEY,
    witness_name VARCHAR(100) NOT NULL,
    witness_url VARCHAR(500) NOT NULL,
    witness_aid VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions - For web/mobile app
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID DEFAULT uuid_generate_v4() UNIQUE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Session data
    token_hash VARCHAR(256) NOT NULL,
    device_info JSONB,
    ip_address INET,
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_keri_aid ON employees(keri_aid);
CREATE INDEX idx_employees_status ON employees(status);

CREATE INDEX idx_consent_requests_employee ON consent_requests(employee_id);
CREATE INDEX idx_consent_requests_status ON consent_requests(status);
CREATE INDEX idx_consent_requests_requester ON consent_requests(requester_aid);

CREATE INDEX idx_audit_events_timestamp ON audit_events(created_at);
CREATE INDEX idx_audit_events_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_employee ON audit_events(employee_id);

CREATE INDEX idx_sessions_employee ON user_sessions(employee_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active, expires_at);

-- Insert our witness network configuration
INSERT INTO witness_config (witness_name, witness_url) VALUES
('travlr-witness1', 'http://witness1:5632'),
('travlr-witness2', 'http://witness2:5633'),
('travlr-witness3', 'http://witness3:5634');

-- Sample employee data
INSERT INTO employees (employee_id, company, department, email) VALUES
('EMP001', 'scania', 'IT', 'john.doe@scania.com'),
('EMP002', 'scania', 'HR', 'jane.smith@scania.com');

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA travlr TO travlr;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA travlr TO travlr;