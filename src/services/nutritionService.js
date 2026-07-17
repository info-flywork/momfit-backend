const { query } = require('../config/db');
const { uploadToCdn } = require('../lib/cdn');
const { openaiApiKey, openaiModel } = require('../config/env');

let tablesReady = false;
let metaColumnReady = false;
let translationsColumnReady = false;

const NUTRITION_LANGUAGES = {
  tr: 'Turkish',
  en: 'English',
  de: 'German',
  it: 'Italian',
  fr: 'French',
  ja: 'Japanese',
  es: 'Spanish',
  ru: 'Russian',
  ko: 'Korean',
  hi: 'Hindi',
  pt: 'Portuguese',
  zh: 'Chinese',
};

const BEGINNER_LEVELS = {
  tr: 'Başlangıç',
  en: 'Beginner',
  de: 'Anfänger',
  it: 'Principiante',
  fr: 'Débutant',
  ja: '初心者',
  es: 'Principiante',
  ru: 'Начальный',
  ko: '초급',
  hi: 'शुरुआती',
  pt: 'Iniciante',
  zh: '初级',
};

function normalizeNutritionLocale(locale) {
  const code = String(locale || 'tr').trim().toLowerCase().split(/[-_]/)[0];
  return NUTRITION_LANGUAGES[code] ? code : 'tr';
}

async function ensureNutritionTables() {
  if (tablesReady) return;
  await query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  tablesReady = true;
  await ensureMealNutrientsColumn();
  await ensureMealTranslationsColumn();
}

let nutrientsColumnReady = false;

async function ensureMealNutrientsColumn() {
  if (nutrientsColumnReady) return;
  try {
    await query(
      `ALTER TABLE user_nutrition_meals
       ADD COLUMN nutrients_json LONGTEXT NULL AFTER instructions_json`,
    );
  } catch (err) {
    const msg = String(err?.message || '');
    if (err?.code !== 'ER_DUP_FIELDNAME' && !msg.toLowerCase().includes('duplicate')) {
      console.warn('[nutrition] nutrients_json alter:', msg);
    }
  }
  nutrientsColumnReady = true;
}

async function ensureMealTranslationsColumn() {
  if (translationsColumnReady) return;
  try {
    await query(
      `ALTER TABLE user_nutrition_meals
       ADD COLUMN translations_json LONGTEXT NULL AFTER nutrients_json`,
    );
  } catch (err) {
    const msg = String(err?.message || '');
    if (err?.code !== 'ER_DUP_FIELDNAME' && !msg.toLowerCase().includes('duplicate')) {
      console.warn('[nutrition] translations_json alter:', msg);
    }
  }
  translationsColumnReady = true;
}

async function ensureActivityMetaColumn() {
  if (metaColumnReady) return;
  try {
    await query(
      `ALTER TABLE user_scheduled_activities
       ADD COLUMN meta_json LONGTEXT NULL AFTER title`,
    );
  } catch (err) {
    const msg = String(err?.message || '');
    if (err?.code !== 'ER_DUP_FIELDNAME' && !msg.toLowerCase().includes('duplicate')) {
      console.warn('[nutrition] meta_json alter:', msg);
    }
  }
  metaColumnReady = true;
}

function dateKey(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mealTimeForType(mealType, index) {
  const t = String(mealType || '').toLowerCase();
  if (t.includes('kahvalt') || t.includes('break')) return '08:30';
  if (t.includes('öğle') || t.includes('ogle') || t.includes('lunch')) return '12:30';
  if (t.includes('akşam') || t.includes('aksam') || t.includes('dinner')) return '19:00';
  if (t.includes('ara') || t.includes('snack')) return '16:00';
  const defaults = ['08:30', '12:30', '16:00', '19:00'];
  return defaults[index % defaults.length];
}

function parseTimeOnDate(time, baseDate) {
  const [h, m] = String(time).split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h || 9, m || 0, 0, 0);
  return d;
}

