-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS careerpilot_db;
USE careerpilot_db;

-- 1. USERS TABLE
-- This matches all the fields from your register.html form
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    degree VARCHAR(100),
    cgpa DECIMAL(3,2),
    skills TEXT,
    current_role VARCHAR(50),
    target_role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. INTERVIEWS TABLE
-- This tracks the data for the Dashboard (Scores, Status, etc.)
CREATE TABLE mock_interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    score INT NOT NULL,                  -- Used by your 1-10 scoring system
    score_percentage INT GENERATED ALWAYS AS (score * 10) STORED, -- Auto-calculates % for your dashboard circle widget!
    status VARCHAR(20) DEFAULT 'Needs Review',
    feedback TEXT NOT NULL,
    date_taken TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. STUDY PLAN TABLE
-- For your future AI Study Plan Generator
CREATE TABLE IF NOT EXISTS study_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    skill_gap VARCHAR(100) NOT NULL, -- e.g., "Advanced SQL"
    completed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE mock_interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_email VARCHAR(255),
    topic VARCHAR(255),
    score INT,
    feedback TEXT,
    date_taken TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);