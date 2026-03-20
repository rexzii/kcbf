-- Create Database
CREATE DATABASE IF NOT EXISTS kcbf_db;
USE kcbf_db;

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  state VARCHAR(100) NOT NULL,
  ekda_type VARCHAR(50),
  email VARCHAR(255) UNIQUE NOT NULL,
  whatsapp_number VARCHAR(15) NOT NULL,
  date_of_birth DATE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  brief_profile LONGTEXT NOT NULL,
  working_since YEAR NOT NULL,
  areas_of_interest VARCHAR(255) NOT NULL,
  linkedin_profile VARCHAR(500),
  website VARCHAR(500),
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Session/Activity Logs Table (Optional - for tracking user activities)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  activity_type VARCHAR(100),
  activity_description LONGTEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Meeting Requests Table
CREATE TABLE IF NOT EXISTS meeting_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  recipient_id INT NOT NULL,
  preferred_date DATETIME NOT NULL,
  remarks LONGTEXT,
  status ENUM('pending', 'scheduled', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_requester_id (requester_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_preferred_date (preferred_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  referrer_name VARCHAR(255) NOT NULL,
  referrer_contact VARCHAR(255) NOT NULL,
  referral_type ENUM('inside', 'outside') DEFAULT 'inside',
  remarks LONGTEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sender_id (sender_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Recommendation Requests Table
CREATE TABLE IF NOT EXISTS recommendation_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  recipient_id INT NOT NULL,
  remarks LONGTEXT NOT NULL,
  contact_info VARCHAR(255),
  referral_details LONGTEXT,
  status ENUM('pending', 'sent') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_requester_id (requester_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Done Business Table
CREATE TABLE IF NOT EXISTS done_business (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_name VARCHAR(255) NOT NULL,
  amount_closed DECIMAL(15,2) NOT NULL,
  remarks LONGTEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_member_name (member_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
