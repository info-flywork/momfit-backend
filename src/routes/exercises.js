const express = require('express');
const { query } = require('../config/db');
const { verifyIdToken } = require('../middleware/firebaseAuth');
const { cdnUrl } = require('../lib/cdn');

const router = express.Router();

function mapExercise(row, bookmarked = false) {
  const supportsVideo = row.supports_video === 1 || row.supports_video === true;
  const videoPath = row.video_path || null;
  return {
    id: row.id,
    categoryId: row.category_id,
    titleKey: row.title_key,
    descriptionKey: row.description_key,
    imageUrl: cdnUrl(row.image_path),
    videoPath,
    videoUrl: supportsVideo && videoPath ? cdnUrl(videoPath) : null,
    supportsVideo,
    durationMinutes: row.duration_minutes,
    calories: row.calories,
    intensityPercent: row.intensity_percent,
    sortOrder: row.sort_order,
    isBookmarked: bookmarked,
  };
}

const exerciseSelect = `
  SELECT e.*, c.supports_video, c.cdn_folder
  FROM exercises e
  INNER JOIN exercise_categories c ON c.id = e.category_id
`;

router.get('/categories', async (_req, res) => {
  const rows = await query(
    `SELECT c.*, COUNT(e.id) AS exercise_count
     FROM exercise_categories c
     LEFT JOIN exercises e ON e.category_id = c.id AND e.is_active = 1
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.sort_order ASC`,
  );

  res.json({
    categories: rows.map((row) => ({
      id: row.id,
      iconPath: row.icon_path,
      iconUrl: cdnUrl(row.icon_path),
      titleKey: row.title_key,
      subtitleKey: row.subtitle_key,
      cdnFolder: row.cdn_folder,
      supportsVideo: row.supports_video === 1,
      sortOrder: row.sort_order,
      exerciseCount: row.exercise_count,
    })),
  });
});

router.get('/categories/:categoryId', async (req, res) => {
  const { categoryId } = req.params;

  const categoryRows = await query(
    'SELECT * FROM exercise_categories WHERE id = ? AND is_active = 1 LIMIT 1',
    [categoryId],
  );
  if (!categoryRows.length) {
    return res.status(404).json({ error: 'category_not_found' });
  }

  const exerciseRows = await query(
    `${exerciseSelect}
     WHERE e.category_id = ? AND e.is_active = 1
     ORDER BY e.sort_order ASC`,
    [categoryId],
  );

  res.json({
    category: {
      id: categoryRows[0].id,
      iconUrl: cdnUrl(categoryRows[0].icon_path),
      titleKey: categoryRows[0].title_key,
      subtitleKey: categoryRows[0].subtitle_key,
      cdnFolder: categoryRows[0].cdn_folder,
      supportsVideo: categoryRows[0].supports_video === 1,
    },
    exercises: exerciseRows.map((row) => mapExercise(row)),
  });
});

router.get('/me/bookmarks', verifyIdToken, async (req, res) => {
  const userId = req.firebaseUser.uid;
  const rows = await query(
    `${exerciseSelect}
     INNER JOIN user_exercise_bookmarks b ON b.exercise_id = e.id
     WHERE b.user_id = ? AND e.is_active = 1
     ORDER BY b.created_at DESC`,
    [userId],
  );

  res.json({ exercises: rows.map((row) => mapExercise(row, true)) });
});

router.get('/', async (req, res) => {
  const { categoryId } = req.query;
  const params = [];
  let sql = `${exerciseSelect} WHERE e.is_active = 1`;

  if (categoryId) {
    sql += ' AND e.category_id = ?';
    params.push(categoryId);
  }

  sql += ' ORDER BY e.category_id ASC, e.sort_order ASC';

  const rows = await query(sql, params);
  res.json({ exercises: rows.map((row) => mapExercise(row)) });
});

router.get('/:exerciseId', async (req, res) => {
  const rows = await query(
    `${exerciseSelect} WHERE e.id = ? AND e.is_active = 1 LIMIT 1`,
    [req.params.exerciseId],
  );
  if (!rows.length) {
    return res.status(404).json({ error: 'exercise_not_found' });
  }
  res.json({ exercise: mapExercise(rows[0]) });
});

router.post('/:exerciseId/bookmark', verifyIdToken, async (req, res) => {
  const userId = req.firebaseUser.uid;
  const { exerciseId } = req.params;

  const exists = await query(
    'SELECT id FROM exercises WHERE id = ? AND is_active = 1 LIMIT 1',
    [exerciseId],
  );
  if (!exists.length) {
    return res.status(404).json({ error: 'exercise_not_found' });
  }

  const bookmarked = await query(
    'SELECT 1 FROM user_exercise_bookmarks WHERE user_id = ? AND exercise_id = ? LIMIT 1',
    [userId, exerciseId],
  );

  if (bookmarked.length) {
    await query(
      'DELETE FROM user_exercise_bookmarks WHERE user_id = ? AND exercise_id = ?',
      [userId, exerciseId],
    );
    return res.json({ exerciseId, isBookmarked: false });
  }

  await query(
    'INSERT INTO user_exercise_bookmarks (user_id, exercise_id) VALUES (?, ?)',
    [userId, exerciseId],
  );
  return res.json({ exerciseId, isBookmarked: true });
});

router.post('/:exerciseId/complete', verifyIdToken, async (req, res) => {
  const userId = req.firebaseUser.uid;
  const { exerciseId } = req.params;
  const { durationSeconds, caloriesBurned } = req.body;

  const exists = await query(
    'SELECT id, calories FROM exercises WHERE id = ? AND is_active = 1 LIMIT 1',
    [exerciseId],
  );
  if (!exists.length) {
    return res.status(404).json({ error: 'exercise_not_found' });
  }

  const sessionId = `${Date.now()}_${exerciseId}`;
  await query(
    `INSERT INTO user_exercise_sessions
      (id, user_id, exercise_id, completed_at, duration_seconds, calories_burned)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
    [
      sessionId,
      userId,
      exerciseId,
      durationSeconds ?? null,
      caloriesBurned ?? exists[0].calories,
    ],
  );

  res.status(201).json({ sessionId, exerciseId, completed: true });
});

module.exports = router;
