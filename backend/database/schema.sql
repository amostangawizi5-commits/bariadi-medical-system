-- Database Schema for Medical Certificate System

-- Users table (Only Admin/Doctor)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    profile_image TEXT,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employers table
CREATE TABLE IF NOT EXISTS employers (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    registration_number VARCHAR(50),
    address TEXT,
    contact_person VARCHAR(100),
    contact_phone VARCHAR(15),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employer_id INTEGER REFERENCES employers(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    position VARCHAR(50) NOT NULL,
    department VARCHAR(50),
    exam_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    health_status TEXT,
    blood_pressure VARCHAR(20),
    blood_sugar VARCHAR(20),
    vision VARCHAR(20),
    heart_condition VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 25000,
    payment_method VARCHAR(20) DEFAULT 'cash',
    receipt_number VARCHAR(50),
    receipt_file_url TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(100),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending'
);

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS receipt_file_url TEXT;

-- SMS Logs table
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    phone VARCHAR(15) NOT NULL,
    message TEXT NOT NULL,
    sent_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'sent'
);

-- Notification Flags table
CREATE TABLE IF NOT EXISTS notification_flags (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    flag_30_days BOOLEAN DEFAULT FALSE,
    flag_14_days BOOLEAN DEFAULT FALSE,
    flag_7_days BOOLEAN DEFAULT FALSE,
    flag_expired BOOLEAN DEFAULT FALSE,
    flag_overdue BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- System Settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin user (password: Admin@2026)
INSERT INTO users (username, email, password_hash, full_name, phone, role)
SELECT 'admin', 'admin@afya.bariadi.go.tz', 'Admin@2026', 'Dkt. Juma Hassan', '0713123456', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
    ('sms_30_days', 'true', 'Send SMS 30 days before expiry'),
    ('sms_14_days', 'true', 'Send SMS 14 days before expiry'),
    ('sms_7_days', 'true', 'Send SMS 7 days before expiry'),
    ('sms_expired', 'true', 'Send SMS on expiry day'),
    ('sms_overdue', 'true', 'Send SMS 7 days after expiry'),
    ('certificate_validity', '6', 'Certificate validity in months')
ON CONFLICT (setting_key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_expiry ON employees(expiry_date);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_employer ON employees(employer_id);
CREATE INDEX IF NOT EXISTS idx_payments_employee ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_employee ON sms_logs(employee_id);
