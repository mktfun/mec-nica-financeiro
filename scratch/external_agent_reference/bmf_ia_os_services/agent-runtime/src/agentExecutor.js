const Anthropic = require("@anthropic-ai/sdk");
const registry = require("./agentRegistry");
const gate = require("./homologationGate");
const memory = require("./memoryManager");
const toolBroker = require("./toolBroker");
const auditLogger = require("./auditLogger");
const contextCompressor = require("./contextCompressor");

/**
 * Agent Executor (C4-DOC-001, Secao 4.2)
 * Monta o prompt a partir da ficha BASS (Modulos 1-8, 11, 12,
 * armazenados em agentes_ia.ficha_bass) e invoca a Anthropic API
 * para o raciocinio do agente.
 */

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function montarSystemPrompt(agente) {
  const ficha = agente.ficha_bass || {};
  return [
    `Você é ${agente.nome}, ${agente.cargo} (${agente.role_curto}) da BMF Corretora.`,
    `Departamento: ${agente.departamento}. Classe: ${agente.classe}.`,
    ficha.missao ? `Missão: ${ficha.missao}` : "",
    ficha.pode ? `Você PODE: ${ficha.pode.join("; ")}` : "",
    ficha.naoPode ? `Você NÃO PODE, sob nenhuma circunstância: ${ficha.naoPode.join("; ")}` : "",
    "Se a tarefa solicitada exigir algo que você não pode fazer, recuse e explique que isso requer escalonamento humano ou outro agente.",
  ].filter(Boolean).join("\n");
}

/**
 * Executa uma tarefa delegada a um agente.
 * @param {string} codigoAgente - ex.: "BMF-EXEC-001"
 * @param {object} tarefa - { tarefaId, conversaId, objetivo, contexto }
 */
async function executar(codigoAgente, tarefa) {
  const inicio = Date.now();
  const agente = await registry.findByCodigo(codigoAgente);

  if (!agente) {
    throw new Error(`Agente com código ${codigoAgente} não encontrado no Agent Registry.`);
  }

  // 1) Homologation Gate — bloqueia se o agente não estiver homologado
  await gate.verificar(agente);

  // 2) Memory Manager — carrega memória permanente e sessão
  const memoriaPermanente = await memory.lerPermanente(agente.id);
  const historicoSessao = tarefa.conversaId
    ? await memory.lerSessao(agente.id, tarefa.conversaId)
    : [];

  const systemPrompt = montarSystemPrompt(agente) +
    (Object.keys(memoriaPermanente).length ? `\nConhecimento permanente adicional: ${JSON.stringify(memoriaPermanente)}` : "");

  let resultadoTexto;
  let status = "sucesso";

  try {
    if (anthropic) {
      // 3) Chamada real à Anthropic API
      const resposta = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...historicoSessao.map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: tarefa.objetivo },
        ],
      });
      resultadoTexto = resposta.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    } else {
      // Modo de desenvolvimento sem ANTHROPIC_API_KEY: resposta simulada,
      // determinística, para permitir testar todo o resto do pipeline
      // (Registry -> Gate -> Memory -> Tool Broker -> Audit) sem custo de API.
      resultadoTexto = `[SIMULADO — defina ANTHROPIC_API_KEY para raciocínio real] ${agente.role_curto} reconheceu o objetivo: "${tarefa.objetivo}"`;
      status = "simulado";
    }
  } catch (err) {
    status = "erro";
    resultadoTexto = `Erro ao invocar o modelo: ${err.message}`;
  }

  // 4) Atualiza memória de sessão
  let compressao = { comprimido: false };
  if (tarefa.conversaId) {
    await memory.adicionarNaSessao(agente.id, tarefa.conversaId, { role: "user", content: tarefa.objetivo });
    await memory.adicionarNaSessao(agente.id, tarefa.conversaId, { role: "assistant", content: resultadoTexto });

    // Context Compressor: verifica e comprime SOMENTE depois de responder
    // ao chamador — nunca atrasa a resposta corrente, apenas prepara a
    // próxima chamada para não herdar um histórico sem limite.
    compressao = await contextCompressor.comprimirSeNecessario(agente.id, tarefa.conversaId);
  }

  const tempoExecucaoMs = Date.now() - inicio;

  // 5) Audit Logger — grava independentemente de sucesso ou erro
  await auditLogger.registrar({
    agenteId: agente.id,
    ferramenta: null,
    objetivo: tarefa.objetivo,
    resultado: resultadoTexto,
    tempoExecucaoMs,
    status,
  });

  return {
    agente: { codigo: agente.codigo, nome: agente.nome, role: agente.role_curto },
    resultado: resultadoTexto,
    status,
    tempoExecucaoMs,
    compressaoContexto: compressao,
  };
}

/**
 * Solicita o uso de uma ferramenta em nome de um agente,
 * passando pelo Tool Broker (RBAC).
 */
async function usarFerramenta(codigoAgente, ferramenta) {
  const agente = await registry.findByCodigo(codigoAgente);
  if (!agente) throw new Error(`Agente ${codigoAgente} não encontrado.`);
  return toolBroker.solicitar(agente.id, ferramenta);
}

module.exports = { executar, usarFerramenta, montarSystemPrompt };