function fallbackPlan(questionnaire = {}) {
  return {
    dailyCalories: 1800,
    waterLiters: 2.5,
    dailyMacros: { protein: 90, fat: 55, carbs: 180 },
    meals: [
      {
        title: 'Yoğurtlu Yulaf ve Meyve',
        mealType: 'Kahvaltı',
        calories: 380,
        macros: { protein: 18, fat: 10, carbs: 52 },
        nutrients: { fiber: 72, calcium: 78, omega3: 45 },
        ingredients: ['yulaf', 'yoğurt', 'muz', 'bal'],
        instructions: ['Yulafı yoğurtla karıştır.', 'Meyve ekle ve servis et.'],
        cookingMinutes: 10,
      },
      {
        title: 'Izgara Tavuklu Sebze Tabağı',
        mealType: 'Öğle yemeği',
        calories: 420,
        macros: { protein: 35, fat: 12, carbs: 35 },
        nutrients: { fiber: 68, calcium: 55, omega3: 52 },
        ingredients: ['tavuk göğsü', 'brokoli', 'havuç', 'zeytinyağı'],
        instructions: ['Tavuğu ızgara yap.', 'Sebzeleri buharda pişir ve servis et.'],
        cookingMinutes: 25,
      },
      {
        title: 'Fırın Somon ve Salata',
        mealType: 'Akşam yemeği',
        calories: 450,
        macros: { protein: 32, fat: 22, carbs: 20 },
        nutrients: { fiber: 58, calcium: 62, omega3: 88 },
        ingredients: ['somon', 'marul', 'salatalık', 'limon'],
        instructions: ['Somunu fırınla.', 'Salata hazırla ve limon ekle.'],
        cookingMinutes: 30,
      },
    ],
  };
}

function clampPercent(value, fallback = 60) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeNutrients(raw, macros = {}) {
  const carbs = Number(macros.carbs) || 40;
  const protein = Number(macros.protein) || 20;
  const fat = Number(macros.fat) || 10;
  const total = Math.max(carbs + protein + fat, 1);
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    fiber: clampPercent(source.fiber ?? source.lif, Math.round((carbs / total) * 90)),
    calcium: clampPercent(source.calcium ?? source.kalsiyum, Math.round((protein / total) * 90)),
    omega3: clampPercent(source.omega3 ?? source.omega_3 ?? source['omega-3'], Math.round((fat / total) * 90)),
  };
}

async function callOpenAiNutritionPlan(questionnaire) {
  const locale = normalizeNutritionLocale(questionnaire?.locale);
  const language = NUTRITION_LANGUAGES[locale];
  const prompt = `Hamilelik için günlük beslenme planı oluştur. Sadece JSON dön.
Kullanıcı: ${JSON.stringify(questionnaire)}
Yanıt dili: ${language}.
Format:
{
  "dailyCalories": 1800,
  "waterLiters": 2.5,
  "dailyMacros": {"protein": 90, "fat": 55, "carbs": 180},
  "meals": [
    {
      "title": "...",
      "mealType": "Kahvaltı|Öğle yemeği|Akşam yemeği|Ara öğün",
      "calories": 400,
      "macros": {"protein": 20, "fat": 10, "carbs": 40},
      "nutrients": {"fiber": 70, "calcium": 65, "omega3": 55},
      "ingredients": ["..."],
      "instructions": ["..."],
      "cookingMinutes": 20
    }
  ]
}
3-4 öğün öner. Güvenli, pratik, hamileliğe uygun olsun.
title, mealType, ingredients ve instructions alanlarını yalnızca ${language} dilinde yaz.
nutrients alanları o öğünün günlük ihtiyacı karşılama yüzdesi olsun (0-100).`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'MomFit hamilelik beslenme asistanısın. Sadece geçerli JSON döndür.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`openai_plan_failed: ${response.status} ${text}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return JSON.parse(content);
}

