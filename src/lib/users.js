const { query } = require('../config/db');

async function upsertUser(userId, { email, displayName, photoUrl }) {
  await query(
    `INSERT INTO users (id, email, display_name, photo_url)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       email = COALESCE(VALUES(email), email),
       display_name = COALESCE(VALUES(display_name), display_name),
       photo_url = COALESCE(VALUES(photo_url), photo_url),
       updated_at = CURRENT_TIMESTAMP`,
    [userId, email || null, displayName || null, photoUrl || null],
  );
}

module.exports = { upsertUser };
