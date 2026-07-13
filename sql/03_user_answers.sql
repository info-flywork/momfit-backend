CREATE TABLE IF NOT EXISTS user_onboarding_answers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  flow ENUM('main', 'nutrition', 'ai_plan', 'profile') NOT NULL,
  question_key VARCHAR(64) NOT NULL,
  answer_value TEXT NOT NULL,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_flow_question (user_id, flow, question_key),
  INDEX idx_user_answers_user (user_id),
  CONSTRAINT fk_user_answers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
