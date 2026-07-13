const { upsertUser } = require('../lib/users');

async function ensureUserRecord(req, res, next) {
  try {
    let email = null;
    let displayName = null;
    let photoUrl = null;

    if (req.authType === 'firebase') {
      const firebaseUser = req.firebaseUser;
      email = firebaseUser.email || null;
      displayName = firebaseUser.name || null;
      photoUrl = firebaseUser.picture || null;
    }

    await upsertUser(req.userId, { email, displayName, photoUrl });
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { ensureUserRecord };
