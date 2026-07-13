-- Beslenme planı + öğünler
CREATE TABLE IF NOT EXISTS user_nutrition_plans (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  plan_date DATE NOT NULL,
  daily_calories INT NOT NULL DEFAULT 0,
  water_liters DECIMAL(4,2) NOT NULL DEFAULT 2.50,
  protein_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  fat_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_nutrition_plan_user_date (user_id, plan_date),
  CONSTRAINT fk_nutrition_plans_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_nutrition_meals (
  id VARCHAR(64) PRIMARY KEY,
  plan_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  meal_type VARCHAR(64) NOT NULL,
  calories INT NOT NULL DEFAULT 0,
  protein_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  fat_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(6,1) NOT NULL DEFAULT 0,
  image_url TEXT NULL,
  ingredients_json LONGTEXT NULL,
  instructions_json LONGTEXT NULL,
  nutrients_json LONGTEXT NULL,
  cooking_minutes INT NOT NULL DEFAULT 20,
  sort_order INT NOT NULL DEFAULT 0,
  scheduled_activity_id VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_nutrition_meals_plan
    FOREIGN KEY (plan_id) REFERENCES user_nutrition_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
