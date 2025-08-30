-- Sample data for development and testing

-- Insert sample companies
INSERT INTO companies (id, name, domain, api_key, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Scania AB', 'scania.com', 'scania_api_key_dev_123', 'active'),
('550e8400-e29b-41d4-a716-446655440002', 'Volvo Group', 'volvo.com', 'volvo_api_key_dev_456', 'active'),
('550e8400-e29b-41d4-a716-446655440003', 'IKEA', 'ikea.com', 'ikea_api_key_dev_789', 'active');

-- Insert sample employees
INSERT INTO employees (id, employee_id, company_id, email, department, status) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'SE12345', '550e8400-e29b-41d4-a716-446655440001', 'john.doe@scania.com', 'Engineering', 'active'),
('660e8400-e29b-41d4-a716-446655440002', 'SE12346', '550e8400-e29b-41d4-a716-446655440001', 'jane.smith@scania.com', 'Sales', 'active'),
('660e8400-e29b-41d4-a716-446655440003', 'VG98765', '550e8400-e29b-41d4-a716-446655440002', 'erik.larsson@volvo.com', 'Operations', 'active'),
('660e8400-e29b-41d4-a716-446655440004', 'IK55555', '550e8400-e29b-41d4-a716-446655440003', 'anna.andersson@ikea.com', 'Design', 'active');

-- Note: AIDs and credential SAIDs will be populated by the application when KERIA creates them
-- This is just the business metadata, actual KERI data lives in KERIA/LMDB
