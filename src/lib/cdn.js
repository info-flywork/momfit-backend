const https = require('https');
const {
  cdnBase,
  cdnEnabled,
  maxWeekAnimalOnCdn,
  cdnStorageZone,
  cdnStorageApiKey,
} = require('../config/env');

/** Türkçe karakter ve boşluk içeren CDN yollarını güvenli URL'ye çevirir. */
function cdnUrl(relativePath) {
  if (!cdnEnabled || !relativePath) return null;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  // Bunny CDN dosya adları NFD (decomposed) Unicode kullanıyor; NFC yollar 404 verir.
  const nfdPath = relativePath.normalize('NFD');
  const encoded = nfdPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${cdnBase}/${encoded}`;
}

function cdnPicture(fileName) {
  return cdnUrl(`pictures/${fileName}`);
}

function cdnExercise(category, fileName) {
  return cdnUrl(`exercies/${category}/${fileName}`);
}

function cdnVideo(fileName) {
  return cdnUrl(`videos/${fileName}`);
}

function cdnWeekAnimal(week) {
  return cdnUrl(`animals/${week}.png`);
}

function cdnWeekImage(week) {
  return cdnUrl(`pictures/week_${week}.png`);
}

function weekAnimalAvailable(week) {
  return cdnEnabled && week >= 1 && week <= maxWeekAnimalOnCdn;
}

function storagePath(relativePath) {
  const clean = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `/${cdnStorageZone}/${clean
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')}`;
}

function uploadToCdn(relativePath, buffer, contentType = 'application/octet-stream') {
  if (!cdnEnabled) {
    return Promise.reject(new Error('CDN devre dışı'));
  }
  if (!cdnStorageApiKey) {
    return Promise.reject(new Error('CDN_STORAGE_API_KEY eksik'));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'PUT',
        host: 'storage.bunnycdn.com',
        path: storagePath(relativePath),
        headers: {
          AccessKey: cdnStorageApiKey,
          'Content-Type': contentType,
          'Content-Length': buffer.length,
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(cdnUrl(relativePath));
          return;
        }
        reject(new Error(`CDN upload başarısız (${res.statusCode})`));
      },
    );
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

module.exports = {
  cdnUrl,
  cdnPicture,
  cdnExercise,
  cdnVideo,
  cdnWeekAnimal,
  cdnWeekImage,
  weekAnimalAvailable,
  uploadToCdn,
};
