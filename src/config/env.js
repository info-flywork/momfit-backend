const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const backendRoot = path.join(__dirname, '../..');

function resolveFirebaseServiceAccountPath() {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const candidates = [];

  if (configured) {
    candidates.push(
      path.isAbsolute(configured)
        ? configured
        : path.join(backendRoot, configured),
    );
  }

  candidates.push(path.join(backendRoot, 'firebase-service-account.json'));

  try {
    const adminsdkFiles = fs
      .readdirSync(backendRoot)
      .filter((name) => name.endsWith('.json') && name.includes('firebase-adminsdk'))
      .map((name) => path.join(backendRoot, name));
    candidates.push(...adminsdkFiles);
  } catch (_) {
    // backendRoot okunamazsa yalnızca yapılandırılmış yollar denenir.
  }

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Eksik ortam değişkeni: ${key}`);
  }
}

module.exports = {
  port: Number(process.env.PORT || 3000),
  cdnBase: process.env.CDN_BASE_URL || 'https://momfit.b-cdn.net',
  cdnStorageZone: process.env.CDN_STORAGE_ZONE || 'momfit',
  cdnStorageApiKey: process.env.CDN_STORAGE_API_KEY || null,
  cdnEnabled: process.env.CDN_ENABLED !== 'false',
  maxWeekAnimalOnCdn: Number(process.env.CDN_MAX_WEEK_ANIMAL || 41),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+00:00',
  },
  firebaseServiceAccountPath: resolveFirebaseServiceAccountPath(),
  openaiApiKey: process.env.OPENAI_API_KEY || null,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  /** RevenueCat Dashboard webhook Authorization header ile birebir aynı olmalı */
  revenuecatWebhookAuthorization:
    process.env.REVENUECAT_WEBHOOK_AUTHORIZATION || null,
};
