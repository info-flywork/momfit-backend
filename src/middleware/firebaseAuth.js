const fs = require('fs');
const admin = require('firebase-admin');
const { firebaseServiceAccountPath } = require('../config/env');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  if (!firebaseServiceAccountPath || !fs.existsSync(firebaseServiceAccountPath)) {
    console.warn(
      '[firebase] Service account dosyası yok — korumalı endpoint\'ler çalışmaz.',
    );
    return null;
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(firebaseServiceAccountPath, 'utf8'),
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  console.log('[firebase] Service account yüklendi.');
  return admin;
}

async function verifyIdToken(req, res, next) {
  const adminApp = initFirebase();
  if (!adminApp) {
    return res.status(503).json({
      error: 'firebase_not_configured',
      message: 'Firebase service account dosyası eklenmeli.',
    });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  try {
    req.firebaseUser = await adminApp.auth().verifyIdToken(token);
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'invalid_token',
      message: err.message,
    });
  }
}

module.exports = { initFirebase, verifyIdToken };
