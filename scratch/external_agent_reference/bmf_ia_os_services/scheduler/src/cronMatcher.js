/**
 * Scheduler (EA-DOC-003, Secao 5)
 * Casador de campos cron simples (minuto hora dia mes dia_semana).
 * Roda a cada tick de 1 minuto e verifica se os campos batem com o
 * horario atual -- evita depender de uma biblioteca de calculo de
 * proxima execucao, ao custo de precisao de minuto (suficiente para
 * os casos de uso do BMF IA OS: relatorios diarios, cobrancas, etc.).
 */

function campoBate(campo, valor) {
  if (campo === "*") return true;
  return campo.split(",").some((parte) => {
    if (parte.includes("/")) {
      const [, passo] = parte.split("/");
      return valor % Number(passo) === 0;
    }
    return Number(parte) === valor;
  });
}

function cronBateAgora(expressaoCron, data = new Date()) {
  const partes = expressaoCron.trim().split(/\s+/);
  if (partes.length !== 5) throw new Error(`Expressao cron invalida: "${expressaoCron}" (esperado 5 campos)`);
  const [minuto, hora, diaMes, mes, diaSemana] = partes;
  return (
    campoBate(minuto, data.getUTCMinutes()) &&
    campoBate(hora, data.getUTCHours()) &&
    campoBate(diaMes, data.getUTCDate()) &&
    campoBate(mes, data.getUTCMonth() + 1) &&
    campoBate(diaSemana, data.getUTCDay())
  );
}

module.exports = { cronBateAgora };
