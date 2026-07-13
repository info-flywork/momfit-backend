const { query } = require('../config/db');
const { openaiApiKey, openaiModel } = require('../config/env');
const { fetchUserContext, buildSystemPrompt } = require('./userContext');
const { cdnUrl } = require('../lib/cdn');

const CATEGORY_TAGS = {
  cardio: 'Kardiyo',
  breath: 'Nefes',
  pilates: 'Pilates',
  meditation: 'Meditasyon',
  yoga: 'Yoga',
};

let dailyMetricsTableReady = false;
let activitySourceReady = false;

async function ensureDailyMetricsTable() {
  if (dailyMetricsTableReady) return;
  await query(
    `CREATE TABLE IF NOT EXISTS user_daily_metrics (
      user_id VARCHAR(128) NOT NULL,
      metric_date DATE NOT NULL,
      water_liters DECIMAL(4,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, metric_date),
      CONSTRAINT fk_daily_metrics_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  );
  dailyMetricsTableReady = true;
}

async function ensureActivitySourceColumn() {
  if (activitySourceReady) return;
  try {
    await query(
      `ALTER TABLE user_scheduled_activities
       ADD COLUMN plan_source ENUM('ai', 'manual') NOT NULL DEFAULT 'manual'
       AFTER activity_type`,
    );
  } catch (err) {
    // Kolon zaten varsa (ER_DUP_FIELDNAME) devam et.
    if (err?.code !== 'ER_DUP_FIELDNAME' && !String(err?.message || '').includes('Duplicate column')) {
      // Bazı MySQL sürümlerinde farklı hata metni olabilir; yok sayılabilir kolon varlığı.
      const msg = String(err?.message || '');
      if (!msg.toLowerCase().includes('duplicate')) {
        console.warn('[ai-plan] plan_source alter:', msg);
      }
    }
  }

  try {
    await query(
      `UPDATE user_scheduled_activities
       SET plan_source = 'ai'
       WHERE id LIKE 'plan_%' AND plan_source <> 'ai'`,
    );
    await query(
      `UPDATE user_scheduled_activities
       SET plan_source = 'manual'
       WHERE id LIKE 'act_%' AND plan_source <> 'manual'`,
    );
  } catch (_) {
    // Sessiz: ilk kurulumda tablo boş olabilir.
  }

  activitySourceReady = true;
}

function normalizePlanSource(source) {
  return source === 'ai' ? 'ai' : 'manual';
}

function resolveDate(input) {
  if (!input) return new Date();
  const raw = typeof input === 'string' ? input : String(input);
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  const d = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function dayRange(dateInput) {
  const date = resolveDate(dateInput);
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { date, start, end };
}

async function loadExerciseCatalog() {
  const rows = await query(
    `SELECT e.id, e.category_id, e.title_key, e.description_key,
            e.image_path, e.duration_minutes, e.calories, e.intensity_percent
     FROM exercises e
     WHERE e.is_active = 1
     ORDER BY e.category_id, e.sort_order`,
  );
  return rows;
}

function compactCatalogForPrompt(exercises) {
  return exercises.map(
    (e) =>
      `${e.id}|${e.category_id}|${e.duration_minutes}dk|${e.calories}kcal|${e.title_key}`,
  );
}

function buildPlanPrompt(ctx, questionnaire, exercises) {
  const base = buildSystemPrompt(ctx);
  const catalog = compactCatalogForPrompt(exercises).join('\n');

  return `${base}

## Bugünkü anket cevapları
- His: ${questionnaire.feeling || 'belirtilmedi'}
- Öncelik: ${questionnaire.priority || 'belirtilmedi'}
- Şikayetler: ${(questionnaire.complaints || []).join(', ') || 'yok'}
- Bebek hareketi: ${questionnaire.baby_movement || 'belirtilmedi'}

## Görev
Hamile kullanıcı için BUGÜNÜN günlük programını oluştur.
Yalnızca aşağıdaki egzersiz ID'lerini kullan (exerciseId alanı).
5 ila 7 aktivite öner ve hepsi egzersiz olsun.
Saatler 08:00–21:00 arasında olsun.
Bel/ağrı varsa yoğun kardiyodan kaçın; yorgunsa nefes/meditasyon ağırlıklı plan yap.

## Egzersiz kataloğu (id|kategori|süre|kalori|title_key)
${catalog}

Yanıtı YALNIZCA şu JSON formatında ver:
{
  "summary": "1-2 cümle günlük plan özeti",
  "tip": "Kısa kişisel wellness ipucu",
  "items": [
    {
      "time": "09:00",
      "activityType": "exercise",
      "exerciseId": "yoga_standing_arm_open",
      "note": "Kısa açıklama"
    }
  ]
}

activityType: sadece exercise olmalı.
TÜM item'larda exerciseId zorunlu.`;
}

async function callOpenAiPlan(systemPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      messages: [
        {
          role: 'system',
          content:
            'Sen MomFit hamilelik program asistanısın. Yalnızca geçerli JSON döndür.',
        },
        { role: 'user', content: systemPrompt },
      ],
      temperature: 0.5,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI plan hatası: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI boş plan döndürdü');
  return JSON.parse(content);
}

function dateSeed(baseDate = new Date()) {
  return (
    baseDate.getFullYear() * 1000 +
    (baseDate.getMonth() + 1) * 100 +
    baseDate.getDate()
  );
}

function seededShuffle(arr, seed) {
  const copy = [...arr];
  let state = seed;
  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuestionnaireFromContext(ctx) {
  const a = ctx.answers || {};
  const complaints = Array.isArray(a.complaints)
    ? a.complaints
    : a.health_condition === 'backPain'
      ? ['back']
      : [];

  return {
    feeling: a.feeling || (a.daily_routine === 'sedentary' ? 'tired' : 'normal'),
    priority:
      a.priority ||
      (a.exercise_reason === 'energy'
        ? 'energy'
        : a.exercise_reason === 'sleep'
          ? 'rest'
          : 'balanced'),
    complaints,
    baby_movement: a.baby_movement || 'normal',
    week: a.pregnancy_week,
    day: a.pregnancy_day,
  };
}

function buildFallbackPlan(exercises, questionnaire, baseDate = new Date()) {
  const pool = [...exercises];
  const tired = ['tired', 'normal'].includes(questionnaire.feeling);
  const preferCalm = ['rest', 'pain'].includes(questionnaire.priority);
  const seed = dateSeed(baseDate);

  const score = (e) => {
    let s = 0;
    if (tired && (e.category_id === 'breath' || e.category_id === 'meditation')) {
      s += 3;
    }
    if (preferCalm && e.category_id !== 'cardio') s += 2;
    if (questionnaire.priority === 'energy' && e.category_id === 'cardio') s += 3;
    if (questionnaire.priority === 'light' && e.category_id === 'yoga') s += 2;
    if (questionnaire.complaints?.includes('back') && e.category_id === 'pilates') {
      s += 1;
    }
    return s;
  };

  pool.sort((a, b) => score(b) - score(a));
  const ranked = seededShuffle(pool, seed);
  const desiredCount = Math.min(6, Math.max(4, ranked.length));
  const offset = seed % Math.max(1, ranked.length);
  const rotated = [...ranked.slice(offset), ...ranked.slice(0, offset)];
  const picks = rotated.slice(0, desiredCount);

  return {
    summary: 'Bugün için dengeli ve güvenli bir hamilelik programı hazırladım.',
    tip: 'Egzersiz aralarında dinlenmeyi ve kontrollü tempoyu unutma.',
    items: picks.map((pick, index) => ({
      time: `${String(8 + index * 2).padStart(2, '0')}:00`,
      activityType: 'exercise',
      exerciseId: pick.id,
      note:
        index < 2
          ? 'Sabah aktivasyonu'
          : index < 4
            ? 'Öğleden sonra hareket'
            : 'Akşam rahatlatıcı hareket',
    })),
  };
}

function enrichPlanItems(rawItems, exerciseMap) {
  return rawItems
    .map((item, index) => {
      const type = item.activityType || 'exercise';
      const exercise = item.exerciseId ? exerciseMap.get(item.exerciseId) : null;

      if (type === 'exercise' && exercise) {
        return {
          id: `plan_${Date.now()}_${index}`,
          time: item.time || '09:00',
          activityType: 'exercise',
          exerciseId: exercise.id,
          title: item.note || exercise.title_key,
          note: item.note || null,
          durationMinutes: exercise.duration_minutes,
          calories: exercise.calories,
          intensityPercent: exercise.intensity_percent,
          imagePath: exercise.image_path,
          imageUrl: cdnUrl(exercise.image_path),
          categoryId: exercise.category_id,
          categoryTag: CATEGORY_TAGS[exercise.category_id] || exercise.category_id,
          titleKey: exercise.title_key,
          descriptionKey: exercise.description_key,
        };
      }

      return null;
    })
    .filter(Boolean);
}

function computeStats(items) {
  const calorieItems = items.filter(
    (i) => i.activityType === 'exercise' || i.activityType === 'nutrition',
  );
  const exerciseItems = items.filter((i) => i.activityType === 'exercise');
  const totalCalories = calorieItems.reduce((s, i) => s + (i.calories || 0), 0);
  const intensities = exerciseItems
    .map((i) => i.intensityPercent)
    .filter((v) => v != null);
  const avgIntensity = intensities.length
    ? intensities.reduce((a, b) => a + b, 0) / intensities.length
    : 40;
  const calmCount = items.filter((i) =>
    ['meditation', 'breathing', 'yoga'].includes(i.categoryId || i.activityType),
  ).length;

  return {
    totalCalories,
    relaxPercent: Math.min(98, Math.round(70 + calmCount * 8 + (100 - avgIntensity) * 0.15)),
    energyBoostPercent: Math.min(95, Math.round(50 + exerciseItems.length * 12)),
  };
}

async function generateDailyPlan(userId, questionnaire = {}) {
  const ctx = await fetchUserContext(userId);
  const exercises = await loadExerciseCatalog();
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

  let raw;
  if (openaiApiKey) {
    try {
      const prompt = buildPlanPrompt(ctx, questionnaire, exercises);
      raw = await callOpenAiPlan(prompt);
    } catch (err) {
      console.error('[ai-plan]', err.message);
      raw = buildFallbackPlan(exercises, questionnaire);
    }
  } else {
    raw = buildFallbackPlan(exercises, questionnaire);
  }

  const items = enrichPlanItems(raw.items || [], exerciseMap);
  const stats = computeStats(items);

  return {
    summary: raw.summary || 'Bugünün planı hazır.',
    tip: raw.tip || 'Kendini zorlamadan ilerle.',
    stats,
    items,
  };
}

function parseTimeOnDate(time, baseDate = new Date()) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h || 9, m || 0, 0, 0);
  return d;
}

