require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bukit_doa_cms',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

pool.getConnection()
  .then(c => { console.log('MySQL terhubung:', process.env.DB_NAME || 'bukit_doa_cms'); c.release(); })
  .catch(e => { console.error('MySQL gagal:', e.message); process.exit(1); });

module.exports = pool;
