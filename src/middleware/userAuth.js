const { verifyIdToken, initFirebase } = require('./firebaseAuth');

const GUEST_ID_PATTERN =
  /^guest_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidGuestId(id) {
  return typeof id === 'string' && GUEST_ID_PATTERN.test(id);
}

async function verifyUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (token) {
    const adminApp = initFirebase();
    if (!adminApp) {
      return res.status(503).json({
        error: 'firebase_not_configured',
        message: 'Firebase service account dosyası eklenmeli.',
      });
    }

    try {
      req.firebaseUser = await adminApp.auth().verifyIdToken(token);
      req.userId = req.firebaseUser.uid;
      req.authType = 'firebase';
      return next();
    } catch (err) {
      return res.status(401).json({
        error: 'invalid_token',
        message: err.message,
      });
    }
  }

  const guestId = req.headers['x-guest-id'];
  if (isValidGuestId(guestId)) {
    req.userId = guestId;
    req.authType = 'guest';
    return next();
  }

  return res.status(401).json({ error: 'missing_credentials' });
}

module.exports = { verifyUser, isValidGuestId };
