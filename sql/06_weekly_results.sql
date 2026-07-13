CREATE TABLE IF NOT EXISTS weekly_results (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  week_start DATE NOT NULL,
  photo_url TEXT NULL,
  measurements_json LONGTEXT NOT NULL,
  analysis_metrics_json LONGTEXT NULL,
  assessments_json LONGTEXT NULL,
  recommended_exercises_json LONGTEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_weekly_results_user_week (user_id, week_start),
  CONSTRAINT fk_weekly_results_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
