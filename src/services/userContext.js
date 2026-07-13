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
    often: 'Sık',
    sometimes: 'Bazen',
    rarely: 'Nadiren',
    not_yet: 'Henüz hissetmiyor',
  },
};

const LANGUAGE_NAMES = {
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

/** Welcome templates: {name}, {week}, {day} */
const WELCOME = {
  tr: {
    defaultName: 'Anne',
    withDay:
      'Merhaba {name}, {week}. hafta {day}. günündesin. Hamilelik, egzersiz ve beslenme konularında sana yardımcı olmak için buradayım. Sorularını yazabilirsin.',
    withWeek:
      'Merhaba {name}, {week}. haftadasın. Hamilelik, egzersiz ve beslenme konularında sana yardımcı olmak için buradayım. Sorularını yazabilirsin.',
    simple:
      'Merhaba {name}, hamilelik, egzersiz ve beslenme konularında sana yardımcı olmak için buradayım. Sorularını yazabilirsin.',
  },
  en: {
    defaultName: 'Mom',
    withDay:
      "Hi {name}, you're in week {week}, day {day}. I'm here to help with pregnancy, exercise, and nutrition. Feel free to ask anything.",
    withWeek:
      "Hi {name}, you're in week {week}. I'm here to help with pregnancy, exercise, and nutrition. Feel free to ask anything.",
    simple:
      "Hi {name}, I'm here to help with pregnancy, exercise, and nutrition. Feel free to ask anything.",
  },
  de: {
    defaultName: 'Mama',
    withDay:
      'Hallo {name}, du bist in Woche {week}, Tag {day}. Ich helfe dir gerne bei Schwangerschaft, Training und Ernährung. Stell gerne deine Fragen.',
    withWeek:
      'Hallo {name}, du bist in Woche {week}. Ich helfe dir gerne bei Schwangerschaft, Training und Ernährung. Stell gerne deine Fragen.',
    simple:
      'Hallo {name}, ich helfe dir gerne bei Schwangerschaft, Training und Ernährung. Stell gerne deine Fragen.',
  },
  es: {
    defaultName: 'Mamá',
    withDay:
      'Hola {name}, estás en la semana {week}, día {day}. Estoy aquí para ayudarte con el embarazo, el ejercicio y la nutrición. Puedes escribir tus preguntas.',
    withWeek:
      'Hola {name}, estás en la semana {week}. Estoy aquí para ayudarte con el embarazo, el ejercicio y la nutrición. Puedes escribir tus preguntas.',
    simple:
      'Hola {name}, estoy aquí para ayudarte con el embarazo, el ejercicio y la nutrición. Puedes escribir tus preguntas.',
  },
  fr: {
    defaultName: 'Maman',
    withDay:
      'Bonjour {name}, tu es à la semaine {week}, jour {day}. Je suis là pour t’aider sur la grossesse, l’exercice et la nutrition. Pose tes questions.',
    withWeek:
      'Bonjour {name}, tu es à la semaine {week}. Je suis là pour t’aider sur la grossesse, l’exercice et la nutrition. Pose tes questions.',
    simple:
      'Bonjour {name}, je suis là pour t’aider sur la grossesse, l’exercice et la nutrition. Pose tes questions.',
  },
  hi: {
    defaultName: 'माँ',
    withDay:
      'नमस्ते {name}, आप सप्ताह {week}, दिन {day} में हैं। मैं गर्भावस्था, व्यायाम और पोषण में मदद के लिए यहाँ हूँ। अपने सवाल लिख सकती हैं।',
    withWeek:
      'नमस्ते {name}, आप सप्ताह {week} में हैं। मैं गर्भावस्था, व्यायाम और पोषण में मदद के लिए यहाँ हूँ। अपने सवाल लिख सकती हैं।',
    simple:
      'नमस्ते {name}, मैं गर्भावस्था, व्यायाम और पोषण में मदद के लिए यहाँ हूँ। अपने सवाल लिख सकती हैं।',
  },
  it: {
    defaultName: 'Mamma',
    withDay:
      'Ciao {name}, sei alla settimana {week}, giorno {day}. Sono qui per aiutarti con gravidanza, esercizio e alimentazione. Puoi scrivere le tue domande.',
    withWeek:
      'Ciao {name}, sei alla settimana {week}. Sono qui per aiutarti con gravidanza, esercizio e alimentazione. Puoi scrivere le tue domande.',
    simple:
      'Ciao {name}, sono qui per aiutarti con gravidanza, esercizio e alimentazione. Puoi scrivere le tue domande.',
  },
  ja: {
    defaultName: 'ママ',
    withDay:
      'こんにちは{name}さん。妊娠{week}週{day}日目ですね。妊娠・運動・栄養についてサポートします。何でも聞いてください。',
    withWeek:
      'こんにちは{name}さん。妊娠{week}週ですね。妊娠・運動・栄養についてサポートします。何でも聞いてください。',
    simple:
      'こんにちは{name}さん。妊娠・運動・栄養についてサポートします。何でも聞いてください。',
  },
  ko: {
    defaultName: '엄마',
    withDay:
      '안녕하세요 {name}님, {week}주차 {day}일이에요. 임신, 운동, 영양에 대해 도와드릴게요. 궁금한 점을 적어 주세요.',
    withWeek:
      '안녕하세요 {name}님, {week}주차예요. 임신, 운동, 영양에 대해 도와드릴게요. 궁금한 점을 적어 주세요.',
    simple:
      '안녕하세요 {name}님, 임신, 운동, 영양에 대해 도와드릴게요. 궁금한 점을 적어 주세요.',
  },
  pt: {
    defaultName: 'Mamãe',
    withDay:
      'Olá {name}, você está na semana {week}, dia {day}. Estou aqui para ajudar com gravidez, exercício e nutrição. Pode escrever suas perguntas.',
    withWeek:
      'Olá {name}, você está na semana {week}. Estou aqui para ajudar com gravidez, exercício e nutrição. Pode escrever suas perguntas.',
    simple:
      'Olá {name}, estou aqui para ajudar com gravidez, exercício e nutrição. Pode escrever suas perguntas.',
  },
  ru: {
    defaultName: 'Мама',
    withDay:
      'Привет, {name}! Сейчас у тебя {week}-я неделя, {day}-й день. Я помогу с беременностью, упражнениями и питанием. Можешь задавать вопросы.',
    withWeek:
      'Привет, {name}! Сейчас у тебя {week}-я неделя. Я помогу с беременностью, упражнениями и питанием. Можешь задавать вопросы.',
    simple:
      'Привет, {name}! Я помогу с беременностью, упражнениями и питанием. Можешь задавать вопросы.',
  },
  zh: {
    defaultName: '妈妈',
    withDay:
      '你好{name}，你现在是第{week}周第{day}天。我可以帮你了解孕期、运动和营养，有问题随时问我。',
    withWeek:
      '你好{name}，你现在是第{week}周。我可以帮你了解孕期、运动和营养，有问题随时问我。',
    simple:
      '你好{name}，我可以帮你了解孕期、运动和营养，有问题随时问我。',
  },
};

function normalizeLocale(locale) {
  if (!locale || typeof locale !== 'string') return 'tr';
  const code = locale.trim().toLowerCase().split(/[-_]/)[0];
  return WELCOME[code] ? code : 'tr';
}

function fill(template, args) {
  let out = template;
  for (const [k, v] of Object.entries(args)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

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

function buildWelcomeMessage(ctx, locale = 'tr') {
  const lang = normalizeLocale(locale);
  const t = WELCOME[lang] || WELCOME.tr;
  const name = ctx.displayName || t.defaultName;
  const week = ctx.answers.pregnancy_week;
  const day = ctx.answers.pregnancy_day;

  if (week && day) {
    return fill(t.withDay, { name, week, day });
  }
  if (week) {
    return fill(t.withWeek, { name, week });
  }
  return fill(t.simple, { name });
}

function buildSystemPrompt(ctx, locale = 'tr') {
  const lang = normalizeLocale(locale);
  const languageName = LANGUAGE_NAMES[lang] || 'Turkish';
  const a = ctx.answers;
  const lines = [
    'Sen MomFit uygulamasının hamilelik asistanısın.',
    'Yalnızca hamilelik, güvenli egzersiz, beslenme, uyku, stres ve genel wellness konularında yardımcı ol.',
    'Tıbbi teşhis koyma, ilaç önerme veya acil durumlarda mutlaka doktora yönlendir.',
    `Kullanıcının uygulama dili: ${languageName}. Tüm yanıtlarını bu dilde ver.`,
    'Kısa, sıcak ve anlaşılır ol. Madde işaretlerini abartma.',
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
  normalizeLocale,
};
