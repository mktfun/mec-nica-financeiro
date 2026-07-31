/**
 * Intent Classifier (C4-DOC-001, Secao 4.1)
 * Identifica a macrocapacidade (EA-DOC-001, Secao 5) a partir do
 * texto da requisicao. Implementacao por palavras-chave para o
 * Release 1 — suficiente para rotear corretamente sem depender de
 * uma chamada de IA so para classificar (o raciocinio de IA fica
 * reservado para o Agent Executor, que ja tem o contexto completo).
 */

const REGRAS = [
  { departamento: "Comercial", palavras: ["cotação", "cotacao", "comprar", "contratar", "novo seguro", "preço", "proposta"] },
  { departamento: "Atendimento + Pós-venda", palavras: ["dúvida", "duvida", "ajuda", "sinistro", "renovar", "renovação", "cancelar"] },
  { departamento: "Operações", palavras: ["emissão", "emissao", "endosso", "apólice", "apolice", "documento"] },
  { departamento: "Financeiro", palavras: ["boleto", "pagamento", "comissão", "comissao", "cobrança", "cobranca"] },
  { departamento: "Compliance", palavras: ["lgpd", "auditoria", "conformidade", "regulatório", "regulatorio"] },
];

const DEPARTAMENTO_PADRAO = "Estratégia (Conselho Executivo)";

function classificar(texto) {
  const textoLower = texto.toLowerCase();
  for (const regra of REGRAS) {
    if (regra.palavras.some((p) => textoLower.includes(p))) {
      return { departamento: regra.departamento, confianca: "media", metodo: "palavra_chave" };
    }
  }
  return { departamento: DEPARTAMENTO_PADRAO, confianca: "baixa", metodo: "fallback" };
}

module.exports = { classificar };
