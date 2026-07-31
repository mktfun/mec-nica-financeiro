/**
 * Context Pruning do Workflow Engine.
 *
 * Gap identificado em conversa com o Conselho Executivo: engine.js
 * acumulava o resultado de CADA etapa em workflow.contexto, sem
 * limite -- um workflow longo, ou uma etapa que retorna um payload
 * grande (ex.: HTML de uma pagina, resposta bruta de conector),
 * reabriria o mesmo risco de contexto sem limite que o Context
 * Compressor resolveu para a memoria de Sessao (agent-runtime).
 *
 * Estrategia deliberadamente mais simples que o Context Compressor:
 * aqui os valores sao dados estruturados (resultado de conector/tool),
 * nao uma conversa em linguagem natural -- truncar e sinalizar e
 * suficiente e muito mais barato do que pedir a uma IA para resumir
 * a cada etapa (o que atrasaria todo workflow).
 */

const MAX_STEPS_NO_CONTEXTO = Number(process.env.WORKFLOW_CONTEXT_MAX_STEPS) || 10;
const MAX_VALOR_SERIALIZADO_CHARS = Number(process.env.WORKFLOW_CONTEXT_MAX_VALOR_CHARS) || 2000;

/**
 * Adiciona o resultado de uma etapa ao contexto do workflow, truncando
 * valores grandes e removendo as entradas mais antigas quando o
 * número de etapas guardadas ultrapassa o limite. As chaves removidas
 * ficam registradas em `_stepsOmitidos`, para que o histórico completo
 * continue rastreável via workflow_steps (Postgres), mesmo que não
 * esteja mais no objeto de contexto passado ao próximo step/prompt.
 */
function adicionarAoContexto(contexto, chave, valor) {
  let valorFinal = valor;
  const valorSerializado = JSON.stringify(valor);

  if (valorSerializado && valorSerializado.length > MAX_VALOR_SERIALIZADO_CHARS) {
    valorFinal = {
      _truncado: true,
      _tamanhoOriginalChars: valorSerializado.length,
      amostra: valorSerializado.slice(0, MAX_VALOR_SERIALIZADO_CHARS),
    };
  }

  const novoContexto = { ...contexto, [chave]: valorFinal };

  const stepsOmitidosAnteriores = novoContexto._stepsOmitidos || [];
  const chavesDeStep = Object.keys(novoContexto).filter((k) => k !== "_stepsOmitidos");

  if (chavesDeStep.length > MAX_STEPS_NO_CONTEXTO) {
    const paraRemover = chavesDeStep.slice(0, chavesDeStep.length - MAX_STEPS_NO_CONTEXTO);
    paraRemover.forEach((k) => delete novoContexto[k]);
    novoContexto._stepsOmitidos = [...stepsOmitidosAnteriores, ...paraRemover];
  } else if (stepsOmitidosAnteriores.length > 0) {
    novoContexto._stepsOmitidos = stepsOmitidosAnteriores;
  }

  return novoContexto;
}

module.exports = { adicionarAoContexto, MAX_STEPS_NO_CONTEXTO, MAX_VALOR_SERIALIZADO_CHARS };
