/**
 * DB'deki video_path değerlerinin CDN'de erişilebilir olup olmadığını kontrol eder.
 * Kullanım: node src/scripts/verify-exercise-videos.js
 */
const https = require('https');
const { query, pool } = require('../config/db');
const { cdnUrl } = require('../lib/cdn');

function headRequest(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD' }, (res) => {
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.setTimeout(8000, () => {
      req.destroy();
      resolve(0);
    });
    req.end();
  });
}

async function main() {
  const rows = await query(
    `SELECT id, category_id, title_key, video_path
     FROM exercises
     WHERE video_path IS NOT NULL AND video_path != ''
     ORDER BY category_id, sort_order`,
  );

  let ok = 0;
  let fail = 0;

  for (const row of rows) {
    const url = cdnUrl(row.video_path);
    const status = await headRequest(url);
    if (status === 200) {
      ok += 1;
      console.log(`OK   ${row.id}`);
    } else {
      fail += 1;
      console.log(`FAIL ${row.id} (${status}) → ${row.video_path}`);
    }
  }

  console.log(`\nToplam: ${rows.length}, OK: ${ok}, FAIL: ${fail}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
