import { OSDeepDetail } from '../scrapers/patioDeepCrawler';

export interface CMVAuditItem {
  os_number: string;
  store_name: string;
  cliente: string;
  veiculo: string;
  total_os: number;
  total_pecas: number;
  total_servicos: number;
  cmv_percentage: number;
  alerta: string;
}

export interface MechanicLoad {
  nome: string;
  total_os: number;
  total_servicos_valor: number;
  loja: string;
}

export interface PatioIntelligenceReport {
  timestamp: string;
  total_veiculos_rede: number;
  faturamento_total_patio: number;
  total_pecas_rede: number;
  total_servicos_rede: number;
  cmv_medio_rede: number;
  alertas_cmv_critico: CMVAuditItem[];
  alertas_pecas_sem_sinal: CMVAuditItem[];
  carga_mecanicos: MechanicLoad[];
}

export function analyzePatioIntelligence(allOS: OSDeepDetail[]): PatioIntelligenceReport {
  let totalFat = 0;
  let totalPecas = 0;
  let totalServicos = 0;

  const alertasCmv: CMVAuditItem[] = [];
  const alertasSemSinal: CMVAuditItem[] = [];
  const mecanicosMap: Record<string, { total_os: Set<string>; valor: number; loja: string }> = {};

  for (const os of allOS) {
    totalFat += os.valor_total;
    totalPecas += os.valor_pecas;
    totalServicos += os.valor_servicos;

    const cmv = os.valor_total > 0 ? (os.valor_pecas / os.valor_total) * 100 : 0;

    // Alerta de CMV > 48% ou 100% peças
    if (os.valor_total > 500 && cmv > 48) {
      alertasCmv.push({
        os_number: os.numero_os,
        store_name: os.store_name,
        cliente: os.cliente,
        veiculo: os.veiculo,
        total_os: os.valor_total,
        total_pecas: os.valor_pecas,
        total_servicos: os.valor_servicos,
        cmv_percentage: Math.round(cmv * 10) / 10,
        alerta: cmv >= 99 ? '100% Peças (R$ 0 Mão de Obra)' : `CMV Elevado (${Math.round(cmv)}%)`
      });
    }

    // Peças caras sem sinal (> R$ 1.500)
    if (os.valor_pecas >= 1500 && os.valor_pago === 0) {
      alertasSemSinal.push({
        os_number: os.numero_os,
        store_name: os.store_name,
        cliente: os.cliente,
        veiculo: os.veiculo,
        total_os: os.valor_total,
        total_pecas: os.valor_pecas,
        total_servicos: os.valor_servicos,
        cmv_percentage: Math.round(cmv * 10) / 10,
        alerta: `Peças R$ ${os.valor_pecas.toFixed(2)} sem sinal`
      });
    }

    // Mapeamento de mecânicos
    for (const item of (os.itens || [])) {
      if (item.tipo === 'SERVICO' && item.executor && item.executor.trim() !== '') {
        const mecNome = item.executor.trim();
        if (!mecanicosMap[mecNome]) {
          mecanicosMap[mecNome] = { total_os: new Set(), valor: 0, loja: os.store_name };
        }
        mecanicosMap[mecNome].total_os.add(os.numero_os);
        mecanicosMap[mecNome].valor += item.valor_total;
      }
    }
  }

  const cmvMedio = totalFat > 0 ? (totalPecas / totalFat) * 100 : 0;

  const cargaMecanicos: MechanicLoad[] = Object.entries(mecanicosMap)
    .map(([nome, data]) => ({
      nome,
      total_os: data.total_os.size,
      total_servicos_valor: Math.round(data.valor * 100) / 100,
      loja: data.loja
    }))
    .sort((a, b) => b.total_servicos_valor - a.total_servicos_valor);

  return {
    timestamp: new Date().toISOString(),
    total_veiculos_rede: allOS.length,
    faturamento_total_patio: Math.round(totalFat * 100) / 100,
    total_pecas_rede: Math.round(totalPecas * 100) / 100,
    total_servicos_rede: Math.round(totalServicos * 100) / 100,
    cmv_medio_rede: Math.round(cmvMedio * 10) / 10,
    alertas_cmv_critico: alertasCmv.sort((a, b) => b.total_os - a.total_os),
    alertas_pecas_sem_sinal: alertasSemSinal.sort((a, b) => b.total_pecas - a.total_pecas),
    carga_mecanicos: cargaMecanicos
  };
}

export function printPatioIntelligenceSummary(report: PatioIntelligenceReport): void {
  console.log(`\n========================================================================`);
  console.log(`🧠 RELATÓRIO DO MOTOR DE IA DE PÁTIO (COGNITIVE AUDIT)`);
  console.log(`🕒 Processado em: ${report.timestamp}`);
  console.log(`🚗 Veículos no Pátio: ${report.total_veiculos_rede} OSs`);
  console.log(`💰 Faturamento Estimado Pátio: R$ ${report.faturamento_total_patio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📦 Total Peças: R$ ${report.total_pecas_rede.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🔧 Total Serviços: R$ ${report.total_servicos_rede.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📊 CMV Médio da Rede: ${report.cmv_medio_rede}%`);
  console.log(`========================================================================`);

  console.log(`\n🚨 TOP 5 ALERTAS DE CMV ELEVADO (RISCO DE MARGEM COMPRIMIDA):`);
  report.alertas_cmv_critico.slice(0, 5).forEach((al, i) => {
    console.log(`  ${i+1}. OS #${al.os_number} (${al.store_name}) - ${al.veiculo} | Total: R$ ${al.total_os.toFixed(2)} | Peças: R$ ${al.total_pecas.toFixed(2)} | CMV: ${al.cmv_percentage}% | [${al.alerta}]`);
  });

  console.log(`\n⚠️ TOP 5 PEÇAS DE ALTO VALOR SEM SINAL (RISCO DE GLOSA/DESISTÊNCIA):`);
  report.alertas_pecas_sem_sinal.slice(0, 5).forEach((al, i) => {
    console.log(`  ${i+1}. OS #${al.os_number} (${al.store_name}) - ${al.cliente} (${al.veiculo}) | Peças: R$ ${al.total_pecas.toFixed(2)} | Total OS: R$ ${al.total_os.toFixed(2)}`);
  });

  console.log(`\n👨‍🔧 CARGA DE TRABALHO E FATURAMENTO POR MECÂNICO:`);
  report.carga_mecanicos.slice(0, 8).forEach((m, i) => {
    console.log(`  ${i+1}. ${m.nome.padEnd(20)} | ${m.loja.padEnd(22)} | ${m.total_os} OSs | MO Gerada: R$ ${m.total_servicos_valor.toFixed(2)}`);
  });
  console.log(`========================================================================\n`);
}
