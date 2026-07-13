const { cdnWeekAnimal, weekAnimalAvailable } = require('../lib/cdn');
const {
  PREGNANCY_WEEK_METRICS,
  baseBabyMilestoneKeys,
  baseMotherTipKeys,
  dayBabyHintKey,
  dayMotherHintKey,
} = require('../data/pregnancy_weeks');

const MAX_WEEK = 41;
const MAX_DAY = 6;

function clampWeekDay(week, day) {
  const w = Math.min(Math.max(Number(week) || 1, 1), MAX_WEEK);
  const d = Math.min(Math.max(Number(day) || 0, 0), MAX_DAY);
  return { week: w, day: d };
}

function totalDays(week, day) {
  return week * 7 + day;
}

function progressPercent(week, day) {
  return Math.round((totalDays(week, day) / (MAX_WEEK * 7)) * 100);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function interpolateMetrics(week, day) {
  const t = day / 7;
  const current = PREGNANCY_WEEK_METRICS[week - 1];
  const next = PREGNANCY_WEEK_METRICS[Math.min(week, MAX_WEEK - 1)];

  return {
    heightMinCm: lerp(current.heightMin, next.heightMin, t),
    heightMaxCm: lerp(current.heightMax, next.heightMax, t),
    weightMinG: lerp(current.weightMin, next.weightMin, t),
    weightMaxG: lerp(current.weightMax, next.weightMax, t),
  };
}

function buildMilestoneKeys(week, day) {
  const babyKeys = baseBabyMilestoneKeys(week);
  const motherKeys = baseMotherTipKeys(week);

  return {
    babyMilestoneKeys: babyKeys,
    babyDayHintKey: dayBabyHintKey(day),
    motherTipKeys: motherKeys,
    motherDayHintKey: dayMotherHintKey(day),
  };
}

function animalForWeek(week) {
  const clamped = Math.min(Math.max(week, 1), MAX_WEEK);
  return {
    week: clamped,
    animalKey: `animals.week_${clamped}`,
    animalImageUrl: weekAnimalAvailable(clamped) ? cdnWeekAnimal(clamped) : null,
  };
}

function getPregnancyContent(weekInput, dayInput) {
  const { week, day } = clampWeekDay(weekInput, dayInput);
  const metrics = interpolateMetrics(week, day);
  const milestones = buildMilestoneKeys(week, day);
  const animal = animalForWeek(week);
  const nextWeek = Math.min(week + 1, MAX_WEEK);
  const nextAnimal = animalForWeek(nextWeek);

  return {
    week,
    day,
    progressPercent: progressPercent(week, day),
    totalDays: totalDays(week, day),
    ...metrics,
    ...milestones,
    animalKey: animal.animalKey,
    animalImageUrl: animal.animalImageUrl,
    nextWeek,
    nextAnimalKey: nextAnimal.animalKey,
    nextAnimalImageUrl: nextAnimal.animalImageUrl,
  };
}

function resolvePregnancyProgress(storedWeek, storedDay, anchorDateIso) {
  const { week: w, day: d } = clampWeekDay(storedWeek, storedDay);
  if (!anchorDateIso) {
    return { week: w, day: d, advanced: false };
  }

  const anchor = new Date(`${anchorDateIso}T00:00:00`);
  if (Number.isNaN(anchor.getTime())) {
    return { week: w, day: d, advanced: false };
  }

  const today = new Date();
  const anchorDay = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const todayDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const elapsed = Math.floor((todayDay - anchorDay) / (24 * 60 * 60 * 1000));

  if (elapsed <= 0) {
    return { week: w, day: d, advanced: false };
  }

  const baseDays = totalDays(w, d);
  const resolvedDays = Math.min(baseDays + elapsed, MAX_WEEK * 7);
  const resolvedWeek = Math.floor(resolvedDays / 7);
  const resolvedDay = resolvedDays % 7;

  return {
    week: Math.max(resolvedWeek, 1),
    day: resolvedDay,
    advanced: true,
  };
}

module.exports = {
  getPregnancyContent,
  resolvePregnancyProgress,
  progressPercent,
};
