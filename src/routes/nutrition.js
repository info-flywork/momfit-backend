const express = require('express');
const { verifyUser } = require('../middleware/userAuth');
const { ensureUserRecord } = require('../middleware/ensureUser');
const {
  generateAndSavePlan,
  fetchLatestPlan,
  fetchPlanForDate,
  scheduleSingleNutritionMeal,
} = require('../services/nutritionService');

const router = express.Router();

router.use(verifyUser);
router.use(ensureUserRecord);

router.get('/plan', async (req, res) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const plan = date
      ? await fetchPlanForDate(req.userId, date)
      : await fetchLatestPlan(req.userId);
    res.json({ plan });
  } catch (err) {
    console.error('[nutrition/plan/get]', err);
    res.status(500).json({ error: 'nutrition_plan_fetch_failed', message: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const questionnaire = {
      age: req.body?.age,
      pregnancyWeek: req.body?.pregnancyWeek ?? req.body?.week,
      pregnancyType: req.body?.pregnancyType,
      height: req.body?.height,
      weight: req.body?.weight,
      dietPreference: req.body?.dietPreference,
      sensitivities: req.body?.sensitivities || [],
      primaryGoal: req.body?.primaryGoal,
    };
    const date = typeof req.body?.date === 'string' ? req.body.date : undefined;
    const plan = await generateAndSavePlan(req.userId, questionnaire, date);
    res.json({ plan });
  } catch (err) {
    console.error('[nutrition/generate]', err);
    res.status(500).json({ error: 'nutrition_generate_failed', message: err.message });
  }
});

router.post('/schedule', async (req, res) => {
  try {
    const activity = await scheduleSingleNutritionMeal(req.userId, {
      title: req.body?.title,
      mealType: req.body?.mealType ?? req.body?.meal_type,
      calories: req.body?.calories,
      protein: req.body?.protein ?? req.body?.macros?.protein,
      fat: req.body?.fat ?? req.body?.macros?.fat,
      carbs: req.body?.carbs ?? req.body?.macros?.carbs,
      imageUrl: req.body?.imageUrl ?? req.body?.image_url,
      scheduledAt: req.body?.scheduledAt ?? req.body?.scheduled_at,
    });
    res.json({ ok: true, activity });
  } catch (err) {
    console.error('[nutrition/schedule]', err);
    const status = err.status || 500;
    res.status(status).json({
      error: 'nutrition_schedule_failed',
      message: err.message,
    });
  }
});

module.exports = router;
