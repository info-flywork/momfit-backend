const express = require('express');
const { ping } = require('../config/db');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'momfit-api' });
});

router.get('/health/db', async (_req, res) => {
  try {
    const ok = await ping();
    res.json({ status: ok ? 'ok' : 'error', database: ok });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      database: false,
      message: err.message,
    });
  }
});

module.exports = router;
