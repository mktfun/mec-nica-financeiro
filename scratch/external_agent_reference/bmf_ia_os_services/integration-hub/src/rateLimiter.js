const redis = require("./redis");

/**
 * Rate Limiter / Retry Handler (C4-DOC-002, Secao 2)
 * Controla quantas chamadas por minuto cada conector pode fazer
 * (token bucket simplificado via Redis) e reexecuta falhas
 * transitórias com backoff exponencial.
 */

const LIMITES_POR_MINUTO = {
  crm: 120,
  seguradoras: 60,
  esignature: 30,
};

async function verificarLimite(nomeConector) {
  const chave = `ratelimit:${nomeConector}:${Math.floor(Date.now() / 60000)}`;
  const contagem = await redis.incr(chave);
  await redis.expire(chave, 60);

  const limite = LIMITES_POR_MINUTO[nomeConector] || 60;
  if (contagem > limite) {
    throw new Error(`Limite de taxa excedido para o conector "${nomeConector}" (${limite}/min).`);
  }
  return { contagem, limite };
}

async function comRetry(fn, { tentativas = 3, atrasoBaseMs = 300 } = {}) {
  let ultimoErro;
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      return await fn();
    } catch (err) {
      ultimoErro = err;
      if (tentativa < tentativas) {
        const atraso = atrasoBaseMs * 2 ** (tentativa - 1);
        await new Promise((r) => setTimeout(r, atraso));
      }
    }
  }
  throw new Error(`Falha após ${tentativas} tentativas: ${ultimoErro.message}`);
}

module.exports = { verificarLimite, comRetry };
