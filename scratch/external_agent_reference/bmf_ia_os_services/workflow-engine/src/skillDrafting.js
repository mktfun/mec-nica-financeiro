const fetch = require("node-fetch");
const { query } = require("./db");

/**
 * Skill Drafting (PROC-LEARN-DOC-001, Secao 3, Etapas 3-5)
 * O Learning Agent IA (BMF-GOV-004) analisa um texto (ja extraido de
 * um documento, por ex. via OCR) e propoe um rascunho de Skill.
 *
 * Nunca publica sozinho: toda saida entra em workflow_definitions com
 * status_publicacao = 'rascunho', exigindo aprovacao humana + CGO IA
 * (Secao 1.1 do PROC-LEARN-DOC-001) antes de virar workflow ativo.
 */

const AGENT_RUNTIME_URL = process.env.AGENT_RUNTIME_URL || "http://localhost:8081";
const KNOWLEDGE_BASE_URL = process.env.KNOWLEDGE_BASE_URL || "http://localhost:8085";
const LEARNING_AGENT_CODIGO = "BMF-GOV-004";

function montarPrompt(nomeProcesso, textoDocumento) {
  return [
    `Analise o texto abaixo, extraído de um manual operacional, referente ao processo "${nomeProcesso}".`,
    `Produza APENAS um JSON válido (sem texto antes ou depois) com o formato:`,
    `{"objetivo": "...", "steps": [{"nome": "...", "tipo": "connector|tool|agent|wait", "alvo": "...", "acao": "...", "evento_conclusao": "..."}]}`,
    `Texto do manual:`,
    textoDocumento,
  ].join("\n\n");
}

/**
 * Tenta extrair um JSON valido de uma resposta de texto livre do
 * modelo. Nunca lanca excecao — se nao conseguir, retorna null e o
 * chamador decide como tratar (rascunho fica marcado para edicao manual).
 */
function extrairJson(texto) {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim <= inicio) return null;
  try {
    return JSON.parse(texto.slice(inicio, fim + 1));
  } catch {
    return null;
  }
}

/**
 * Fallback deterministico usado quando o Agent Runtime esta em modo
 * simulado (sem ANTHROPIC_API_KEY) — permite testar o pipeline de
 * ponta a ponta sem depender de uma chamada real de IA, no mesmo
 * espirito do "modo simulado" ja usado no agent-runtime e no
 * integration-hub.
 */
function rascunhoSimulado(nomeProcesso) {
  return {
    objetivo: `[RASCUNHO SIMULADO] Objetivo do processo "${nomeProcesso}" — requer preenchimento manual, pois o Agent Runtime está em modo simulado (sem ANTHROPIC_API_KEY).`,
    steps: [
      {
        nome: "Etapa a definir",
        tipo: "tool",
        alvo: "revisar_manualmente",
        acao: "revisar_manualmente",
        evento_conclusao: null,
      },
    ],
  };
}

async function redigirRascunho({ nomeProcesso, textoDocumento, documentoOrigemId }) {
  const agenteRes = await query(`SELECT id FROM agentes_ia WHERE codigo = $1`, [LEARNING_AGENT_CODIGO]);
  const agente = agenteRes.rows[0];
  if (!agente) throw new Error(`Learning Agent (${LEARNING_AGENT_CODIGO}) não encontrado — rode o seed primeiro.`);

  // Se o texto não veio direto, mas um documento já ingerido no
  // Knowledge Base foi informado, busca o texto reconstruído a partir
  // dos chunks — fecha o laço entre o Document Ingestor e o Learning
  // Agent, sem exigir que quem chama recolha o texto bruto de novo.
  let texto = textoDocumento;
  if (!texto && documentoOrigemId) {
    const doc = await fetch(`${KNOWLEDGE_BASE_URL}/documents/${documentoOrigemId}/text`).then((r) => r.json());
    texto = doc.texto;
  }
  if (!texto) {
    throw new Error("Informe textoDocumento diretamente ou um documentoOrigemId já ingerido no Knowledge Base.");
  }

  const resposta = await fetch(`${AGENT_RUNTIME_URL}/agents/${LEARNING_AGENT_CODIGO}/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objetivo: montarPrompt(nomeProcesso, texto) }),
  }).then((r) => r.json());

  if (resposta.erro) {
    throw new Error(`Agent Runtime recusou a execução: ${resposta.detalhe || resposta.erro}`);
  }

  let rascunho;
  let precisaRevisaoJson = false;

  if (resposta.status === "simulado") {
    rascunho = rascunhoSimulado(nomeProcesso);
  } else {
    rascunho = extrairJson(resposta.resultado || "");
    if (!rascunho) {
      precisaRevisaoJson = true;
      rascunho = { objetivo: (resposta.resultado || "").slice(0, 2000), steps: [] };
    }
  }

  const { rows } = await query(
    `INSERT INTO workflow_definitions
       (nome, versao, descricao, definicao_json, ativo, status_publicacao, documento_origem_id, criado_por_agente_id)
     VALUES ($1, '0.1-rascunho', $2, $3, false, 'rascunho', $4, $5)
     RETURNING *`,
    [
      nomeProcesso,
      precisaRevisaoJson
        ? "RASCUNHO — a resposta do agente não pôde ser interpretada como JSON válido; revisão manual necessária."
        : rascunho.objetivo || `Rascunho gerado pelo Learning Agent IA para "${nomeProcesso}"`,
      JSON.stringify({ steps: rascunho.steps || [] }),
      documentoOrigemId || null,
      agente.id,
    ]
  );

  return { ...rows[0], precisaRevisaoJson };
}

module.exports = { redigirRascunho, montarPrompt, extrairJson };
