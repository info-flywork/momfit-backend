const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool(db);

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function ping() {
  const rows = await query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

module.exports = { pool, query, ping };
