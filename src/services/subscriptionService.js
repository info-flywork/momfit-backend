const { query } = require('../config/db');

const ENTITLEMENT_ID = 'MomFit Pro';

/** Premium erişim veren / koruyan event tipleri */
const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'REFUND_REVERSED',
]);

/** Erişimi kaldıran event tipleri */
const REVOKE_EVENTS = new Set(['EXPIRATION']);

function msToDate(ms) {
  if (ms == null || Number.isNaN(Number(ms))) return null;
  return new Date(Number(ms));
}

function hasMomFitProEntitlement(event) {
  const ids = event.entitlement_ids;
  if (Array.isArray(ids) && ids.includes(ENTITLEMENT_ID)) return true;
  if (event.entitlement_id === ENTITLEMENT_ID) return true;
  // Entitlement listesi boşsa (bazı store olayları) product bazlı grant varsay.
  if (!ids || ids.length === 0) return true;
  return false;
}

/**
 * RC app_user_id bizim users.id ile aynı tutuluyor (Firebase / guest id).
 * Alias varsa hepsini dene.
 */
async function resolveUserId(event) {
  const candidates = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ].filter((id) => typeof id === 'string' && id.length > 0);

  for (const id of candidates) {
    const rows = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [id]);
    if (rows.length) return rows[0].id;
  }

  // Kullanıcı henüz sync olmamış olabilir — app_user_id ile kaydetmeye devam et.
  return candidates[0] || null;
}

/** Event daha önce işlendi mi? */
async function wasEventProcessed(eventId) {
  const rows = await query(
    'SELECT event_id FROM revenuecat_webhook_events WHERE event_id = ? LIMIT 1',
    [eventId],
  );
  return rows.length > 0;
}

async function markEventProcessed(eventId, eventType, appUserId, payload) {
  await query(
    `INSERT IGNORE INTO revenuecat_webhook_events (event_id, event_type, app_user_id, payload)
     VALUES (?, ?, ?, ?)`,
    [eventId, eventType, appUserId, JSON.stringify(payload)],
  );
}

async function grantPremium(userId, event) {
  const expiresAt = msToDate(event.expiration_at_ms);
  await query(
    `UPDATE users SET
       is_premium = 1,
       premium_product_id = ?,
       premium_period_type = ?,
       premium_expires_at = ?,
       premium_updated_at = CURRENT_TIMESTAMP,
       revenuecat_app_user_id = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      event.product_id || null,
      event.period_type || null,
      expiresAt,
      event.app_user_id || userId,
      userId,
    ],
  );
}

async function revokePremium(userId, event) {
  await query(
    `UPDATE users SET
       is_premium = 0,
       premium_product_id = COALESCE(?, premium_product_id),
       premium_period_type = ?,
       premium_expires_at = ?,
       premium_updated_at = CURRENT_TIMESTAMP,
       revenuecat_app_user_id = COALESCE(?, revenuecat_app_user_id),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      event.product_id || null,
      event.period_type || null,
      msToDate(event.expiration_at_ms),
      event.app_user_id || null,
      userId,
    ],
  );
}

/**
 * Trial: INITIAL_PURCHASE + period_type=TRIAL → premium açık.
 * Trial sonrası ücretli dönem: RENEWAL → premium açık (period_type=NORMAL).
 * Bitiş: EXPIRATION → premium kapalı.
 * İptal (CANCELLATION): dönem sonuna kadar erişim kalır — revoke etme.
 */
async function processRevenueCatEvent(payload) {
  const event = payload?.event;
  if (!event || typeof event !== 'object') {
    return { ok: false, reason: 'missing_event' };
  }

  const eventId = event.id;
  const eventType = event.type;
  if (!eventId || !eventType) {
    return { ok: false, reason: 'missing_event_id_or_type' };
  }

  if (await wasEventProcessed(eventId)) {
    return { ok: true, duplicate: true, eventType };
  }

  if (eventType === 'TEST') {
    await markEventProcessed(
      eventId,
      eventType,
      event.app_user_id || null,
      payload,
    );
    return { ok: true, eventType, skipped: true };
  }

  const userId = await resolveUserId(event);
  if (!userId) {
    await markEventProcessed(
      eventId,
      eventType,
      event.app_user_id || null,
      payload,
    );
    return { ok: true, eventType, skipped: true, reason: 'user_not_found' };
  }

  const existing = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [
    userId,
  ]);
  if (!existing.length) {
    await markEventProcessed(eventId, eventType, userId, payload);
    return { ok: true, eventType, skipped: true, reason: 'user_not_synced' };
  }

  if (REVOKE_EVENTS.has(eventType)) {
    if (hasMomFitProEntitlement(event) || !event.entitlement_ids) {
      await revokePremium(userId, event);
    }
  } else if (GRANT_EVENTS.has(eventType)) {
    if (hasMomFitProEntitlement(event)) {
      await grantPremium(userId, event);
    }
  }
  // CANCELLATION / BILLING_ISSUE / SUBSCRIPTION_PAUSED: erişimi şimdi kaldırma

  await markEventProcessed(eventId, eventType, userId, payload);

  return {
    ok: true,
    eventType,
    userId,
    periodType: event.period_type || null,
    isTrial: event.period_type === 'TRIAL',
  };
}

module.exports = {
  ENTITLEMENT_ID,
  processRevenueCatEvent,
};
