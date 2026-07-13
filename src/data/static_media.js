/**
 * Uygulama statik medya anahtarları → CDN göreli yolları.
 * Yerel `assets/` ile aynı klasör yapısı kullanılır.
 */
const STATIC_MEDIA = {
  onboarding1: 'pictures/onboarding_1.png',
  onboarding2: 'pictures/onboarding_2.png',
  onboarding3: 'pictures/onboarding_3.png',
  baby: 'pictures/baby.png',
  login: 'pictures/login.png',
  homeAnimalBg: 'pictures/home_animal_bg.png',
  homeExercise: 'pictures/home_exercise.png',
  babyPeriod: 'pictures/baby_period.png',
  yoga: 'pictures/yoga.png',
  pilates: 'pictures/pilates.png',
  meditation: 'pictures/meditation.png',
  cardio: 'pictures/cardio.png',
  nutrition: 'pictures/nutrition.png',
  mom1: 'pictures/mom_1.png',
  mom2: 'pictures/mom_2.png',
  mom3: 'pictures/mom_3.png',
  mom4: 'pictures/mom_4.png',
  babyProgress: 'pictures/baby_progress.png',
  analyzeWoman: 'pictures/analyze_woman.png',
  sampleExerciseVideo: 'videos/sample_exercise.mp4',
};

function weekImagePath(week) {
  return `pictures/week_${week}.png`;
}

function weekAnimalPath(week) {
  return `animals/${week}.png`;
}

function exercisePath(category, fileName) {
  return `exercies/${category}/${fileName}`;
}

module.exports = {
  STATIC_MEDIA,
  weekImagePath,
  weekAnimalPath,
  exercisePath,
};