async function generateMealImage(title, mealType) {
  if (!openaiApiKey) {
    console.warn('[nutrition/image] OPENAI_API_KEY yok');
    return null;
  }
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1-mini',
        prompt:
          `Photorealistic food photo of exactly this dish: "${title}". ` +
          `Meal type: ${mealType}. Show only this specific dish on a plate, ` +
          `unique ingredients matching the title, natural daylight, appetizing, ` +
          `no text, no watermark, no people, no other unrelated foods.`,
        size: '1024x1024',
        quality: 'low',
        n: 1,
      }),
    });
    if (!response.ok) {
      console.warn('[nutrition/image]', title, response.status, await response.text());
      return null;
    }
    const data = await response.json();
    const item = data.data?.[0];
    if (!item) return null;
    if (item.b64_json) {
      return Buffer.from(item.b64_json, 'base64');
    }
    if (item.url) {
      const imgRes = await fetch(item.url);
      if (!imgRes.ok) return null;
      return Buffer.from(await imgRes.arrayBuffer());
    }
    return null;
  } catch (err) {
    console.warn('[nutrition/image]', title, err.message);
    return null;
  }
}

async function scheduleNutritionMeals(userId, meals, planDate) {
  await ensureActivityMetaColumn();
  const day = new Date(`${dateKey(planDate)}T00:00:00`);
  const start = new Date(day);
  const end = new Date(day);
  end.setDate(end.getDate() + 1);

  // Aynı günün eski beslenme aktivitelerini temizle
  await query(
    `DELETE FROM user_scheduled_activities
     WHERE user_id = ? AND activity_type = 'nutrition' AND plan_source = 'manual'
       AND scheduled_at >= ? AND scheduled_at < ?`,
    [userId, start, end],
  );

  const scheduledIds = [];
  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    const id = newId('nut');
    const when = parseTimeOnDate(mealTimeForType(meal.mealType, i), day);
    const meta = {
      calories: meal.calories,
      protein: meal.macros?.protein,
      fat: meal.macros?.fat,
      carbs: meal.macros?.carbs,
      imageUrl: meal.imageUrl || null,
      mealType: meal.mealType,
    };
    await query(
      `INSERT INTO user_scheduled_activities
        (id, user_id, exercise_id, title, activity_type, plan_source, scheduled_at, is_completed, meta_json)
       VALUES (?, ?, NULL, ?, 'nutrition', 'manual', ?, 0, ?)`,
      [id, userId, meal.title, when, JSON.stringify(meta)],
    );
    scheduledIds.push(id);
    meal.scheduledActivityId = id;
  }
  return scheduledIds;
}

function normalizePlan(raw) {
  const base = raw && typeof raw === 'object' ? raw : fallbackPlan();
  const meals = Array.isArray(base.meals) ? base.meals : [];
  return {
    dailyCalories: Number(base.dailyCalories) || 1800,
    waterLiters: Number(base.waterLiters) || 2.5,
    dailyMacros: {
      protein: Number(base.dailyMacros?.protein) || 90,
      fat: Number(base.dailyMacros?.fat) || 55,
      carbs: Number(base.dailyMacros?.carbs) || 180,
    },
    meals: meals.slice(0, 4).map((m, index) => {
      const macros = {
        protein: Number(m.macros?.protein) || 20,
        fat: Number(m.macros?.fat) || 10,
        carbs: Number(m.macros?.carbs) || 40,
      };
      return {
        title: String(m.title || `Öğün ${index + 1}`),
        mealType: String(m.mealType || 'Öğün'),
        calories: Number(m.calories) || 350,
        macros,
        nutrients: normalizeNutrients(m.nutrients, macros),
        ingredients: Array.isArray(m.ingredients) ? m.ingredients.map(String) : [],
        instructions: Array.isArray(m.instructions) ? m.instructions.map(String) : [],
        cookingMinutes: Number(m.cookingMinutes) || 20,
      };
    }),
  };
}

