const { Pool } = require('pg');

let poolConfig;

// Si existe la variable DATABASE_URL (recomendado para producción en Vercel)
if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  const host = process.env.DB_HOST || 'localhost';
  poolConfig = {
    host: host,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'ubuntu_admin',
    password: process.env.DB_PASSWORD || 'UbStore_Pr0j3ct#2026',
    database: process.env.DB_NAME || 'ubuntustoredb',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  };

  // Si la base de datos no es local, habilitamos SSL
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== 'db') {
    poolConfig.ssl = {
      rejectUnauthorized: false
    };
  }
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
});

async function getPool() {
  return pool;
}

async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

async function closeConnection() {
  await pool.end();
}

module.exports = { getPool, query, getClient, closeConnection };
