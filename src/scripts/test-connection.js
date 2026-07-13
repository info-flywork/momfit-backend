const { ping } = require('../config/db');

ping()
  .then((ok) => {
    console.log(ok ? 'MySQL bağlantısı başarılı.' : 'MySQL yanıt vermedi.');
    process.exit(ok ? 0 : 1);
  })
  .catch((err) => {
    console.error('MySQL bağlantı hatası:', err.message);
    process.exit(1);
  });
