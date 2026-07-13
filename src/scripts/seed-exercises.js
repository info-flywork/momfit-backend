const { pool } = require('../config/db');
const { categories, exercises } = require('../data/exercise_seed');

async function seedExercises() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const category of categories) {
      await connection.query(
        `INSERT INTO exercise_categories
          (id, icon_path, title_key, subtitle_key, cdn_folder, sort_order, supports_video)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          icon_path = VALUES(icon_path),
          title_key = VALUES(title_key),
          subtitle_key = VALUES(subtitle_key),
          cdn_folder = VALUES(cdn_folder),
          sort_order = VALUES(sort_order),
          supports_video = VALUES(supports_video),
          updated_at = CURRENT_TIMESTAMP`,
        [
          category.id,
          category.icon_path,
          category.title_key,
          category.subtitle_key,
          category.cdn_folder,
          category.sort_order,
          category.supports_video,
        ],
      );
    }

    for (const exercise of exercises) {
      await connection.query(
        `INSERT INTO exercises
          (id, category_id, title_key, description_key, image_path, video_path,
           duration_minutes, calories, intensity_percent, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          category_id = VALUES(category_id),
          title_key = VALUES(title_key),
          description_key = VALUES(description_key),
          image_path = VALUES(image_path),
          video_path = COALESCE(video_path, VALUES(video_path)),
          duration_minutes = VALUES(duration_minutes),
          calories = VALUES(calories),
          intensity_percent = VALUES(intensity_percent),
          sort_order = VALUES(sort_order),
          updated_at = CURRENT_TIMESTAMP`,
        [
          exercise.id,
          exercise.category_id,
          exercise.title_key,
          exercise.description_key,
          exercise.image_path,
          exercise.video_path,
          exercise.duration_minutes,
          exercise.calories,
          exercise.intensity_percent,
          exercise.sort_order,
        ],
      );
    }

    await connection.commit();
    console.log(
      `Seed tamamlandı: ${categories.length} kategori, ${exercises.length} egzersiz.`,
    );
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
    await pool.end();
  }
}

seedExercises().catch((err) => {
  console.error('Seed hatası:', err.message);
  process.exit(1);
});
