const express = require('express');
const { verifyUser } = require('../middleware/userAuth');
const { ensureUserRecord } = require('../middleware/ensureUser');
const {
  generateDailyPlan,
  saveDailyPlan,
  fetchTodayWaterLiters,
  saveTodayWaterLiters,
  fetchTodayPlan,
  ensureTodayPlan,
  toggleActivityComplete,
  addScheduledActivity,
} = require('../services/aiPlanService');

const router = express.Router();

router.use(verifyUser);
router.use(ensureUserRecord);

router.post('/generate', async (req, res) => {
  try {
    const questionnaire = {
      feeling: req.body?.feeling,
      priority: req.body?.priority,
      complaints: req.body?.complaints || [],
      baby_movement: req.body?.babyMovement || req.body?.baby_movement,
      week: req.body?.week,
      day: req.body?.day,
    };

    const plan = await generateDailyPlan(req.userId, questionnaire);
    res.json({ plan });
  } catch (err) {
    console.error('[ai-plan/generate]', err);
    res.status(500).json({ error: 'plan_generation_failed', message: err.message });
  }
});

router.post('/save', async (req, res) => {
  try {
    const plan = req.body?.plan;
    if (!plan?.items?.length) {
      return res.status(400).json({ error: 'plan_required' });
    }
    const result = await saveDailyPlan(req.userId, plan);
    res.json(result);
  } catch (err) {
    console.error('[ai-plan/save]', err);
    res.status(500).json({ error: 'plan_save_failed', message: err.message });
  }
});

router.get('/today', async (req, res) => {
  try {
    const autoGenerate = req.query.autoGenerate !== 'false';
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const source =
      typeof req.query.source === 'string' ? req.query.source : 'manual';
    const plan = autoGenerate
      ? await ensureTodayPlan(req.userId, { forDate: date })
      : await fetchTodayPlan(req.userId, date, source);
    res.json({ plan });
  } catch (err) {
    console.error('[ai-plan/today]', err);
    res.status(500).json({ error: 'plan_fetch_failed', message: err.message });
  }
});

router.post('/activities', async (req, res) => {
  try {
    const exerciseId = req.body?.exercise_id || req.body?.exerciseId;
    const scheduledAt = req.body?.scheduled_at || req.body?.scheduledAt;
    const activity = await addScheduledActivity(req.userId, {
      exerciseId,
      scheduledAt,
    });
    res.json({ ok: true, activity });
  } catch (err) {
    console.error('[ai-plan/activities/add]', err);
    const status = err.status || 500;
    res.status(status).json({
      error: status === 404 ? 'exercise_not_found' : 'activity_add_failed',
      message: err.message,
    });
  }
});

router.patch('/activities/:id/complete', async (req, res) => {
  try {
    const completed = req.body?.completed !== false;
    const ok = await toggleActivityComplete(req.userId, req.params.id, completed);
    if (!ok) {
      return res.status(404).json({ error: 'activity_not_found' });
    }
    res.json({ ok: true, completed });
  } catch (err) {
    console.error('[ai-plan/complete]', err);
    res.status(500).json({ error: 'activity_update_failed', message: err.message });
  }
});

router.get('/water', async (req, res) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const liters = await fetchTodayWaterLiters(req.userId, date);
    res.json({ water_liters: liters });
  } catch (err) {
    console.error('[ai-plan/water/get]', err);
    res.status(500).json({ error: 'water_fetch_failed', message: err.message });
  }
});

router.put('/water', async (req, res) => {
  try {
    const date = typeof req.body?.date === 'string' ? req.body.date : undefined;
    const liters = await saveTodayWaterLiters(req.userId, req.body?.water_liters, date);
    res.json({ water_liters: liters });
  } catch (err) {
    console.error('[ai-plan/water/put]', err);
    res.status(500).json({ error: 'water_save_failed', message: err.message });
  }
});

module.exports = router;
