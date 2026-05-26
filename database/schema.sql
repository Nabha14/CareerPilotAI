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
CREATE TABLE IF NOT EXISTS mock_interviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    topic VARCHAR(100) NOT NULL, -- e.g., "Core Java & OOPs"
    status VARCHAR(20) DEFAULT 'Review', -- 'Passed' or 'Needs Review'
    score_percentage INT,
    interview_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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