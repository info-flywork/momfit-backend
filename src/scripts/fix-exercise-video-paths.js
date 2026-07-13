/**
 * CDN'de olmayan video_path değerlerini temizler (meditation_restful_sleep vb.).
 * Kullanım: node src/scripts/fix-exercise-video-paths.js
 */
const { query, pool } = require('../config/db');
const { VIDEO_FILES, VIDEO_CDN_FOLDERS, videoPathForExercise } = require('../data/exercise_video_map');

async function main() {
  const rows = await query('SELECT id, category_id, video_path FROM exercises');

  let updated = 0;
  for (const row of rows) {
    const expected = videoPathForExercise(row.id, row.category_id);
    if (expected === row.video_path) continue;

    await query('UPDATE exercises SET video_path = ? WHERE id = ?', [
      expected,
      row.id,
    ]);
    console.log(`${row.id}: ${row.video_path || 'NULL'} → ${expected || 'NULL'}`);
    updated += 1;
  }

  console.log(`\nGüncellenen: ${updated}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
