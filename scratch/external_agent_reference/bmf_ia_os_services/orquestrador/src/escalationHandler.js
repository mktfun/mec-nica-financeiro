/**
 * Escalation Handler (C4-DOC-001, Secao 4.1)
 * Implementa a Matriz de Autoridade (EA-DOC-001, Secao 7.3):
 * decide se a acao solicitada pode ser executada pela IA ou
 * precisa aguardar aprovacao humana.
 */

// Espelha literalmente a tabela da Matriz de Autoridade do EA-DOC-001
const MATRIZ_AUTORIDADE = {
  responder_pergunta: "ia",
  atualizar_crm: "ia",
  criar_minuta_proposta: "ia_com_revisao",
  enviar_proposta_comercial: "ia_conforme_politica",
  emitir_apolice: "ia_conforme_politica",
  aprovar_desconto: "ia_conforme_politica",
  cancelar_contrato: "humano",
  alterar_politica_empresa: "humano",
  autorizar_pagamento: "humano",
};

function avaliar(acao) {
  const regra = MATRIZ_AUTORIDADE[acao] || "ia_com_revisao"; // default conservador

  switch (regra) {
    case "ia":
      return { requerHumano: false, motivo: "Ação de baixo risco, autorizada para execução direta pela IA." };
    case "humano":
      return { requerHumano: true, motivo: "Ação reservada exclusivamente a humanos pela Matriz de Autoridade." };
    case "ia_com_revisao":
      return { requerHumano: true, motivo: "IA pode preparar, mas humano deve revisar antes da execução final." };
    case "ia_conforme_politica":
      return { requerHumano: false, motivo: "Permitido à IA dentro da política interna definida; sujeito a auditoria.", condicional: true };
    default:
      return { requerHumano: true, motivo: "Ação não mapeada na Matriz de Autoridade — escalada por precaução." };
  }
}

module.exports = { avaliar, MATRIZ_AUTORIDADE };
