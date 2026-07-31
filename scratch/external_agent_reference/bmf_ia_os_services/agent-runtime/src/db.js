const { Pool } = require("pg");

// Conexão única com PostgreSQL (Data Store, DM-DOC-001)
// DATABASE_URL segue o formato: postgresql://usuario:senha@host:5432/bmf_ia_os
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://bmf_admin:devlocal@localhost:5432/bmf_ia_os",
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("[db] Erro inesperado no pool do PostgreSQL:", err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const durationMs = Date.now() - start;
  return { ...res, durationMs };
}

module.exports = { pool, query };
