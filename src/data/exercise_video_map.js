/**
 * CDN video klasörleri (Bunny paneldeki Türkçe klasör adları).
 * Göreli yol: exercies_videos/{Klasör}/{dosya}
 */
const VIDEO_CDN_FOLDERS = {
  cardio: 'exercies_videos/Kardiyo',
  pilates: 'exercies_videos/Pilates',
  meditation: 'exercies_videos/Meditasyon',
  yoga: 'exercies_videos/Yoga',
};

/**
 * exercise id → CDN dosya adı (slugFromTitleKey ile üretilen id'ler).
 * breath kategorisi: supports_video=0, video atanmaz.
 */
const VIDEO_FILES = {
  // Kardiyo
  cardio_dumbbell_arm: 'Dambıl Kol Egzersizi.mov',
  cardio_four_foot_balance: 'Dört Ayak Denge Hareketi.mov',
  cardio_chair_arm: 'Koltuk Destekli Kol Egzersizi.mov',
  cardio_treadmill_walk: 'Koşu Bandında Yürüyüş.mov',
  cardio_sit_leg: 'Oturarak Bacak Egzersizi.mp4',
  cardio_sit_arm_wrist: 'Oturarak Kol ve Bilek Isınması.mp4',
  cardio_sit_side: 'Oturarak Yan Esneme.mp4',
  cardio_ball_arm: 'Top Üzerinde Kol Egzersizi.mp4',
  cardio_ball_side: 'Top Üzerinde Yan Esneme.mov',
  cardio_floor_side: 'Yerde Yan Esneme.mov',

  // Pilates
  pilates_supported_bridge_move: 'Destekli Köprü Hareketi.mov',
  pilates_supported_bridge_pose: 'Destekli Köprü Pozu.mp4',
  pilates_post_recovery: 'Egzersiz Sonrası Toparlanma.mp4',
  pilates_ball_chest_stretch: 'Top Destekli Göğüs Esnetme.mov',
  pilates_four_foot_leg_raise: 'Dört Ayakta Destekli Bacak Kaldırma.mov',
  pilates_ball_dumbbell_arm: 'Top Üzerinde Dambıl Kol Egzersizi.mov',
  pilates_ball_dumbbell_shoulder: 'Top Üzerinde Dambıl Omuz Egzersizi.mp4',
  pilates_ball_pelvic_circle: 'Top Üzerinde Pelvik Daire.mov',
  pilates_side_lying_leg_raise: 'Yan Yatış Bacak Kaldırma.mov',

  // Meditasyon
  meditation_calm_breath: 'Sakin Nefes Meditasyonu.mp4',
  meditation_restful_sleep: null,
  meditation_bond_baby: 'Anne-Bebek Bağ Meditasyonu.mov',
  meditation_end_of_day: 'Gün Sonu Rahatlama Meditasyonu.mov',
  meditation_birth_prep: 'Anne-Bebek Bağ Nefesi.mov',
  meditation_inner_peace: 'İç Huzur Meditasyonu.mov',
  meditation_seated: 'Bağdaş Kurarak Meditasyon.mov',

  // Yoga
  yoga_standing_arm_open: 'Ayakta Kol Açma Hareketi.mov',
  yoga_seated_neck: 'Oturarak Boyun Esnetme.mov',
  yoga_four_foot_leg_extend: 'Dört Ayak Bacak Uzatma.mov',
  yoga_seated_arm_open: 'Oturarak Kol Açma Hareketi.mp4',
  yoga_supported_seated_side: 'Destekli Oturarak Yan Esneme.mov',
  yoga_seated_arm_circle: 'Oturarak Kol Dairesi.mov',
  yoga_seated_torso_side: 'Oturarak Yan Gövde Esnetme.mov',
  yoga_partner_balance: 'Partner Destekli Denge Hareketi.mov',
};

function videoPathForExercise(exerciseId, categoryId) {
  if (categoryId === 'breath') return null;
  const folder = VIDEO_CDN_FOLDERS[categoryId];
  const file = VIDEO_FILES[exerciseId];
  if (!folder || !file) return null;
  return `${folder}/${file}`;
}

module.exports = { VIDEO_CDN_FOLDERS, VIDEO_FILES, videoPathForExercise };
