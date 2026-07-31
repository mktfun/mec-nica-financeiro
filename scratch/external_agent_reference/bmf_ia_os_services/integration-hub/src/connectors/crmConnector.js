/**
 * CRM Connector (C4-DOC-002, Secao 2)
 *
 * ATENÇÃO: este é um conector simulado. Nenhum CRM real está
 * configurado ainda — quando o CRM real for escolhido (EA-DOC-001
 * cita a necessidade, sem especificar o produto), substituir a
 * função `enviar` abaixo pela chamada HTTP real, mantendo a mesma
 * assinatura para não quebrar quem consome este conector.
 */

async function enviar(acao, payload) {
  if (!process.env.CRM_API_URL) {
    return {
      simulado: true,
      aviso: "CRM_API_URL não configurado — resposta simulada. Configure a variável de ambiente para integração real.",
      acao,
      payload,
      resultado: "aceito_simulado",
    };
  }

  // Implementação real ficaria assim (exemplo ilustrativo):
  // const resp = await fetch(`${process.env.CRM_API_URL}/${acao}`, {
  //   method: "POST",
  //   headers: { Authorization: `Bearer ${process.env.CRM_API_KEY}` },
  //   body: JSON.stringify(payload),
  // });
  // return resp.json();
  throw new Error("CRM_API_URL configurado mas integração real ainda não implementada.");
}

module.exports = { enviar };
