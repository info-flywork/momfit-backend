/**
 * Haftalık hamilelik metrikleri (CRL/FL ve ağırlık yaklaşık aralıkları).
 * Metinler Flutter lokalizasyonunda; burada yalnızca locale anahtarları tutulur.
 */
const PREGNANCY_WEEK_METRICS = [
  { heightMin: 0.1, heightMax: 0.2, weightMin: 0, weightMax: 1 },
  { heightMin: 0.2, heightMax: 0.3, weightMin: 0, weightMax: 1 },
  { heightMin: 0.3, heightMax: 0.5, weightMin: 0, weightMax: 1 },
  { heightMin: 0.4, heightMax: 0.6, weightMin: 0, weightMax: 1 },
  { heightMin: 0.5, heightMax: 0.8, weightMin: 0, weightMax: 1 },
  { heightMin: 0.6, heightMax: 1.0, weightMin: 1, weightMax: 2 },
  { heightMin: 1.0, heightMax: 1.3, weightMin: 1, weightMax: 2 },
  { heightMin: 1.4, heightMax: 1.8, weightMin: 1, weightMax: 2 },
  { heightMin: 2.0, heightMax: 2.5, weightMin: 2, weightMax: 4 },
  { heightMin: 3.0, heightMax: 3.5, weightMin: 4, weightMax: 6 },
  { heightMin: 4.0, heightMax: 4.5, weightMin: 7, weightMax: 10 },
  { heightMin: 5.0, heightMax: 6.0, weightMin: 14, weightMax: 20 },
  { heightMin: 6.5, heightMax: 7.5, weightMin: 20, weightMax: 28 },
  { heightMin: 8.0, heightMax: 9.0, weightMin: 40, weightMax: 55 },
  { heightMin: 9.5, heightMax: 10.5, weightMin: 65, weightMax: 80 },
  { heightMin: 11.0, heightMax: 12.0, weightMin: 90, weightMax: 110 },
  { heightMin: 12.0, heightMax: 13.0, weightMin: 120, weightMax: 150 },
  { heightMin: 13.5, heightMax: 14.5, weightMin: 160, weightMax: 200 },
  { heightMin: 14.5, heightMax: 15.5, weightMin: 220, weightMax: 270 },
  { heightMin: 16.0, heightMax: 17.0, weightMin: 280, weightMax: 330 },
  { heightMin: 17.5, heightMax: 18.5, weightMin: 330, weightMax: 400 },
  { heightMin: 19.0, heightMax: 20.0, weightMin: 420, weightMax: 500 },
  { heightMin: 20.0, heightMax: 21.0, weightMin: 500, weightMax: 580 },
  { heightMin: 21.0, heightMax: 22.0, weightMin: 580, weightMax: 660 },
  { heightMin: 22.0, heightMax: 23.5, weightMin: 660, weightMax: 750 },
  { heightMin: 23.5, heightMax: 25.0, weightMin: 750, weightMax: 850 },
  { heightMin: 25.0, heightMax: 27.0, weightMin: 850, weightMax: 980 },
  { heightMin: 27.0, heightMax: 29.0, weightMin: 980, weightMax: 1150 },
  { heightMin: 29.0, heightMax: 31.0, weightMin: 1150, weightMax: 1350 },
  { heightMin: 31.0, heightMax: 33.0, weightMin: 1350, weightMax: 1550 },
  { heightMin: 33.0, heightMax: 35.0, weightMin: 1550, weightMax: 1750 },
  { heightMin: 35.0, heightMax: 37.0, weightMin: 1750, weightMax: 2000 },
  { heightMin: 37.0, heightMax: 39.0, weightMin: 2000, weightMax: 2250 },
  { heightMin: 39.0, heightMax: 41.0, weightMin: 2250, weightMax: 2500 },
  { heightMin: 41.0, heightMax: 43.0, weightMin: 2500, weightMax: 2750 },
  { heightMin: 43.0, heightMax: 45.0, weightMin: 2750, weightMax: 2950 },
  { heightMin: 45.0, heightMax: 47.0, weightMin: 2950, weightMax: 3100 },
  { heightMin: 47.0, heightMax: 49.0, weightMin: 3100, weightMax: 3250 },
  { heightMin: 49.0, heightMax: 50.5, weightMin: 3250, weightMax: 3400 },
  { heightMin: 50.0, heightMax: 52.0, weightMin: 3300, weightMax: 3600 },
  { heightMin: 50.5, heightMax: 53.0, weightMin: 3400, weightMax: 3800 },
];

const TRIMESTER_BABY_KEYS = {
  1: [
    'pregnancy.content.t1.baby_1',
    'pregnancy.content.t1.baby_2',
    'pregnancy.content.t1.baby_3',
    'pregnancy.content.t1.baby_4',
  ],
  2: [
    'pregnancy.content.t2.baby_1',
    'pregnancy.content.t2.baby_2',
    'pregnancy.content.t2.baby_3',
    'pregnancy.content.t2.baby_4',
  ],
  3: [
    'pregnancy.content.t3.baby_1',
    'pregnancy.content.t3.baby_2',
    'pregnancy.content.t3.baby_3',
    'pregnancy.content.t3.baby_4',
  ],
};

