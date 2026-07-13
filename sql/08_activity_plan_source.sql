-- AI vs manuel program ayrımı
ALTER TABLE user_scheduled_activities
  ADD COLUMN plan_source ENUM('ai', 'manual') NOT NULL DEFAULT 'manual'
  AFTER activity_type;

UPDATE user_scheduled_activities
SET plan_source = 'ai'
WHERE id LIKE 'plan_%';

UPDATE user_scheduled_activities
SET plan_source = 'manual'
WHERE id LIKE 'act_%';
