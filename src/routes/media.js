const express = require('express');
const { cdnEnabled, maxWeekAnimalOnCdn } = require('../config/env');
const {
  cdnUrl,
  cdnWeekAnimal,
  cdnWeekImage,
  weekAnimalAvailable,
} = require('../lib/cdn');
const {
  STATIC_MEDIA,
  weekImagePath,
  weekAnimalPath,
  exercisePath,
} = require('../data/static_media');

const router = express.Router();

function mapAssetUrls() {
  const assets = {};
  for (const [key, path] of Object.entries(STATIC_MEDIA)) {
    assets[key] = cdnEnabled ? cdnUrl(path) : null;
  }
  return assets;
}

function mapWeekAnimalUrls() {
  const weekAnimals = {};
  if (!cdnEnabled) return weekAnimals;

  for (let week = 1; week <= maxWeekAnimalOnCdn; week += 1) {
    weekAnimals[String(week)] = cdnWeekAnimal(week);
  }
  return weekAnimals;
}

/** Uygulama açılışında tek seferde yüklenen medya yapılandırması. */
router.get('/', (_req, res) => {
  res.json({
    enabled: cdnEnabled,
    maxWeekAnimalOnCdn,
    assets: mapAssetUrls(),
    weekAnimals: mapWeekAnimalUrls(),
  });
});

/** Tek bir statik medya anahtarı için URL. */
router.get('/assets/:key', (req, res) => {
  const path = STATIC_MEDIA[req.params.key];
  if (!path) {
    return res.status(404).json({ error: 'asset_not_found' });
  }

  res.json({
    key: req.params.key,
    path,
    url: cdnEnabled ? cdnUrl(path) : null,
  });
});

/** Göreli yol → tam CDN URL (egzersiz dışı dinamik yollar için). */
router.get('/url', (req, res) => {
  const { path } = req.query;
  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'path_required' });
  }

  res.json({
    path,
    url: cdnEnabled ? cdnUrl(path) : null,
  });
});

router.get('/week-animal/:week', (req, res) => {
  const week = Number.parseInt(req.params.week, 10);
  if (!Number.isFinite(week) || week < 1) {
    return res.status(400).json({ error: 'invalid_week' });
  }

  res.json({
    week,
    path: weekAnimalPath(week),
    available: weekAnimalAvailable(week),
    url: weekAnimalAvailable(week) ? cdnWeekAnimal(week) : null,
  });
});

router.get('/week-image/:week', (req, res) => {
  const week = Number.parseInt(req.params.week, 10);
  if (!Number.isFinite(week) || week < 1) {
    return res.status(400).json({ error: 'invalid_week' });
  }

  res.json({
    week,
    path: weekImagePath(week),
    url: cdnEnabled ? cdnWeekImage(week) : null,
  });
});

router.get('/exercise/:category/:fileName', (req, res) => {
  const { category, fileName } = req.params;
  const path = exercisePath(category, fileName);

  res.json({
    category,
    fileName,
    path,
    url: cdnEnabled ? cdnUrl(path) : null,
  });
});

module.exports = router;
