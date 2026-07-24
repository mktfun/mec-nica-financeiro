/**
 * E-signature Connector (C4-DOC-002, Secao 2)
 *
 * ATENÇÃO: conector simulado. Nenhum provedor de assinatura
 * eletrônica está configurado ainda.
 */

async function enviar(acao, payload) {
  if (!process.env.ESIGNATURE_API_URL) {
    return {
      simulado: true,
      aviso: "ESIGNATURE_API_URL não configurado — resposta simulada.",
      acao,
      payload,
      resultado: "documento_enviado_simulado",
    };
  }
  throw new Error("ESIGNATURE_API_URL configurado mas integração real ainda não implementada.");
}

module.exports = { enviar };
