const express = require('express');
const { revenuecatWebhookAuthorization } = require('../config/env');
const { asyncHandler } = require('../lib/asyncHandler');
const { processRevenueCatEvent } = require('../services/subscriptionService');

const router = express.Router();

function authorizeWebhook(req, res, next) {
  const expected = revenuecatWebhookAuthorization;
  if (!expected) {
    console.error('[revenuecat] REVENUECAT_WEBHOOK_AUTHORIZATION tanımlı değil');
    return res.status(500).json({ error: 'webhook_not_configured' });
  }

  const header = req.get('Authorization') || '';
  if (header !== expected) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}

/**
 * RevenueCat Dashboard → Integrations → Webhooks
 * URL: https://<api>/api/webhooks/revenuecat
 * Authorization header: REVENUECAT_WEBHOOK_AUTHORIZATION ile aynı değer
 *
 * Trial akışı:
 * - INITIAL_PURCHASE (period_type=TRIAL) → is_premium=1
 * - RENEWAL (trial sonrası ücretli dönem) → is_premium=1
 * - EXPIRATION → is_premium=0
 */
router.post(
  '/revenuecat',
  authorizeWebhook,
  asyncHandler(async (req, res) => {
    const result = await processRevenueCatEvent(req.body);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    // RevenueCat 200 bekler; duplicate'lerde de 200 dön.
    res.status(200).json(result);
  }),
);

module.exports = router;