const TRIMESTER_MOTHER_KEYS = {
  1: [
    'pregnancy.content.t1.mother_1',
    'pregnancy.content.t1.mother_2',
    'pregnancy.content.t1.mother_3',
    'pregnancy.content.t1.mother_4',
  ],
  2: [
    'pregnancy.content.t2.mother_1',
    'pregnancy.content.t2.mother_2',
    'pregnancy.content.t2.mother_3',
    'pregnancy.content.t2.mother_4',
  ],
  3: [
    'pregnancy.content.t3.mother_1',
    'pregnancy.content.t3.mother_2',
    'pregnancy.content.t3.mother_3',
    'pregnancy.content.t3.mother_4',
  ],
};

const WEEK_BABY_OVERRIDE_KEYS = {
  8: ['pregnancy.content.w8.baby_1', 'pregnancy.content.w8.baby_2', 'pregnancy.content.w8.baby_3', 'pregnancy.content.w8.baby_4'],
  12: ['pregnancy.content.w12.baby_1', 'pregnancy.content.w12.baby_2', 'pregnancy.content.w12.baby_3', 'pregnancy.content.w12.baby_4'],
  16: ['pregnancy.content.w16.baby_1', 'pregnancy.content.w16.baby_2', 'pregnancy.content.w16.baby_3', 'pregnancy.content.w16.baby_4'],
  20: ['pregnancy.content.w20.baby_1', 'pregnancy.content.w20.baby_2', 'pregnancy.content.w20.baby_3', 'pregnancy.content.w20.baby_4'],
  24: ['pregnancy.content.w24.baby_1', 'pregnancy.content.w24.baby_2', 'pregnancy.content.w24.baby_3', 'pregnancy.content.w24.baby_4'],
  28: ['pregnancy.content.w28.baby_1', 'pregnancy.content.w28.baby_2', 'pregnancy.content.w28.baby_3', 'pregnancy.content.w28.baby_4'],
  32: ['pregnancy.content.w32.baby_1', 'pregnancy.content.w32.baby_2', 'pregnancy.content.w32.baby_3', 'pregnancy.content.w32.baby_4'],
  36: ['pregnancy.content.w36.baby_1', 'pregnancy.content.w36.baby_2', 'pregnancy.content.w36.baby_3', 'pregnancy.content.w36.baby_4'],
  40: ['pregnancy.content.w40.baby_1', 'pregnancy.content.w40.baby_2', 'pregnancy.content.w40.baby_3', 'pregnancy.content.w40.baby_4'],
};

const WEEK_MOTHER_OVERRIDE_KEYS = {
  8: ['pregnancy.content.w8.mother_1', 'pregnancy.content.w8.mother_2', 'pregnancy.content.w8.mother_3', 'pregnancy.content.w8.mother_4'],
  12: ['pregnancy.content.w12.mother_1', 'pregnancy.content.w12.mother_2', 'pregnancy.content.w12.mother_3', 'pregnancy.content.w12.mother_4'],
  20: ['pregnancy.content.w20.mother_1', 'pregnancy.content.w20.mother_2', 'pregnancy.content.w20.mother_3', 'pregnancy.content.w20.mother_4'],
  28: ['pregnancy.content.w28.mother_1', 'pregnancy.content.w28.mother_2', 'pregnancy.content.w28.mother_3', 'pregnancy.content.w28.mother_4'],
  36: ['pregnancy.content.w36.mother_1', 'pregnancy.content.w36.mother_2', 'pregnancy.content.w36.mother_3', 'pregnancy.content.w36.mother_4'],
};

const DAY_BABY_HINT_KEYS = [
  'pregnancy.content.day_baby_0',
  'pregnancy.content.day_baby_1',
  'pregnancy.content.day_baby_2',
  'pregnancy.content.day_baby_3',
  'pregnancy.content.day_baby_4',
  'pregnancy.content.day_baby_5',
  'pregnancy.content.day_baby_6',
];

const DAY_MOTHER_HINT_KEYS = [
  'pregnancy.content.day_mother_0',
  'pregnancy.content.day_mother_1',
  'pregnancy.content.day_mother_2',
  'pregnancy.content.day_mother_3',
  'pregnancy.content.day_mother_4',
  'pregnancy.content.day_mother_5',
  'pregnancy.content.day_mother_6',
];

function trimesterForWeek(week) {
  if (week <= 12) return 1;
  if (week <= 27) return 2;
  return 3;
}

function baseBabyMilestoneKeys(week) {
  if (WEEK_BABY_OVERRIDE_KEYS[week]) return WEEK_BABY_OVERRIDE_KEYS[week];
  return TRIMESTER_BABY_KEYS[trimesterForWeek(week)];
}

function baseMotherTipKeys(week) {
  if (WEEK_MOTHER_OVERRIDE_KEYS[week]) return WEEK_MOTHER_OVERRIDE_KEYS[week];
  return TRIMESTER_MOTHER_KEYS[trimesterForWeek(week)];
}

function dayBabyHintKey(day) {
  return DAY_BABY_HINT_KEYS[day] || DAY_BABY_HINT_KEYS[0];
}

function dayMotherHintKey(day) {
  return DAY_MOTHER_HINT_KEYS[day] || DAY_MOTHER_HINT_KEYS[0];
}

module.exports = {
  PREGNANCY_WEEK_METRICS,
  baseBabyMilestoneKeys,
  baseMotherTipKeys,
  dayBabyHintKey,
  dayMotherHintKey,
};