async function generateAndSavePlan(userId, questionnaire = {}, forDate = new Date()) {
  await ensureNutritionTables();
  await ensureActivityMetaColumn();
  await ensureMealNutrientsColumn();

  let raw;
  let sourceLocale = 'tr';
  if (openaiApiKey) {
    try {
      raw = await callOpenAiNutritionPlan(questionnaire);
      sourceLocale = normalizeNutritionLocale(questionnaire?.locale);
    } catch (err) {
      console.error('[nutrition/generate]', err.message);
      raw = fallbackPlan(questionnaire);
    }
  } else {
    raw = fallbackPlan(questionnaire);
  }

  const plan = normalizePlan(raw);
  const key = dateKey(forDate);
  const planId = newId('nplan');

  // Eski planı sil (aynı gün)
  const old = await query(
    `SELECT id FROM user_nutrition_plans WHERE user_id = ? AND plan_date = ? LIMIT 1`,
    [userId, key],
  );
  if (old[0]?.id) {
    await query(`DELETE FROM user_nutrition_meals WHERE plan_id = ?`, [old[0].id]);
    await query(`DELETE FROM user_nutrition_plans WHERE id = ?`, [old[0].id]);
  }

  await query(
    `INSERT INTO user_nutrition_plans
      (id, user_id, plan_date, daily_calories, water_liters, protein_g, fat_g, carbs_g)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      planId,
      userId,
      key,
      plan.dailyCalories,
      plan.waterLiters,
      plan.dailyMacros.protein,
      plan.dailyMacros.fat,
      plan.dailyMacros.carbs,
    ],
  );

  await scheduleNutritionMeals(userId, plan.meals, key);

  for (let i = 0; i < plan.meals.length; i++) {
    const meal = plan.meals[i];
    const mealId = newId('nmeal');
    const translations = {
      [sourceLocale]: {
        title: meal.title,
        mealType: meal.mealType,
        ingredients: meal.ingredients || [],
        instructions: meal.instructions || [],
        level: BEGINNER_LEVELS[sourceLocale],
      },
    };
    await query(
      `INSERT INTO user_nutrition_meals
        (id, plan_id, title, meal_type, calories, protein_g, fat_g, carbs_g,
         image_url, ingredients_json, instructions_json, nutrients_json, translations_json,
         cooking_minutes, sort_order, scheduled_activity_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mealId,
        planId,
        meal.title,
        meal.mealType,
        meal.calories,
        meal.macros.protein,
        meal.macros.fat,
        meal.macros.carbs,
        meal.imageUrl || null,
        JSON.stringify(meal.ingredients || []),
        JSON.stringify(meal.instructions || []),
        JSON.stringify(meal.nutrients || {}),
        JSON.stringify(translations),
        meal.cookingMinutes,
        i,
        meal.scheduledActivityId || null,
      ],
    );
    meal.id = mealId;
  }

  // Görseller hazır olmadan plan dönülmez.
  await fillMealImages(userId, planId, plan.meals);

  // Güncel image_url'leri DB'den al.
  const mealRows = await query(
    `SELECT * FROM user_nutrition_meals
     WHERE plan_id = ?
     ORDER BY sort_order ASC`,
    [planId],
  );

  const missingImages = (mealRows || []).filter((m) => !m.image_url);
  if (missingImages.length > 0) {
    const titles = missingImages.map((m) => m.title).join(', ');
    const err = new Error(`nutrition_images_incomplete: ${titles}`);
    err.status = 503;
    throw err;
  }

  const localizedMeals = await translateMeals(mealRows, questionnaire?.locale);
  return formatPlanResponse(
    {
      id: planId,
      plan_date: key,
      daily_calories: plan.dailyCalories,
      water_liters: plan.waterLiters,
      protein_g: plan.dailyMacros.protein,
      fat_g: plan.dailyMacros.fat,
      carbs_g: plan.dailyMacros.carbs,
    },
    localizedMeals,
    questionnaire?.locale,
  );
}

