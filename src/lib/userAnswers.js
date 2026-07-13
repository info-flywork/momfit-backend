const ANSWER_FIELDS = [
  { flow: 'main', key: 'name' },
  { flow: 'main', key: 'pregnancy_week' },
  { flow: 'main', key: 'pregnancy_day' },
  { flow: 'main', key: 'pregnancy_anchor_date' },
  { flow: 'main', key: 'daily_routine' },
  { flow: 'main', key: 'exercise_reason' },
  { flow: 'main', key: 'health_condition' },
  { flow: 'nutrition', key: 'age' },
  { flow: 'nutrition', key: 'weight' },
  { flow: 'nutrition', key: 'height' },
  { flow: 'nutrition', key: 'target_weight' },
  { flow: 'nutrition', key: 'pregnancy_type' },
  { flow: 'nutrition', key: 'diet_preference' },
  { flow: 'nutrition', key: 'sensitivities' },
  { flow: 'nutrition', key: 'primary_goal' },
  { flow: 'ai_plan', key: 'feeling' },
  { flow: 'ai_plan', key: 'priority' },
  { flow: 'ai_plan', key: 'complaints' },
  { flow: 'ai_plan', key: 'baby_movement' },
];

function parseList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function rowsToAnswers(rows) {
  const byKey = Object.fromEntries(rows.map((r) => [r.question_key, r.answer_value]));
  const answers = {};

  if (byKey.name) answers.name = byKey.name;
  if (byKey.pregnancy_week) answers.pregnancy_week = Number(byKey.pregnancy_week);
  if (byKey.pregnancy_day) answers.pregnancy_day = Number(byKey.pregnancy_day);
  if (byKey.pregnancy_anchor_date) answers.pregnancy_anchor_date = byKey.pregnancy_anchor_date;
  if (byKey.daily_routine) answers.daily_routine = byKey.daily_routine;
  if (byKey.exercise_reason) answers.exercise_reason = byKey.exercise_reason;
  if (byKey.health_condition) answers.health_condition = byKey.health_condition;
  if (byKey.age) answers.age = Number(byKey.age);
  if (byKey.weight) answers.weight = Number(byKey.weight);
  if (byKey.height) answers.height = Number(byKey.height);
  if (byKey.target_weight) answers.target_weight = Number(byKey.target_weight);
  if (byKey.pregnancy_type) answers.pregnancy_type = byKey.pregnancy_type;
  if (byKey.diet_preference) answers.diet_preference = byKey.diet_preference;
  if (byKey.sensitivities) answers.sensitivities = parseList(byKey.sensitivities);
  if (byKey.primary_goal) answers.primary_goal = byKey.primary_goal;
  if (byKey.feeling) answers.feeling = byKey.feeling;
  if (byKey.priority) answers.priority = byKey.priority;
  if (byKey.complaints) answers.complaints = parseList(byKey.complaints);
  if (byKey.baby_movement) answers.baby_movement = byKey.baby_movement;

  return answers;
}

function answersToRows(answers) {
  const map = {
    name: answers.name,
    pregnancy_week: answers.pregnancy_week,
    pregnancy_day: answers.pregnancy_day,
    pregnancy_anchor_date: answers.pregnancy_anchor_date,
    daily_routine: answers.daily_routine,
    exercise_reason: answers.exercise_reason,
    health_condition: answers.health_condition,
    age: answers.age,
    weight: answers.weight,
    height: answers.height,
    target_weight: answers.target_weight,
    pregnancy_type: answers.pregnancy_type,
    diet_preference: answers.diet_preference,
    sensitivities: answers.sensitivities,
    primary_goal: answers.primary_goal,
    feeling: answers.feeling,
    priority: answers.priority,
    complaints: answers.complaints,
    baby_movement: answers.baby_movement,
  };

  const rows = [];
  for (const field of ANSWER_FIELDS) {
    const value = map[field.key];
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    rows.push({
      flow: field.flow,
      key: field.key,
      value: Array.isArray(value) ? JSON.stringify(value) : String(value),
    });
  }
  return rows;
}

module.exports = { ANSWER_FIELDS, rowsToAnswers, answersToRows };
