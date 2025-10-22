-- Appointment Chatbot System Database Schema
-- PostgreSQL Database Setup

-- Create database (run this separately)
-- CREATE DATABASE appointment_chatbot;

-- Connect to the database and run the following:

-- Users table for authentication and user profiles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table for scheduling data
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    appointment_type VARCHAR(50) DEFAULT 'general',
    location VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat sessions table for conversation logs
CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
);

-- Chat messages table for individual messages
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user', 'bot', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_user_date ON appointments(user_id, appointment_date);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_token ON chat_sessions(session_token);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_expires ON chat_sessions(expires_at);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- Sample data insertions
INSERT INTO users (email, password_hash, first_name, last_name, phone, role) VALUES
('admin@example.com', '$2b$10$example_hash', 'Admin', 'User', '+1234567890', 'admin'),
('john.doe@example.com', '$2b$10$example_hash', 'John', 'Doe', '+1234567891', 'user'),
('jane.smith@example.com', '$2b$10$example_hash', 'Jane', 'Smith', '+1234567892', 'user');

INSERT INTO appointments (user_id, title, description, appointment_date, duration_minutes, status, appointment_type, location) VALUES
(2, 'Annual Checkup', 'Regular annual health checkup', '2024-02-15 10:00:00+00', 60, 'confirmed', 'medical', 'Main Clinic'),
(3, 'Consultation', 'Initial consultation meeting', '2024-02-16 14:30:00+00', 45, 'pending', 'consultation', 'Office Building A');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View for active chat sessions with user info
CREATE VIEW active_chat_sessions AS
SELECT 
    cs.id,
    cs.session_token,
    cs.status,
    cs.created_at,
    cs.expires_at,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(cm.id) as message_count
FROM chat_sessions cs
JOIN users u ON cs.user_id = u.id
LEFT JOIN chat_messages cm ON cs.id = cm.session_id
WHERE cs.status = 'active' AND cs.expires_at > CURRENT_TIMESTAMP
GROUP BY cs.id, cs.session_token, cs.status, cs.created_at, cs.expires_at, u.email, u.first_name, u.last_name;

-- View for appointment summary
CREATE VIEW appointment_summary AS
SELECT 
    a.id,
    a.title,
    a.appointment_date,
    a.duration_minutes,
    a.status,
    a.appointment_type,
    u.first_name,
    u.last_name,
    u.email,
    u.phone
FROM appointments a
JOIN users u ON a.user_id = u.id
ORDER BY a.appointment_date DESC;
