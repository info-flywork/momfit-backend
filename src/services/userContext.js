const { query } = require('../config/db');
const { rowsToAnswers } = require('../lib/userAnswers');

const LABELS = {
  daily_routine: {
    sedentary: 'Hareketsiz',
    moderate: 'Orta aktif',
    active: 'Aktif',
  },
  exercise_reason: {
    energy: 'Enerji',
    sleep: 'Uyku',
    stress: 'Stres',
    weight: 'Kilo kontrolü',
    birth_prep: 'Doğuma hazırlık',
  },
  health_condition: {
    backPain: 'Bel ağrısı',
    pelvicPain: 'Pelvik ağrı',
    none: 'Sağlık sorunu yok',
    optionalSkip: 'Belirtmek istemiyor',
  },
  pregnancy_type: {
    single: 'Tek bebek',
    multiple: 'Çoğul gebelik',
  },
  diet_preference: {
    balanced: 'Dengeli',
    vegetarian: 'Vejetaryen',
    vegan: 'Vegan',
    gluten_free: 'Glutensiz',
  },
  feeling: {
    energetic: 'Enerjik',
    good: 'İyi',
    normal: 'Normal',
    tired: 'Yorgun',
  },
  priority: {
    rest: 'Dinlenme',
    light: 'Hafif hareket',
    pain: 'Ağrı yönetimi',
    energy: 'Enerji',
    balanced: 'Dengeli gün',
  },
  baby_movement: {
    active: 'Hareketli',
    normal: 'Normal',
    calm: 'Sakin',
    unsure: 'Emin değilim',
  },
  baby_movement: {
    often: 'Sık',
    sometimes: 'Bazen',
    rarely: 'Nadiren',
    not_yet: 'Henüz hissetmiyor',
  },
};

function label(group, value) {
  if (!value) return null;
  return LABELS[group]?.[value] || value;
}

async function fetchUserContext(userId) {
  const userRows = await query(
    'SELECT id, email, display_name FROM users WHERE id = ? LIMIT 1',
    [userId],
  );

  const answerRows = await query(
    `SELECT question_key, answer_value
     FROM user_onboarding_answers
     WHERE user_id = ?`,
    [userId],
  );

  const answers = rowsToAnswers(answerRows);
  const user = userRows[0] || {};

  return {
    userId,
    displayName: answers.name || user.display_name || null,
    email: user.email || null,
    answers,
  };
}

function buildWelcomeMessage(ctx) {
  const name = ctx.displayName || 'Anne';
  const week = ctx.answers.pregnancy_week;
  const day = ctx.answers.pregnancy_day;

  if (week) {
    const pregnancy = day ? `${week}. hafta ${day}. gün` : `${week}. hafta`;
    return `Merhaba ${name}, ${pregnancy}ndasın. Hamilelik, egzersiz ve beslenme konularında sana yardımcı olmak için buradayım. Sorularını yazabilirsin.`;
  }

  return `Merhaba ${name}, hamilelik, egzersiz ve beslenme konularında sana yardımcı olmak için buradayım. Sorularını yazabilirsin.`;
}

function buildSystemPrompt(ctx) {
  const a = ctx.answers;
  const lines = [
    'Sen MomFit uygulamasının hamilelik asistanısın.',
    'Yalnızca hamilelik, güvenli egzersiz, beslenme, uyku, stres ve genel wellness konularında yardımcı ol.',
    'Tıbbi teşhis koyma, ilaç önerme veya acil durumlarda mutlaka doktora yönlendir.',
    'Kısa, sıcak ve anlaşılır Türkçe kullan. Madde işaretlerini abartma.',
    'Kullanıcıyı ismiyle hitap et.',
    '',
    '## Kullanıcı profili',
  ];

  const name = ctx.displayName || a.name;
  if (name) lines.push(`- İsim: ${name}`);
  if (a.pregnancy_week) {
    lines.push(
      `- Hamilelik: ${a.pregnancy_week}. hafta${a.pregnancy_day ? ` ${a.pregnancy_day}. gün` : ''}`,
    );
  }
  if (a.age) lines.push(`- Yaş: ${a.age}`);
  if (a.weight) lines.push(`- Kilo: ${a.weight} kg`);
  if (a.height) lines.push(`- Boy: ${a.height} cm`);
  if (a.daily_routine) {
    lines.push(`- Günlük rutin: ${label('daily_routine', a.daily_routine)}`);
  }
  if (a.exercise_reason) {
    lines.push(`- Egzersiz motivasyonu: ${label('exercise_reason', a.exercise_reason)}`);
  }
  if (a.health_condition) {
    lines.push(`- Sağlık notu: ${label('health_condition', a.health_condition)}`);
  }
  if (a.diet_preference) {
    lines.push(`- Beslenme tercihi: ${label('diet_preference', a.diet_preference)}`);
  }
  if (a.sensitivities?.length) {
    lines.push(`- Besin hassasiyetleri: ${a.sensitivities.join(', ')}`);
  }
  if (a.primary_goal) lines.push(`- Beslenme hedefi: ${a.primary_goal}`);
  if (a.feeling) lines.push(`- Bugünkü his: ${label('feeling', a.feeling)}`);
  if (a.priority) lines.push(`- Öncelik: ${label('priority', a.priority)}`);
  if (a.complaints?.length) {
    lines.push(`- Şikayetler: ${a.complaints.join(', ')}`);
  }
  if (a.baby_movement) {
    lines.push(`- Bebek hareketi: ${label('baby_movement', a.baby_movement)}`);
  }

  lines.push(
    '',
    'Egzersiz önerirken kullanıcının haftasına ve sağlık notuna dikkat et.',
    'Bel ağrısı veya pelvik ağrı varsa yüksek etkili hareketlerden kaçın.',
  );

  return lines.join('\n');
}

module.exports = {
  fetchUserContext,
  buildWelcomeMessage,
  buildSystemPrompt,
};
