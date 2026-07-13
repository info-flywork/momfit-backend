const { query } = require('../config/db');
const { uploadToCdn } = require('../lib/cdn');
const { openaiApiKey, openaiModel } = require('../config/env');

const MEASURE_KEYS = ['chest', 'arm', 'belly', 'waist', 'hip', 'upper_leg', 'lower_leg'];

const DEFAULT_MEASUREMENTS = {
  chest: 116,
  arm: 40,
  belly: 100,
  waist: 88,
  hip: 100,
  upper_leg: 70,
  lower_leg: 45,
};

const DEFAULT_DIRECTIONS = {
  chest: 'up',
  arm: 'up',
  belly: 'down',
  waist: 'down',
  hip: 'neutral',
  upper_leg: 'up',
  lower_leg: 'up',
};

let weeklyResultsTableReady = false;

async function ensureWeeklyResultsTable() {
  if (weeklyResultsTableReady) return;
  await query(
    `CREATE TABLE IF NOT EXISTS weekly_results (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      week_start DATE NOT NULL,
      photo_url TEXT NULL,
      measurements_json LONGTEXT NOT NULL,
      analysis_metrics_json LONGTEXT NULL,
      assessments_json LONGTEXT NULL,
      recommended_exercises_json LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_weekly_results_user_week (user_id, week_start),
      CONSTRAINT fk_weekly_results_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  weeklyResultsTableReady = true;
}

function toDateKey(input) {
  if (!input || typeof input !== 'string') return null;
  const part = input.includes('T') ? input.split('T')[0] : input;
  const d = new Date(`${part}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeMeasurements(raw) {
  const out = {};
  for (const key of MEASURE_KEYS) {
    const n = Number(raw?.[key]);
    if (Number.isFinite(n) && n > 0) out[key] = Number(n.toFixed(1));
  }
  return out;
}

function photoPath(userId, weekStart, ext = 'jpg') {
  const safeUser = String(userId || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
  const safeWeek = String(weekStart || 'week').replace(/[^0-9-]/g, '');
  return `weekly_results/${safeUser}_${safeWeek}.${ext}`;
}

function imageExtFromMime(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

async function validateFullBodyPhoto({ base64, mimeType }) {
  // OpenAI varsa görselin tam boy insan olup olmadığını doğrula.
  if (!openaiApiKey) return { ok: true };
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Görsel doğrulama yap. Sadece JSON dön: {"ok":true|false,"reason":"..."}',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Bu fotoğrafta yetişkin bir insanın baştan ayağa (tam boy) tek kişilik net görüntüsü var mı? Varsa ok=true.',
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 120,
    }),
  });

  if (!response.ok) return { ok: true };
  const body = await response.json();
  const raw = body.choices?.[0]?.message?.content;
  if (!raw) return { ok: true };
  try {
    const parsed = JSON.parse(raw);
    return { ok: !!parsed.ok, reason: parsed.reason || null };
  } catch (_) {
    return { ok: true };
  }
}

async function pickRecommendedExercises(categories = []) {
  const unique = [...new Set(categories)].filter(Boolean);
  const rows = [];
  for (const cat of unique) {
    const result = await query(
      `SELECT id, category_id, title_key, description_key, duration_minutes, calories, intensity_percent
       FROM exercises
       WHERE is_active = 1 AND category_id = ?
       ORDER BY sort_order
       LIMIT 1`,
      [cat],
    );
    if (result[0]) rows.push(result[0]);
  }

  if (!rows.length) {
    const fallback = await query(
      `SELECT id, category_id, title_key, description_key, duration_minutes, calories, intensity_percent
       FROM exercises
       WHERE is_active = 1
       ORDER BY sort_order
       LIMIT 3`,
    );
    return fallback;
  }
  return rows;
}

async function runBodyAnalysis(measurements, photoBase64, mimeType) {
  const baseCats = ['breath', 'pilates', 'yoga'];
  const withValues = Object.entries(measurements)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  const fallback = () => ({
    measurements: normalizeMeasurements({ ...DEFAULT_MEASUREMENTS, ...measurements }),
    assessments: [
      'Orta düzey adaptasyon sürecinde',
      'Genel olarak stabil',
      'Alt ekstremitelerde hafif sıvı/ödem eğilimi olabilir',
    ],
    metricDirections: { ...DEFAULT_DIRECTIONS },
    categories: baseCats,
  });

  if (!openaiApiKey || !photoBase64) {
    return fallback();
  }

  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${photoBase64}`;
  const measurementHint = withValues
    ? `Kullanıcının girdiği ölçümler: ${withValues}. Bunları önceliklendir, eksik olanları fotoğraftan tahmin et.`
    : 'Ölçüm girilmedi; tüm çevre ölçümlerini fotoğraftan cm cinsinden tahmin et.';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey}`,
    },
    body: JSON.stringify({
      model: openaiModel,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Hamilelik fitness vücut analizi yap. Sadece JSON dön. ' +
            'Alanlar: measurements (chest,arm,belly,waist,hip,upper_leg,lower_leg cm sayı), ' +
            'assessments (3 Türkçe cümle), metricDirections (up|down|neutral), ' +
            'categories (cardio|breath|pilates|meditation|yoga, max 3).',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${measurementHint} 3 kısa değerlendirme, metric yönleri ve 3 egzersiz kategorisi öner.`,
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      max_tokens: 600,
    }),
  });

  if (!response.ok) return fallback();
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  let parsed = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch (_) {
    return fallback();
  }

  const estimated = normalizeMeasurements(parsed.measurements || {});
  const merged = normalizeMeasurements({ ...estimated, ...measurements });

  return {
    measurements: Object.keys(merged).length ? merged : fallback().measurements,
    assessments: (parsed.assessments || fallback().assessments).slice(0, 3),
    metricDirections: { ...DEFAULT_DIRECTIONS, ...(parsed.metricDirections || {}) },
    categories: (parsed.categories || baseCats).slice(0, 3),
  };
}

function displayMetrics(measurements, directions) {
  const map = {};
  for (const key of MEASURE_KEYS) {
    if (!Number.isFinite(measurements[key])) continue;
    const dir = directions?.[key] || 'neutral';
    map[key] = {
      value: measurements[key],
      direction: dir,
      valueText:
        dir === 'up'
          ? `↑${measurements[key]} cm`
          : dir === 'down'
            ? `↓${measurements[key]} cm`
            : `—${measurements[key]} cm`,
    };
  }
  return map;
}

async function upsertWeeklyResult({
  userId,
  weekStart,
  photoUrl,
  measurements,
  analysisMetrics,
  assessments,
  recommendedExercises,
}) {
  await ensureWeeklyResultsTable();
  await query(
    `INSERT INTO weekly_results
      (user_id, week_start, photo_url, measurements_json, analysis_metrics_json, assessments_json, recommended_exercises_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      photo_url = COALESCE(VALUES(photo_url), photo_url),
      measurements_json = VALUES(measurements_json),
      analysis_metrics_json = VALUES(analysis_metrics_json),
      assessments_json = VALUES(assessments_json),
      recommended_exercises_json = VALUES(recommended_exercises_json),
      updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      weekStart,
      photoUrl || null,
      JSON.stringify(measurements || {}),
      JSON.stringify(analysisMetrics || {}),
      JSON.stringify(assessments || []),
      JSON.stringify(recommendedExercises || []),
    ],
  );
}

module.exports = {
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
};