async function saveDailyPlan(userId, plan, forDate = new Date()) {
  await ensureActivitySourceColumn();
  const { date, start, end } = dayRange(forDate);

  // Sadece AI planını yenile; manuel eklemeler aynı günde kalsın.
  await query(
    `DELETE FROM user_scheduled_activities
     WHERE user_id = ? AND scheduled_at >= ? AND scheduled_at < ? AND plan_source = 'ai'`,
    [userId, start, end],
  );

  for (const item of plan.items || []) {
    if (!item.exerciseId) continue;
    const scheduledAt = parseTimeOnDate(item.time, date);
    const activityId = item.id || `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO user_scheduled_activities
        (id, user_id, exercise_id, title, activity_type, plan_source, scheduled_at, is_completed)
       VALUES (?, ?, ?, ?, ?, 'ai', ?, 0)`,
      [
        activityId,
        userId,
        item.exerciseId || null,
        item.title,
        item.activityType || 'exercise',
        scheduledAt,
      ],
    );
  }

  return { saved: true, count: plan.items?.length || 0 };
}

async function fetchTodayWaterLiters(userId, forDate = new Date()) {
  await ensureDailyMetricsTable();
  const key = dateKey(resolveDate(forDate));

  const rows = await query(
    `SELECT water_liters
     FROM user_daily_metrics
     WHERE user_id = ? AND metric_date = ?
     LIMIT 1`,
    [userId, key],
  );
  const value = rows[0]?.water_liters;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function saveTodayWaterLiters(userId, liters, forDate = new Date()) {
  await ensureDailyMetricsTable();
  const key = dateKey(resolveDate(forDate));
  const clamped = Math.max(0, Math.min(10, Number(liters) || 0));

  await query(
    `INSERT INTO user_daily_metrics (user_id, metric_date, water_liters)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       water_liters = VALUES(water_liters),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, key, clamped],
  );

  return clamped;
}

function hasOnlyExerciseItems(plan) {
  const items = plan?.items || [];
  if (!items.length) return false;
  return items.every((item) => item.activityType === 'exercise' && !!item.exerciseId);
}

async function ensureTodayPlan(userId, { forceRegenerate = false, forDate = new Date() } = {}) {
  if (!forceRegenerate) {
    const existing = await fetchTodayPlan(userId, forDate, 'ai');
    if (existing && hasOnlyExerciseItems(existing)) return existing;
  }

  const ctx = await fetchUserContext(userId);
  const questionnaire = buildQuestionnaireFromContext(ctx);
  const plan = await generateDailyPlan(userId, questionnaire);
  await saveDailyPlan(userId, plan, forDate);
  return fetchTodayPlan(userId, forDate, 'ai');
}

async function toggleActivityComplete(userId, activityId, completed = true) {
  const result = await query(
    `UPDATE user_scheduled_activities
     SET is_completed = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [completed ? 1 : 0, activityId, userId],
  );
  return result.affectedRows > 0;
}

async function addScheduledActivity(userId, { exerciseId, scheduledAt } = {}) {
  if (!exerciseId || !scheduledAt) {
    const err = new Error('exercise_id_and_scheduled_at_required');
    err.status = 400;
    throw err;
  }

  const rows = await query(
    `SELECT id, title_key, category_id
     FROM exercises
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [exerciseId],
  );
  const exercise = rows[0];
  if (!exercise) {
    const err = new Error('exercise_not_found');
    err.status = 404;
    throw err;
  }

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    const err = new Error('invalid_scheduled_at');
    err.status = 400;
    throw err;
  }

  const activityType =
    exercise.category_id === 'breath'
      ? 'breathing'
      : exercise.category_id === 'meditation'
        ? 'meditation'
        : 'exercise';

  const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await ensureActivitySourceColumn();
  await query(
    `INSERT INTO user_scheduled_activities
      (id, user_id, exercise_id, title, activity_type, plan_source, scheduled_at, is_completed)
     VALUES (?, ?, ?, ?, ?, 'manual', ?, 0)`,
    [id, userId, exercise.id, exercise.title_key, activityType, when],
  );

  return {
    id,
    exerciseId: exercise.id,
    scheduledAt: when.toISOString(),
    activityType,
    planSource: 'manual',
  };
}

async function fetchTodayPlan(userId, forDate = new Date(), source = 'manual') {
  await ensureActivitySourceColumn();
  try {
    const { ensureActivityMetaColumn } = require('./nutritionService');
    await ensureActivityMetaColumn();
  } catch (_) {}

  const planSource = normalizePlanSource(source);
  const { start, end } = dayRange(forDate);

  const rows = await query(
    `SELECT a.*, e.title_key, e.description_key, e.image_path, e.video_path, e.duration_minutes,
            e.calories AS exercise_calories, e.intensity_percent, e.category_id
     FROM user_scheduled_activities a
     LEFT JOIN exercises e ON e.id = a.exercise_id
     WHERE a.user_id = ?
       AND a.scheduled_at >= ?
       AND a.scheduled_at < ?
       AND a.plan_source = ?
       AND (a.exercise_id IS NOT NULL OR a.activity_type = 'nutrition')
     ORDER BY a.scheduled_at ASC`,
    [userId, start, end, planSource],
  );

  if (!rows.length) return null;

  const items = rows.map((row) => {
    let meta = {};
    if (row.meta_json) {
      try {
        meta = JSON.parse(row.meta_json);
      } catch (_) {
        meta = {};
      }
    }

    if (row.activity_type === 'nutrition') {
      return {
        id: row.id,
        time: `${String(new Date(row.scheduled_at).getHours()).padStart(2, '0')}:${String(new Date(row.scheduled_at).getMinutes()).padStart(2, '0')}`,
        activityType: 'nutrition',
        exerciseId: null,
        title: row.title,
        note: meta.mealType || null,
        isCompleted: row.is_completed === 1,
        durationMinutes: null,
        calories: meta.calories ?? null,
        intensityPercent: null,
        imagePath: null,
        imageUrl: meta.imageUrl || null,
        videoUrl: null,
        categoryId: 'nutrition',
        categoryTag: meta.mealType || 'Beslenme',
        titleKey: null,
        descriptionKey: null,
        planSource: row.plan_source || planSource,
      };
    }

    return {
      id: row.id,
      time: `${String(new Date(row.scheduled_at).getHours()).padStart(2, '0')}:${String(new Date(row.scheduled_at).getMinutes()).padStart(2, '0')}`,
      activityType: row.activity_type,
      exerciseId: row.exercise_id,
      title: row.title,
      isCompleted: row.is_completed === 1,
      durationMinutes: row.duration_minutes,
      calories: row.exercise_calories,
      intensityPercent: row.intensity_percent,
      imagePath: row.image_path,
      imageUrl: cdnUrl(row.image_path),
      videoUrl: row.video_path ? cdnUrl(row.video_path) : null,
      categoryId: row.category_id,
      categoryTag: CATEGORY_TAGS[row.category_id] || row.category_id || 'Egzersiz',
      titleKey: row.title_key,
      descriptionKey: row.description_key,
      planSource: row.plan_source || planSource,
    };
  });

  return {
    summary:
      planSource === 'ai'
        ? 'AI ile oluşturulan günlük planın'
        : 'Manuel günlük planın',
    tip: null,
    stats: computeStats(items),
    items,
    planSource,
  };
}

module.exports = {
  generateDailyPlan,
  saveDailyPlan,
  fetchTodayWaterLiters,
  saveTodayWaterLiters,
  fetchTodayPlan,
  ensureTodayPlan,
  toggleActivityComplete,
  addScheduledActivity,
  buildQuestionnaireFromContext,
};
