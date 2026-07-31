const store = require("./workflowStore");
const { executarStep } = require("./stepExecutor");
const eventBus = require("./eventBus");
const contextPruning = require("./contextPruning");

/**
 * Motor de Workflow (EA-DOC-002, Secao 4)
 *
 * Execucao de steps sequenciais e feita por chamada direta (nao pelo
 * Event Bus) para manter previsibilidade e testabilidade nesta
 * primeira versao -- mas cada step concluido PUBLICA um evento real
 * no Event Bus (observabilidade e integracao externa), e toda etapa
 * do tipo "wait" so retoma quando um evento real chega pelo barramento
 * (esse mecanismo, sim, e genuinamente orientado a evento -- e o que
 * resolve "aguardar assinatura" por dias, sobrevivendo a reinicios).
 */

async function iniciarWorkflow(nomeDefinicao, clienteId, contextoInicial) {
  const definicao = await store.buscarDefinicao(nomeDefinicao);
  if (!definicao) throw new Error(`Workflow "${nomeDefinicao}" nao encontrado ou inativo.`);

  const instancia = await store.criarInstancia(definicao.id, clienteId, contextoInicial);
  await executarProximosSteps(instancia.id);
  return store.buscarInstancia(instancia.id);
}

async function executarProximosSteps(instanciaId) {
  const instancia = await store.buscarInstancia(instanciaId);
  const definicaoRes = await require("./db").query(
    `SELECT * FROM workflow_definitions WHERE id = $1`, [instancia.workflow_definition_id]
  );
  const definicao = definicaoRes.rows[0];
  const steps = definicao.definicao_json.steps;

  let stepAtual = instancia.step_atual;
  let contexto = instancia.contexto;

  while (stepAtual < steps.length) {
    const step = steps[stepAtual];
    const registro = await store.registrarStep(
      instanciaId, stepAtual, step.nome, step.evento_gatilho || null, step.evento_conclusao || null
    );

    if (step.tipo === "wait") {
      await store.concluirStep(registro.id, "pulado", { motivo: "aguardando evento externo" });
      await store.criarEspera(instanciaId, step.aguardando_evento, step.expira_em || null, step.acao_expiracao);
      await store.atualizarInstancia(instanciaId, { status: "aguardando", stepAtual, contexto });
      console.log(`[workflow-engine] instancia ${instanciaId} aguardando evento "${step.aguardando_evento}"`);
      return;
    }

    try {
      const resultado = await executarStep(step, contexto);
      await store.concluirStep(registro.id, "concluido", resultado);
      contexto = contextPruning.adicionarAoContexto(contexto, step.nome, resultado);

      if (step.evento_conclusao) {
        await eventBus.publicar(step.evento_conclusao, { workflow_instance_id: instanciaId, ...resultado });
      }
      stepAtual++;
    } catch (err) {
      await store.concluirStep(registro.id, "com_erro", { erro: err.message });
      await store.atualizarInstancia(instanciaId, { status: "com_erro", stepAtual, contexto });
      console.error(`[workflow-engine] instancia ${instanciaId} falhou no step "${step.nome}":`, err.message);
      return;
    }
  }

  await store.atualizarInstancia(instanciaId, { status: "concluido", stepAtual, contexto, concluidoEm: new Date() });
  console.log(`[workflow-engine] instancia ${instanciaId} concluida`);
}

/**
 * Chamado pelo consumidor do Event Bus quando um evento chega que
 * corresponde a uma espera pendente de alguma instancia.
 */
async function retomarPorEvento(tipoEvento, dadosEvento) {
  const esperas = await store.buscarEsperasPorEvento(tipoEvento);
  for (const espera of esperas) {
    await store.resolverEspera(espera.id);
    const instancia = await store.buscarInstancia(espera.workflow_instance_id);
    const novoContexto = contextPruning.adicionarAoContexto(instancia.contexto, tipoEvento, dadosEvento);
    await store.atualizarInstancia(instancia.id, {
      status: "em_execucao",
      contexto: novoContexto,
      stepAtual: instancia.step_atual + 1,
    });
    console.log(`[workflow-engine] instancia ${instancia.id} retomada por evento "${tipoEvento}"`);
    await executarProximosSteps(instancia.id);
  }
}

module.exports = { iniciarWorkflow, executarProximosSteps, retomarPorEvento };
