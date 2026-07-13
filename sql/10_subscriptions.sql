-- Premium / RevenueCat abonelik alanları (MariaDB: ADD COLUMN IF NOT EXISTS)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_premium TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium_product_id VARCHAR(255) NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium_period_type VARCHAR(32) NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium_expires_at DATETIME NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium_updated_at DATETIME NULL;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS revenuecat_webhook_events (
  event_id VARCHAR(128) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  app_user_id VARCHAR(255) NULL,
  payload JSON NOT NULL,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rc_events_user (app_user_id),
  INDEX idx_rc_events_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
