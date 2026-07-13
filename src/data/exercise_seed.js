/** Uygulama exercise_catalog.dart ile birebir eşleşen seed verisi */

const { videoPathForExercise } = require('./exercise_video_map');

function slugFromTitleKey(titleKey) {
  // exercises.cardio.dumbbell_arm_title → cardio_dumbbell_arm
  const parts = titleKey.replace('_title', '').split('.');
  return parts.slice(1).join('_');
}

function toCdnPath(assetPath) {
  return assetPath.replace(/^assets\//, '');
}

const categories = [
  {
    id: 'cardio',
    icon_path: 'icons/cardio.png',
    title_key: 'program.cardio_tag',
    subtitle_key: 'program.cardio_subtitle',
    cdn_folder: 'exercies/cardio',
    supports_video: 1,
    sort_order: 1,
  },
  {
    id: 'breath',
    icon_path: 'icons/breath.png',
    title_key: 'program.breath_tag',
    subtitle_key: 'program.breath_subtitle',
    cdn_folder: 'exercies/breath',
    supports_video: 0,
    sort_order: 2,
  },
  {
    id: 'pilates',
    icon_path: 'icons/pillates.png',
    title_key: 'program.pilates_tag',
    subtitle_key: 'program.pilates_subtitle',
    cdn_folder: 'exercies/pilates',
    supports_video: 1,
    sort_order: 3,
  },
  {
    id: 'meditation',
    icon_path: 'icons/meditation.png',
    title_key: 'program.meditation_tag',
    subtitle_key: 'program.meditation_subtitle',
    cdn_folder: 'exercies/meditation',
    supports_video: 1,
    sort_order: 4,
  },
  {
    id: 'yoga',
    icon_path: 'icons/yogaa.png',
    title_key: 'program.yoga_tag',
    subtitle_key: 'program.yoga_subtitle',
    cdn_folder: 'exercies/yoga',
    supports_video: 1,
    sort_order: 5,
  },
];

const rawExercises = [
  // cardio
  ['cardio', 'exercises.cardio.dumbbell_arm_title', 'exercises.cardio.dumbbell_arm_desc', 'assets/exercies/cardio/dumbell.jpg', 12, 85, 60],
  ['cardio', 'exercises.cardio.four_foot_balance_title', 'exercises.cardio.four_foot_balance_desc', 'assets/exercies/cardio/four_foot.png', 10, 70, 50],
  ['cardio', 'exercises.cardio.chair_arm_title', 'exercises.cardio.chair_arm_desc', 'assets/exercies/cardio/support_arm.png', 10, 65, 45],
  ['cardio', 'exercises.cardio.treadmill_walk_title', 'exercises.cardio.treadmill_walk_desc', 'assets/exercies/cardio/walks.png', 20, 120, 55],
  ['cardio', 'exercises.cardio.sit_leg_title', 'exercises.cardio.sit_leg_desc', 'assets/exercies/cardio/sit_foot.jpg', 8, 50, 40],
  ['cardio', 'exercises.cardio.sit_arm_wrist_title', 'exercises.cardio.sit_arm_wrist_desc', 'assets/exercies/cardio/sit_arm.jpg', 8, 45, 35],
  ['cardio', 'exercises.cardio.sit_side_title', 'exercises.cardio.sit_side_desc', 'assets/exercies/cardio/sit_side.jpg', 10, 55, 40],
  ['cardio', 'exercises.cardio.ball_arm_title', 'exercises.cardio.ball_arm_desc', 'assets/exercies/cardio/ball_arm.png', 12, 75, 55],
  ['cardio', 'exercises.cardio.ball_side_title', 'exercises.cardio.ball_side_desc', 'assets/exercies/cardio/ball_side.jpg', 12, 70, 50],
  ['cardio', 'exercises.cardio.floor_side_title', 'exercises.cardio.floor_side_desc', 'assets/exercies/cardio/floor_side.png', 10, 60, 45],
  // breath
  ['breath', 'exercises.breath.deep_belly_title', 'exercises.breath.deep_belly_desc', 'assets/exercies/breath/deep_stoma.jpg', 8, 20, 20],
  ['breath', 'exercises.breath.recovery_title', 'exercises.breath.recovery_desc', 'assets/exercies/breath/regen.jpg', 10, 25, 20],
  ['breath', 'exercises.breath.diaphragm_title', 'exercises.breath.diaphragm_desc', 'assets/exercies/breath/diafram.jpg', 8, 20, 20],
  ['breath', 'exercises.breath.controlled_title', 'exercises.breath.controlled_desc', 'assets/exercies/breath/controll_breath.png', 10, 25, 25],
  ['breath', 'exercises.breath.method_478_title', 'exercises.breath.method_478_desc', 'assets/exercies/breath/4-7-8.png', 10, 15, 15],
  ['breath', 'exercises.breath.reduce_stress_title', 'exercises.breath.reduce_stress_desc', 'assets/exercies/breath/stress.jpg', 12, 20, 20],
  ['breath', 'exercises.breath.before_sleep_title', 'exercises.breath.before_sleep_desc', 'assets/exercies/breath/before_sleep.jpg', 15, 15, 10],
  ['breath', 'exercises.breath.birth_prep_title', 'exercises.breath.birth_prep_desc', 'assets/exercies/breath/preparation.png', 12, 20, 20],
  ['breath', 'exercises.breath.fatigue_title', 'exercises.breath.fatigue_desc', 'assets/exercies/breath/tired.jpg', 10, 15, 15],
  ['breath', 'exercises.breath.peaceful_sleep_title', 'exercises.breath.peaceful_sleep_desc', 'assets/exercies/breath/peacefull_sleep.jpg', 15, 15, 10],
  // pilates
  ['pilates', 'exercises.pilates.supported_bridge_move_title', 'exercises.pilates.supported_bridge_move_desc', 'assets/exercies/pilates/support_breach.png', 12, 70, 50],
  ['pilates', 'exercises.pilates.supported_bridge_pose_title', 'exercises.pilates.supported_bridge_pose_desc', 'assets/exercies/pilates/support_poze.png', 10, 65, 45],
  ['pilates', 'exercises.pilates.post_recovery_title', 'exercises.pilates.post_recovery_desc', 'assets/exercies/pilates/after_exercise.png', 8, 40, 30],
  ['pilates', 'exercises.pilates.ball_chest_stretch_title', 'exercises.pilates.ball_chest_stretch_desc', 'assets/exercies/pilates/support_ball.png', 10, 50, 35],
  ['pilates', 'exercises.pilates.four_foot_leg_raise_title', 'exercises.pilates.four_foot_leg_raise_desc', 'assets/exercies/pilates/four.png', 12, 75, 55],
  ['pilates', 'exercises.pilates.ball_dumbbell_arm_title', 'exercises.pilates.ball_dumbbell_arm_desc', 'assets/exercies/pilates/ball_dumbell_arm.png', 12, 80, 55],
  ['pilates', 'exercises.pilates.ball_dumbbell_shoulder_title', 'exercises.pilates.ball_dumbbell_shoulder_desc', 'assets/exercies/pilates/ball_dumbell_omuz.png', 12, 75, 50],
  ['pilates', 'exercises.pilates.ball_pelvic_circle_title', 'exercises.pilates.ball_pelvic_circle_desc', 'assets/exercies/pilates/pelvis.png', 10, 60, 40],
  ['pilates', 'exercises.pilates.side_lying_leg_raise_title', 'exercises.pilates.side_lying_leg_raise_desc', 'assets/exercies/pilates/stand_knee.png', 12, 70, 50],
  // meditation
  ['meditation', 'exercises.meditation.calm_breath_title', 'exercises.meditation.calm_breath_desc', 'assets/exercies/meditation/chill_breath.jpg', 10, 15, 10],
  ['meditation', 'exercises.meditation.restful_sleep_title', 'exercises.meditation.restful_sleep_desc', 'assets/exercies/meditation/chill_sleep.jpg', 15, 15, 10],
  ['meditation', 'exercises.meditation.bond_baby_title', 'exercises.meditation.bond_baby_desc', 'assets/exercies/meditation/contact_baby.jpg', 12, 15, 10],
  ['meditation', 'exercises.meditation.end_of_day_title', 'exercises.meditation.end_of_day_desc', 'assets/exercies/meditation/en_of_day.jpg', 10, 15, 10],
  ['meditation', 'exercises.meditation.birth_prep_title', 'exercises.meditation.birth_prep_desc', 'assets/exercies/meditation/preparation.jpg', 12, 20, 15],
  ['meditation', 'exercises.meditation.inner_peace_title', 'exercises.meditation.inner_peace_desc', 'assets/exercies/meditation/self_peace.jpg', 12, 15, 10],
  ['meditation', 'exercises.meditation.seated_title', 'exercises.meditation.seated_desc', 'assets/exercies/meditation/sit_meditation.jpg', 10, 15, 10],
  // yoga
  ['yoga', 'exercises.yoga.standing_arm_open_title', 'exercises.yoga.standing_arm_open_desc', 'assets/exercies/yoga/arm_open.png', 10, 55, 40],
  ['yoga', 'exercises.yoga.seated_neck_title', 'exercises.yoga.seated_neck_desc', 'assets/exercies/yoga/neck.jpg', 8, 35, 25],
  ['yoga', 'exercises.yoga.four_foot_leg_extend_title', 'exercises.yoga.four_foot_leg_extend_desc', 'assets/exercies/yoga/4_knee.jpg', 12, 65, 45],
  ['yoga', 'exercises.yoga.seated_arm_open_title', 'exercises.yoga.seated_arm_open_desc', 'assets/exercies/yoga/armp_open_sit.jpg', 10, 50, 35],
  ['yoga', 'exercises.yoga.supported_seated_side_title', 'exercises.yoga.supported_seated_side_desc', 'assets/exercies/yoga/support_side.png', 10, 45, 30],
  ['yoga', 'exercises.yoga.seated_arm_circle_title', 'exercises.yoga.seated_arm_circle_desc', 'assets/exercies/yoga/sit_circle.png', 8, 40, 30],
  ['yoga', 'exercises.yoga.seated_torso_side_title', 'exercises.yoga.seated_torso_side_desc', 'assets/exercies/yoga/sit_side.png', 10, 45, 35],
  ['yoga', 'exercises.yoga.partner_balance_title', 'exercises.yoga.partner_balance_desc', 'assets/exercies/yoga/partner.png', 12, 60, 40],
];

const exercises = [];
const sortByCategory = {};

for (const row of rawExercises) {
  const [categoryId, titleKey, descriptionKey, image, duration, calories, intensity] = row;
  sortByCategory[categoryId] = (sortByCategory[categoryId] || 0) + 1;

  const id = slugFromTitleKey(titleKey);

  exercises.push({
    id,
    category_id: categoryId,
    title_key: titleKey,
    description_key: descriptionKey,
    image_path: toCdnPath(image),
    video_path: videoPathForExercise(id, categoryId),
    duration_minutes: duration,
    calories,
    intensity_percent: intensity,
    sort_order: sortByCategory[categoryId],
  });
}

module.exports = { categories, exercises };
