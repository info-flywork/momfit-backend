const express = require('express');
const { verifyUser } = require('../middleware/userAuth');
const { ensureUserRecord } = require('../middleware/ensureUser');
const { uploadToCdn } = require('../lib/cdn');
const {
  toDateKey,
  normalizeMeasurements,
  imageExtFromMime,
  photoPath,
  validateFullBodyPhoto,
  runBodyAnalysis,
  pickRecommendedExercises,
  displayMetrics,
  upsertWeeklyResult,
  ensureWeeklyResultsTable,
} = require('../services/weeklyResultService');
const { query } = require('../config/db');

const router = express.Router();

function parseJsonCol(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

router.use(verifyUser);
router.use(ensureUserRecord);

router.post('/save', async (req, res) => {
  try {
    const weekStart = toDateKey(req.body?.week_start);
    if (!weekStart) return res.status(400).json({ error: 'invalid_week_start' });

    const measurements = normalizeMeasurements(req.body?.measurements);
    if (!Object.keys(measurements).length) {
      return res.status(400).json({ error: 'measurements_required' });
    }

    await upsertWeeklyResult({
      userId: req.userId,
      weekStart,
      measurements,
      analysisMetrics: {},
      assessments: [],
      recommendedExercises: [],
    });
    return res.json({ saved: true });
  } catch (err) {
    console.error('[weekly-results/save]', err);
    return res.status(500).json({ error: 'weekly_result_save_failed', message: err.message });
  }
});

router.post('/analyze', async (req, res) => {
  try {
    const weekStart = toDateKey(req.body?.week_start);
    if (!weekStart) return res.status(400).json({ error: 'invalid_week_start' });

    const measurements = normalizeMeasurements(req.body?.measurements || {});

    const fileBase64 = req.body?.photo_base64;
    const mimeType = typeof req.body?.mime_type === 'string' ? req.body.mime_type : 'image/jpeg';
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ error: 'photo_required' });
    }

    const validPhoto = await validateFullBodyPhoto({ base64: fileBase64, mimeType });
    if (!validPhoto.ok) {
      return res.status(400).json({
        error: 'invalid_full_body_photo',
        message: 'Lütfen insanın tam boy göründüğü uygun bir foto ekleyin.',
      });
    }

    const buffer = Buffer.from(fileBase64, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'invalid_photo' });

    const ext = imageExtFromMime(mimeType);
    const path = photoPath(req.userId, weekStart, ext);
    const photoUrl = await uploadToCdn(path, buffer, mimeType);

    const analysis = await runBodyAnalysis(measurements, fileBase64, mimeType);
    const finalMeasurements = analysis.measurements || measurements;
    const recommended = await pickRecommendedExercises(analysis.categories);
    const metrics = displayMetrics(finalMeasurements, analysis.metricDirections);

    const exercises = recommended.map((e) => ({
      id: e.id,
      categoryId: e.category_id,
      titleKey: e.title_key,
      descriptionKey: e.description_key,
      durationMinutes: e.duration_minutes,
      calories: e.calories,
      intensityPercent: e.intensity_percent,
    }));

    await upsertWeeklyResult({
      userId: req.userId,
      weekStart,
      photoUrl,
      measurements: finalMeasurements,
      analysisMetrics: metrics,
      assessments: analysis.assessments,
      recommendedExercises: exercises,
    });

    return res.json({
      saved: true,
      result: {
        weekStart,
        photoUrl,
        measurements: finalMeasurements,
        metrics,
        assessments: analysis.assessments,
        exercises,
      },
    });
  } catch (err) {
    console.error('[weekly-results/analyze]', err);
    return res.status(500).json({ error: 'weekly_result_analyze_failed', message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    await ensureWeeklyResultsTable();
    const weekStart = toDateKey(req.query?.week_start);
    if (!weekStart) {
      return res.status(400).json({ error: 'invalid_week_start' });
    }

    const rows = await query(
      `SELECT week_start, photo_url, measurements_json, analysis_metrics_json, assessments_json, recommended_exercises_json
       FROM weekly_results
       WHERE user_id = ? AND week_start = ?
       LIMIT 1`,
      [req.userId, weekStart],
    );
    if (!rows[0]) return res.json({ result: null });

    const row = rows[0];
    return res.json({
      result: {
        weekStart: toDateKey(row.week_start?.toISOString?.() || row.week_start),
        photoUrl: row.photo_url || null,
        measurements: parseJsonCol(row.measurements_json, {}),
        metrics: parseJsonCol(row.analysis_metrics_json, {}),
        assessments: parseJsonCol(row.assessments_json, []),
        exercises: parseJsonCol(row.recommended_exercises_json, []),
      },
    });
  } catch (err) {
    console.error('[weekly-results/get-by-week]', err);
    return res.status(500).json({ error: 'weekly_result_fetch_failed', message: err.message });
  }
});

router.get('/latest', async (req, res) => {
  try {
    await ensureWeeklyResultsTable();
    const rows = await query(
      `SELECT week_start, photo_url, measurements_json, analysis_metrics_json, assessments_json, recommended_exercises_json
       FROM weekly_results
       WHERE user_id = ?
       ORDER BY week_start DESC
       LIMIT 1`,
      [req.userId],
    );
    if (!rows[0]) return res.json({ result: null });

    const row = rows[0];
    return res.json({
      result: {
        weekStart: toDateKey(row.week_start?.toISOString?.() || row.week_start),
        photoUrl: row.photo_url || null,
        measurements: parseJsonCol(row.measurements_json, {}),
        metrics: parseJsonCol(row.analysis_metrics_json, {}),
        assessments: parseJsonCol(row.assessments_json, []),
        exercises: parseJsonCol(row.recommended_exercises_json, []),
      },
    });
  } catch (err) {
    console.error('[weekly-results/latest]', err);
    return res.status(500).json({ error: 'weekly_result_fetch_failed', message: err.message });
  }
});

module.exports = router;
