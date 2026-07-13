-- Mevcut kurulumlar icin CDN alanlari (yeniden calistirmaya guvenli).
-- MariaDB: ADD COLUMN IF NOT EXISTS

ALTER TABLE exercise_categories
  ADD COLUMN IF NOT EXISTS cdn_folder VARCHAR(128) NULL COMMENT 'Orn: exercies/cardio' AFTER subtitle_key;

ALTER TABLE exercise_categories
  ADD COLUMN IF NOT EXISTS supports_video TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = sadece gorsel' AFTER sort_order;

UPDATE exercise_categories SET cdn_folder = 'exercies/cardio',     supports_video = 1 WHERE id = 'cardio' AND (cdn_folder IS NULL OR cdn_folder = '');
UPDATE exercise_categories SET cdn_folder = 'exercies/breath',     supports_video = 0 WHERE id = 'breath' AND (cdn_folder IS NULL OR cdn_folder = '');
UPDATE exercise_categories SET cdn_folder = 'exercies/pilates',    supports_video = 1 WHERE id = 'pilates' AND (cdn_folder IS NULL OR cdn_folder = '');
UPDATE exercise_categories SET cdn_folder = 'exercies/meditation', supports_video = 1 WHERE id = 'meditation' AND (cdn_folder IS NULL OR cdn_folder = '');
UPDATE exercise_categories SET cdn_folder = 'exercies/yoga',       supports_video = 1 WHERE id = 'yoga' AND (cdn_folder IS NULL OR cdn_folder = '');

ALTER TABLE exercise_categories
  MODIFY COLUMN cdn_folder VARCHAR(128) NOT NULL;

UPDATE exercises SET video_path = NULL WHERE category_id = 'breath';
