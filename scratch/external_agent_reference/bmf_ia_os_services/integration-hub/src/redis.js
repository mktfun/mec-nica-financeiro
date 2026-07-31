const Redis = require("ioredis");

// Conexão com Redis (Event Bus/Cache, DM-DOC-001 Secao 4.3)
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => {
  console.error("[redis] Erro de conexao:", err.message);
});

module.exports = redis;
