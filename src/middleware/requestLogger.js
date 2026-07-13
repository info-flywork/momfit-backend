/**
 * Gelen HTTP isteklerini konsola yazar.
 * Auth token / büyük body loglanmaz.
 */
function requestLogger(req, res, next) {
  const started = Date.now();
  const { method, originalUrl } = req;
  const guest = req.get('x-guest-id') ? 'guest' : null;
  const auth = req.get('authorization') ? 'auth' : null;
  const who = guest || auth || 'anon';

  res.on('finish', () => {
    const ms = Date.now() - started;
    const line = `[req] ${method} ${originalUrl} → ${res.statusCode} ${ms}ms (${who})`;
    if (res.statusCode >= 500) {
      console.error(line);
    } else if (res.statusCode >= 400) {
      console.warn(line);
    } else {
      console.log(line);
    }
  });

  next();
}

module.exports = { requestLogger };
