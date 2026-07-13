-- Egzersiz kategorileri ve egzersizler
-- CDN yapısı: https://momfit.b-cdn.net/exercies/{kategori}/{dosya}
-- NOT: Klasör adı projede bilinçli olarak "exercies" yazılır (typo değil, CDN ile aynı).
-- NOT: breath (nefes) kategorisinde video yok — yalnızca görsel kullanılır.

CREATE TABLE IF NOT EXISTS exercise_categories (
  id VARCHAR(32) PRIMARY KEY,
  icon_path VARCHAR(512) NOT NULL,
  title_key VARCHAR(128) NOT NULL,
  subtitle_key VARCHAR(128) NOT NULL,
  cdn_folder VARCHAR(128) NOT NULL COMMENT 'Orn: exercies/cardio',
  sort_order INT NOT NULL DEFAULT 0,
  supports_video TINYINT(1) NOT NULL DEFAULT 1 COMMENT '0 = sadece gorsel, 1 = video destekli',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exercises (
  id VARCHAR(64) PRIMARY KEY,
  category_id VARCHAR(32) NOT NULL,
  title_key VARCHAR(128) NOT NULL,
  description_key VARCHAR(128) NOT NULL,
  image_path VARCHAR(512) NOT NULL COMMENT 'CDN goreli yol: exercies/cardio/dumbell.jpg',
  video_path VARCHAR(512) NULL COMMENT 'NULL = video yok, breath kategorisinde her zaman NULL',
  duration_minutes INT NOT NULL DEFAULT 10,
  calories INT NOT NULL DEFAULT 0,
  intensity_percent TINYINT UNSIGNED NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_exercises_category_sort (category_id, sort_order),
  CONSTRAINT fk_exercises_category
    FOREIGN KEY (category_id) REFERENCES exercise_categories(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_exercise_bookmarks (
  user_id VARCHAR(128) NOT NULL,
  exercise_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, exercise_id),
  CONSTRAINT fk_bookmarks_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookmarks_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_exercise_sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  exercise_id VARCHAR(64) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  duration_seconds INT UNSIGNED NULL,
  calories_burned INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user_completed (user_id, completed_at DESC),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sessions_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_scheduled_activities (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  exercise_id VARCHAR(64) NULL,
  title VARCHAR(255) NOT NULL,
  activity_type ENUM('exercise', 'meditation', 'nutrition', 'water', 'breathing') NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scheduled_user_time (user_id, scheduled_at ASC),
  CONSTRAINT fk_scheduled_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_scheduled_exercise
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
