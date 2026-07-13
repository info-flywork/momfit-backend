CREATE TABLE IF NOT EXISTS account_deletion_feedback (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  auth_type ENUM('firebase', 'guest') NOT NULL,
  email VARCHAR(255) NULL,
  display_name VARCHAR(255) NULL,
  reason_key VARCHAR(128) NULL,
  reason_text TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_feedback_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