/** Öğün görsellerini CDN'e yükleyip DB'yi günceller — yanıt öncesi tamamlanır. */
async function fillMealImages(userId, planId, meals) {
  // Paralel rate-limit riski yüksek; sırayla üret.
  for (let index = 0; index < meals.length; index++) {
    const meal = meals[index];
    if (!meal?.id) continue;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[nutrition/image] üretiliyor (${attempt}/3):`, meal.title);
        const buffer = await generateMealImage(meal.title, meal.mealType);
        if (!buffer) {
          lastError = new Error('empty_image_buffer');
          console.warn('[nutrition/image] boş sonuç:', meal.title);
          continue;
        }
        const path = `nutrition/${String(userId).replace(/[^a-zA-Z0-9_-]/g, '')}/${planId}_${index}.png`;
        const imageUrl = await uploadToCdn(path, buffer, 'image/png');
        await query(
          `UPDATE user_nutrition_meals SET image_url = ? WHERE id = ? AND plan_id = ?`,
          [imageUrl, meal.id, planId],
        );

        // Program kartları meta_json.imageUrl okur — senkron tut.
        const activityId = meal.scheduledActivityId;
        if (activityId) {
          const rows = await query(
            `SELECT meta_json FROM user_scheduled_activities WHERE id = ? AND user_id = ? LIMIT 1`,
            [activityId, userId],
          );
          let meta = {};
          if (rows[0]?.meta_json) {
            try {
              meta = JSON.parse(rows[0].meta_json) || {};
            } catch (_) {
              meta = {};
            }
          }
          meta.imageUrl = imageUrl;
          await query(
            `UPDATE user_scheduled_activities SET meta_json = ? WHERE id = ? AND user_id = ?`,
            [JSON.stringify(meta), activityId, userId],
          );
        }
        console.log('[nutrition/image] tamam:', meal.title, imageUrl);
        meal.imageUrl = imageUrl;
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        console.warn('[nutrition/cdn]', meal.title, err.message);
      }
    }
    if (!meal.imageUrl) {
      throw lastError || new Error(`nutrition_image_failed: ${meal.title}`);
    }
  }
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

async function translateMeals(mealRows, locale) {
  const lang = normalizeNutritionLocale(locale);
  const rows = (mealRows || []).map((row) => ({ ...row }));
  const missing = [];

  for (const row of rows) {
    const translations = safeJsonParse(row.translations_json, {});
    if (translations[lang]) {
      row._translation = translations[lang];
    } else {
      missing.push(row);
    }
  }

  if (missing.length > 0 && openaiApiKey) {
    try {
      const sourceMeals = missing.map((row) => ({
        id: row.id,
        title: row.title,
        mealType: row.meal_type,
        ingredients: safeJsonParse(row.ingredients_json, []),
        instructions: safeJsonParse(row.instructions_json, []),
      }));
      const language = NUTRITION_LANGUAGES[lang];
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                `Translate nutrition recipe text to ${language}. ` +
                'Preserve meal IDs, quantities, units and array structure. Return only valid JSON.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                format: {
                  meals: [{
                    id: 'same id',
                    title: 'translated',
                    mealType: 'translated',
                    ingredients: ['translated'],
                    instructions: ['translated'],
                  }],
                },
                meals: sourceMeals,
              }),
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`translation_failed: ${response.status}`);
      }
      const data = await response.json();
      const translated = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      const byId = new Map(
        (Array.isArray(translated.meals) ? translated.meals : [])
          .filter((item) => item && item.id)
          .map((item) => [String(item.id), item]),
      );

      for (const row of missing) {
        const item = byId.get(String(row.id));
        if (!item) continue;
        const localized = {
          title: String(item.title || row.title),
          mealType: String(item.mealType || row.meal_type),
          ingredients: Array.isArray(item.ingredients)
            ? item.ingredients.map(String)
            : safeJsonParse(row.ingredients_json, []),
          instructions: Array.isArray(item.instructions)
            ? item.instructions.map(String)
            : safeJsonParse(row.instructions_json, []),
          level: BEGINNER_LEVELS[lang],
        };
        const translations = safeJsonParse(row.translations_json, {});
        translations[lang] = localized;
        row.translations_json = JSON.stringify(translations);
        row._translation = localized;
        await query(
          `UPDATE user_nutrition_meals
           SET translations_json = ?
           WHERE id = ?`,
          [row.translations_json, row.id],
        );
      }
    } catch (err) {
      console.warn('[nutrition/translation]', lang, err.message);
    }
  }

  return rows;
}

function formatPlanResponse(planRow, mealRows, locale = 'tr') {
  const lang = normalizeNutritionLocale(locale);
  return {
    id: planRow.id,
    planDate: dateKey(planRow.plan_date),
    dailyCalories: Number(planRow.daily_calories) || 0,
    waterLiters: Number(planRow.water_liters) || 2.5,
    dailyMacros: {
      protein: Number(planRow.protein_g) || 0,
      fat: Number(planRow.fat_g) || 0,
      carbs: Number(planRow.carbs_g) || 0,
    },
    isGenerated: true,
    meals: (mealRows || []).map((m) => {
      const translated = m._translation || {};
      const macros = {
        protein: Number(m.protein_g) || 0,
        fat: Number(m.fat_g) || 0,
        carbs: Number(m.carbs_g) || 0,
      };
      return {
        id: m.id,
        title: translated.title || m.title,
        mealType: translated.mealType || m.meal_type,
        calories: Number(m.calories) || 0,
        macros,
        nutrients: normalizeNutrients(safeJsonParse(m.nutrients_json, {}), macros),
        imageUrl: m.image_url || null,
        ingredients: Array.isArray(translated.ingredients)
          ? translated.ingredients
          : safeJsonParse(m.ingredients_json, []),
        instructions: Array.isArray(translated.instructions)
          ? translated.instructions
          : safeJsonParse(m.instructions_json, []),
        cookingMinutes: Number(m.cooking_minutes) || 20,
        level: translated.level || BEGINNER_LEVELS[lang],
      };
    }),
  };
}

async function fetchLatestPlan(userId, locale = 'tr') {
  await ensureNutritionTables();
  const plans = await query(
    `SELECT * FROM user_nutrition_plans
     WHERE user_id = ?
     ORDER BY plan_date DESC, created_at DESC
     LIMIT 1`,
    [userId],
  );
  if (!plans[0]) return null;
  const meals = await query(
    `SELECT * FROM user_nutrition_meals
     WHERE plan_id = ?
     ORDER BY sort_order ASC`,
    [plans[0].id],
  );
  const localizedMeals = await translateMeals(meals, locale);
  return formatPlanResponse(plans[0], localizedMeals, locale);
}

async function fetchPlanForDate(userId, forDate = new Date(), locale = 'tr') {
  await ensureNutritionTables();
  const key = dateKey(forDate);
  const plans = await query(
    `SELECT * FROM user_nutrition_plans
     WHERE user_id = ? AND plan_date = ?
     LIMIT 1`,
    [userId, key],
  );
  if (!plans[0]) return null;
  const meals = await query(
    `SELECT * FROM user_nutrition_meals
     WHERE plan_id = ?
     ORDER BY sort_order ASC`,
    [plans[0].id],
  );
  const localizedMeals = await translateMeals(meals, locale);
  return formatPlanResponse(plans[0], localizedMeals, locale);
}

async function scheduleSingleNutritionMeal(userId, payload = {}) {
  await ensureActivityMetaColumn();
  const title = String(payload.title || '').trim();
  const scheduledAt = payload.scheduledAt || payload.scheduled_at;
  if (!title || !scheduledAt) {
    const err = new Error('title_and_scheduled_at_required');
    err.status = 400;
    throw err;
  }

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    const err = new Error('invalid_scheduled_at');
    err.status = 400;
    throw err;
  }

  const id = newId('nut');
  const meta = {
    calories: Number(payload.calories) || 0,
    protein: Number(payload.protein ?? payload.macros?.protein) || 0,
    fat: Number(payload.fat ?? payload.macros?.fat) || 0,
    carbs: Number(payload.carbs ?? payload.macros?.carbs) || 0,
    imageUrl: payload.imageUrl || payload.image_url || null,
    mealType: payload.mealType || payload.meal_type || 'Beslenme',
  };

  await query(
    `INSERT INTO user_scheduled_activities
      (id, user_id, exercise_id, title, activity_type, plan_source, scheduled_at, is_completed, meta_json)
     VALUES (?, ?, NULL, ?, 'nutrition', 'manual', ?, 0, ?)`,
    [id, userId, title, when, JSON.stringify(meta)],
  );

  return {
    id,
    title,
    scheduledAt: when.toISOString(),
    activityType: 'nutrition',
    planSource: 'manual',
    meta,
  };
}

module.exports = {
  generateAndSavePlan,
  fetchLatestPlan,
  fetchPlanForDate,
  ensureActivityMetaColumn,
  ensureNutritionTables,
  scheduleSingleNutritionMeal,
};
