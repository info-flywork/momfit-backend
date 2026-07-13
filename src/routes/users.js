const express = require('express');
const { query } = require('../config/db');
const { verifyUser } = require('../middleware/userAuth');
const { rowsToAnswers, answersToRows } = require('../lib/userAnswers');
const { upsertUser } = require('../lib/users');
const { uploadToCdn } = require('../lib/cdn');

const router = express.Router();

function slugifyName(name) {
  if (!name || typeof name !== 'string') return 'guest';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 10) || 'guest';
}

function guestEmail(name) {
  return `${slugifyName(name)}@momfit.com`;
}

function imageExtFromMime(mimeType) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

const DELETE_REASON_TR = {
  'delete_account.reason_1': 'Artık ihtiyacım yok.',
  'delete_account.reason_2': 'Çok pahalı.',
  'delete_account.reason_3': 'Kötü bir deneyim yaşadım.',
  'delete_account.reason_4': 'Başka bir hizmete geçiyorum.',
  'delete_account.reason_5': 'Diğer',
};

function toTurkishDeleteReason(reasonKey) {
  if (!reasonKey || typeof reasonKey !== 'string') return null;
  return DELETE_REASON_TR[reasonKey] || reasonKey;
}

router.post('/sync', verifyUser, async (req, res) => {
  const userId = req.userId;
  let email = null;
  let displayName = null;
  let photoUrl = null;

  if (req.authType === 'firebase') {
    const firebaseUser = req.firebaseUser;
    email = firebaseUser.email || null;
    displayName = firebaseUser.name || null;
    photoUrl = firebaseUser.picture || null;
  } else {
    displayName = req.body?.display_name || null;
    email = guestEmail(displayName || userId);
  }

  await upsertUser(userId, { email, displayName, photoUrl });

  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  res.json({ user: rows[0] });
});

router.get('/me', verifyUser, async (req, res) => {
  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [
    req.userId,
  ]);

  if (!rows.length) {
    return res.status(404).json({ error: 'user_not_found' });
  }

  res.json({ user: rows[0] });
});

router.delete('/me', verifyUser, async (req, res) => {
  if (req.authType !== 'guest') {
    return res.status(403).json({ error: 'guest_only' });
  }

  await query('DELETE FROM users WHERE id = ?', [req.userId]);
  res.json({ ok: true });
});

router.post('/delete-account', verifyUser, async (req, res) => {
  const userId = req.userId;
  const reasonKeyRaw =
    typeof req.body?.reason_key === 'string' ? req.body.reason_key : null;
  const reasonKey = toTurkishDeleteReason(reasonKeyRaw);
  const reasonText =
    typeof req.body?.reason_text === 'string' ? req.body.reason_text : null;

  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  const user = rows[0] || {};

  await query(
    `INSERT INTO account_deletion_feedback
      (user_id, auth_type, email, display_name, reason_key, reason_text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      req.authType === 'guest' ? 'guest' : 'firebase',
      user.email || null,
      user.display_name || null,
      reasonKey,
      reasonText || null,
    ],
  );

  await query('DELETE FROM users WHERE id = ?', [userId]);
  return res.json({ deleted: true });
});

router.get('/answers', verifyUser, async (req, res) => {
  const rows = await query(
    `SELECT flow, question_key, answer_value
     FROM user_onboarding_answers
     WHERE user_id = ?
     ORDER BY answered_at ASC`,
    [req.userId],
  );

  if (!rows.length) {
    return res.json({ answers: null });
  }

  res.json({ answers: rowsToAnswers(rows) });
});

router.put('/answers', verifyUser, async (req, res) => {
  const uid = req.userId;
  const answers = req.body?.answers;
  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ error: 'invalid_answers' });
  }

  const displayName = answers.name || null;
  await upsertUser(uid, {
    email: null,
    displayName,
    photoUrl: null,
  });
  if (req.authType === 'guest' && displayName) {
    await query(
      'UPDATE users SET email = ? WHERE id = ?',
      [guestEmail(displayName), uid],
    );
  }

  const rows = answersToRows(answers);
  for (const row of rows) {
    await query(
      `INSERT INTO user_onboarding_answers (user_id, flow, question_key, answer_value)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         answer_value = VALUES(answer_value),
         answered_at = CURRENT_TIMESTAMP`,
      [uid, row.flow, row.key, row.value],
    );
  }

  const saved = await query(
    `SELECT flow, question_key, answer_value
     FROM user_onboarding_answers
     WHERE user_id = ?`,
    [uid],
  );

  res.json({ answers: rowsToAnswers(saved) });
});

router.put('/profile', verifyUser, async (req, res) => {
  const userId = req.userId;
  const displayName =
    typeof req.body?.display_name === 'string' ? req.body.display_name.trim() : null;
  const photoUrl = typeof req.body?.photo_url === 'string' ? req.body.photo_url : null;

  await upsertUser(userId, {
    email: req.authType === 'guest' ? guestEmail(displayName || userId) : null,
    displayName,
    photoUrl,
  });

  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  res.json({ user: rows[0] });
});

router.post('/photo', verifyUser, async (req, res) => {
  const userId = req.userId;
  const base64 = req.body?.file_base64;
  const mimeType = req.body?.mime_type || 'image/jpeg';
  if (!base64 || typeof base64 !== 'string') {
    return res.status(400).json({ error: 'file_base64_required' });
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) {
    return res.status(400).json({ error: 'invalid_file' });
  }

  const ext = imageExtFromMime(mimeType);
  const fileName = `${Date.now()}_${userId.replace(/[^a-zA-Z0-9_-]/g, '')}.${ext}`;
  const path = `user_fotos/${fileName}`;
  const url = await uploadToCdn(path, buffer, mimeType);

  await upsertUser(userId, {
    email: null,
    displayName: null,
    photoUrl: url,
  });

  const rows = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  return res.json({ photo_url: url, user: rows[0] });
});

module.exports = router;
