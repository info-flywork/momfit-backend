const express = require('express');
const { query } = require('../config/db');
const { verifyUser } = require('../middleware/userAuth');
const { ensureUserRecord } = require('../middleware/ensureUser');

const router = express.Router();

let tableReady = false;
async function ensureNotificationsTable() {
  if (tableReady) return;
  await query(
    `CREATE TABLE IF NOT EXISTS user_notifications (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(128) NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_notifications_user_created (user_id, created_at DESC),
      CONSTRAINT fk_user_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
  tableReady = true;
}

router.use(verifyUser);
router.use(ensureUserRecord);

router.get('/', async (req, res) => {
  try {
    await ensureNotificationsTable();
    const rows = await query(
      `SELECT id, title, body, scheduled_at, created_at
       FROM user_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 200`,
      [req.userId],
    );
    res.json({
      notifications: rows.map((r) => ({
        id: Number(r.id),
        title: r.title,
        body: r.body,
        scheduledAt: r.scheduled_at || null,
        createdAt: r.created_at || null,
      })),
    });
  } catch (err) {
    console.error('[notifications/get]', err);
    res.status(500).json({ error: 'notifications_fetch_failed', message: err.message });
  }
});

router.post('/bulk-log', async (req, res) => {
  try {
    await ensureNotificationsTable();
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.json({ saved: 0 });

    let saved = 0;
    for (const item of items) {
      const title = typeof item?.title === 'string' ? item.title.trim() : '';
      const body = typeof item?.body === 'string' ? item.body.trim() : '';
      let scheduledAt = null;
      if (typeof item?.scheduled_at === 'string' && item.scheduled_at.trim().length > 0) {
        const d = new Date(item.scheduled_at);
        if (!Number.isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const mi = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          scheduledAt = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
        }
      }
      if (!title || !body) continue;
      await query(
        `INSERT INTO user_notifications (user_id, title, body, scheduled_at)
         VALUES (?, ?, ?, ?)`,
        [req.userId, title, body, scheduledAt],
      );
      saved += 1;
    }
    return res.json({ saved });
  } catch (err) {
    console.error('[notifications/bulk-log]', err);
    return res.status(500).json({ error: 'notifications_log_failed', message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureNotificationsTable();
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    await query(
      `DELETE FROM user_notifications
       WHERE id = ? AND user_id = ?`,
      [id, req.userId],
    );
    return res.json({ deleted: true });
  } catch (err) {
    console.error('[notifications/delete]', err);
    return res.status(500).json({ error: 'notifications_delete_failed', message: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    await ensureNotificationsTable();
    await query(`DELETE FROM user_notifications WHERE user_id = ?`, [req.userId]);
    return res.json({ cleared: true });
  } catch (err) {
    console.error('[notifications/clear]', err);
    return res.status(500).json({ error: 'notifications_clear_failed', message: err.message });
  }
});

module.exports = router;
