import { 
  DailyReconciliationSummary, 
  StoreReconciliationSummary 
} from '@/hooks/useBackendConciliacao';
import { CentralImportResults } from '@/lib/parsers/centralImportManager';
import { AutoMatchingResult } from '@/lib/matchers/autoMatchingEngine';
import { StoreRow } from '@/hooks/useStores';

export interface BaselineD1Data {
  date: string;
  caixa_atual: number;
  faturamento: number;
  total_patio: number;
  a_receber_manual: number;
  dinheiro_mp: number;
  contas_a_pagar: number;
  odometro_hoje?: number;
  metadata?: Record<string, any> | null;
}

export interface SandboxManualOverrides {
  faturamentoDia?: number;
  odometroHoje?: number;
  dinheiroMp?: number;
  aReceber?: number;
  contasManual?: number;
}

export interface SandboxCalculatorInput {
  results: CentralImportResults;
  matchingResult: AutoMatchingResult;
  mapping: Record<string, string>;
  stores: StoreRow[];
  targetDate: string;
  previousSnapshot?: BaselineD1Data | null;
  manualOverrides?: SandboxManualOverrides;
  storePatioMap?: Record<string, number>;
  totalPatioReal?: number;
}

function round(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function buildSimulatedDailySummary(input: SandboxCalculatorInput): DailyReconciliationSummary {
  const { results, matchingResult, mapping, stores, targetDate, previousSnapshot, manualOverrides, storePatioMap, totalPatioReal } = input;

  // Mapa reverso storeId -> StoreRow
  const storeMap = new Map<string, StoreRow>();
  stores.forEach(s => storeMap.set(s.id, s));

  // Função auxiliar para resolver store_id a partir do alias ou nome
  const resolveStoreId = (rawName: string): string | null => {
    if (!rawName) return null;
    const clean = rawName.trim().toUpperCase();
    if (mapping[rawName]) return mapping[rawName];
    if (mapping[clean]) return mapping[clean];

    for (const store of stores) {
      if (store.id === rawName || store.id.toUpperCase() === clean) {
        return store.id;
      }
      const sName = store.name.trim().toUpperCase();
      if (sName === clean || clean.includes(sName) || sName.includes(clean)) {
        return store.id;
      }
    }
    return null;
  };

  // Helper para resolver a filial correta de forma abrangente (mesma regra de produção de CentralImportWizard)
  const resolveStoreForOfx = (ofx: { alias?: string; fileName?: string; storeAlias?: string; accountKey?: string }): string => {
    if (ofx.alias && mapping[ofx.alias]) return mapping[ofx.alias];
    if (ofx.storeAlias && mapping[ofx.storeAlias]) return mapping[ofx.storeAlias];
    if (ofx.accountKey && mapping[ofx.accountKey]) return mapping[ofx.accountKey];

    // 1. Tenta por chave direta de dígitos contínuos
    const cleanDigits = (ofx.alias || '').replace(/\D/g, '');
    if (cleanDigits && mapping[cleanDigits]) return mapping[cleanDigits];

    // 2. Extrai padrão Extrato_{agencia}_{conta} ou {agencia}_{conta} do nome do arquivo ou do alias
    const sourceStr = `${ofx.fileName || ''} ${ofx.alias || ''} ${ofx.storeAlias || ''}`;
    const fileMatch = sourceStr.match(/(\d{4})_(\d{5,8})/);
    if (fileMatch) {
      const agency = fileMatch[1];
      const account = fileMatch[2];
      const combined = `${agency}${account}`;
      if (mapping[combined]) return mapping[combined];
      if (mapping[`${agency}_${account}`]) return mapping[`${agency}_${account}`];
      if (mapping[account]) return mapping[account];
    }

    // 3. Match por 8 a 12 dígitos contínuos
    const acctMatch = (ofx.alias || '').match(/(\d{8,12})/);
    if (acctMatch && mapping[acctMatch[1]]) return mapping[acctMatch[1]];

    // 4. Mnemônicos e nomes no arquivo OFX / PDF
    const upperSourceStr = sourceStr.toUpperCase();
    const baseName = (ofx.fileName || '').toUpperCase().replace(/\.(OFX|PDF|RET)$/i, '').trim();

    if (baseName === 'MP' || upperSourceStr.includes('_MP') || upperSourceStr.includes('KENNEDY') || upperSourceStr.includes('WASHINGTON') || upperSourceStr.includes('MECANICA POPULAR')) return 'st-04';
    if (baseName === 'MHE' || upperSourceStr.includes('_MHE') || upperSourceStr.includes('MAUA') || upperSourceStr.includes('ORION') || upperSourceStr.includes('REI DO OLEO') || upperSourceStr.includes('REI_DO_OLEO') || upperSourceStr.includes('BRASICAR ATACADAO') || upperSourceStr.includes('ATACADAO DO OLEO')) return '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
    if (baseName === 'DHJV' || upperSourceStr.includes('_JB') || upperSourceStr.includes('JORGE') || upperSourceStr.includes('BERETTA') || upperSourceStr.includes('DHJV')) return 'st-03';
    if (baseName === 'HD' || upperSourceStr.includes('_HD') || upperSourceStr.includes('SANTO ANDRE') || upperSourceStr.includes('SANTO_ANDRE') || upperSourceStr.includes('VIVALDI')) return 'st-08';
    if (baseName === 'CAP' || upperSourceStr.includes('_CAP') || upperSourceStr.includes('RUDGE') || upperSourceStr.includes('CAPAO')) return 'st-07';
    if (baseName === 'BRASICAR' || upperSourceStr.includes('_BRA') || upperSourceStr.includes('PLANALTO') || upperSourceStr.includes('BRASICAR')) return 'st-06';
    if (baseName === 'EMPORIO' || upperSourceStr.includes('_EMP') || upperSourceStr.includes('PIRAPORINHA') || upperSourceStr.includes('EMPORIO')) return 'st-05';
    if (baseName === 'MODULO' || upperSourceStr.includes('_RM') || upperSourceStr.includes('REI DO MODULO') || upperSourceStr.includes('MODULO') || upperSourceStr.includes('OSORIO')) return 'st-09';
    if (baseName === 'DP' || upperSourceStr.includes('_DP') || upperSourceStr.includes('DOM PEDRO') || upperSourceStr.includes('DOM_PEDRO') || upperSourceStr.includes('984633') || upperSourceStr.includes('98463-3')) return 'st-01';
    if (baseName === 'JAB' || upperSourceStr.includes('_JAB') || upperSourceStr.includes('JABAQUARA') || upperSourceStr.includes('SBC') || upperSourceStr.includes('984112') || upperSourceStr.includes('98411-2')) return 'st-02';

    // 5. Match pelo nome da loja
    for (const store of stores) {
      const sName = store.name.trim().toUpperCase();
      if (sName && (upperSourceStr.includes(sName) || baseName.includes(sName))) {
        return store.id;
      }
    }

    return '';
  };

  // 1. Agrupar transações OFX por loja
  const ofxByStore = new Map<string, { entradas: number; saidas: number; saldo: number; hasOfx: boolean }>();
  let globalOfxIn = 0;
  let globalOfxOut = 0;

  for (const ofx of results.ofxResults || []) {
    if (!ofx.success) continue;
    const storeId = resolveStoreForOfx(ofx) || resolveStoreId(ofx.storeAlias || '') || resolveStoreId(ofx.alias || '') || 'OUTROS';
    const current = ofxByStore.get(storeId) || { entradas: 0, saidas: 0, saldo: 0, hasOfx: false };

    let fileIn = 0;
    let fileOut = 0;
    for (const tx of ofx.transactions || []) {
      const amt = Number(tx.amount || 0);
      if (amt > 0) {
        fileIn += amt;
      } else {
        fileOut += Math.abs(amt);
      }
    }

    // Saldo real do extrato (bankBalance do LEDGERBAL / Cabeçalho Itaú)
    const fileBalance = (typeof ofx.bankBalance === 'number')
      ? ofx.bankBalance
      : (typeof (ofx as any).finalBalance === 'number')
        ? (ofx as any).finalBalance
        : (typeof ofx.previousBalance === 'number')
          ? round(ofx.previousBalance + fileIn - fileOut)
          : round(fileIn - fileOut);

    current.entradas = round(current.entradas + fileIn);
    current.saidas = round(current.saidas + fileOut);
    current.saldo = round(current.saldo + fileBalance);
    current.hasOfx = true;
    ofxByStore.set(storeId, current);

    globalOfxIn = round(globalOfxIn + fileIn);
    globalOfxOut = round(globalOfxOut + fileOut);
  }

  // 2. Agrupar vendas Rede por loja
  const redeByStore = new Map<string, { bruto: number; liquido: number; juros: number; devolucoes: number }>();
  let globalRedeNet = 0;
  let globalRedeGross = 0;
  let globalRedeInterest = 0;

  for (const rede of results.redeResults || []) {
    if (!rede.success) continue;
    for (const tx of rede.transactions || []) {
      const storeId = resolveStoreId(tx.storeName || '') || 'OUTROS';
      const current = redeByStore.get(storeId) || { bruto: 0, liquido: 0, juros: 0, devolucoes: 0 };

      const net = Number(tx.netAmount || 0);
      const gross = Number(tx.grossAmount || 0);
      const fee = Number(tx.interest || 0);

      if (tx.transactionType === 'devolucao') {
        current.devolucoes = round(current.devolucoes + net);
      } else {
        current.bruto = round(current.bruto + gross);
        current.liquido = round(current.liquido + net);
        current.juros = round(current.juros + fee);

        globalRedeNet = round(globalRedeNet + net);
        globalRedeGross = round(globalRedeGross + gross);
        globalRedeInterest = round(globalRedeInterest + fee);
      }
      redeByStore.set(storeId, current);
    }
  }

  // 3. Agrupar OSs por loja (dinheiro, pátio e recebíveis)
  const osByStore = new Map<string, { dinheiro: number; patio: number; faturamento: number; pix: number; recebiveis: number }>();
  let globalDinheiro = 0;
  let globalPatioOs = 0;
  let globalRecebiveisNovos = 0;
  let globalFaturamentoOs = 0;

  for (const osRes of results.osFiles || []) {
    if (!osRes.success) continue;
    const storeId = resolveStoreId(osRes.storeAlias || '') || 'OUTROS';
    const current = osByStore.get(storeId) || { dinheiro: 0, patio: 0, faturamento: 0, pix: 0, recebiveis: 0 };

    for (const os of osRes.osArray || []) {
      const total = Number(os.total_value || 0);
      const paid = Number(os.paid_value || 0);
      const rest = Number(os.restante_value ?? Math.max(0, total - paid));

      current.faturamento = round(current.faturamento + total);
      globalFaturamentoOs = round(globalFaturamentoOs + total);

      // Status do pátio
      if (os.status === 'aberta' || rest > 0) {
        current.patio = round(current.patio + rest);
        globalPatioOs = round(globalPatioOs + rest);
      }

      // Dinheiro / Cofre
      const cashAmt = Number((os as any).parsed_cash ?? 0);
      if (cashAmt > 0) {
        current.dinheiro = round(current.dinheiro + cashAmt);
        globalDinheiro = round(globalDinheiro + cashAmt);
      } else if (os.formOfPayment && String(os.formOfPayment).toLowerCase().includes('dinheiro') && paid > 0) {
        current.dinheiro = round(current.dinheiro + paid);
        globalDinheiro = round(globalDinheiro + paid);
      }

      // PIX em OS
      const pixAmt = Number((os as any).parsed_pix_transfer ?? 0);
      if (pixAmt > 0) {
        current.pix = round(current.pix + pixAmt);
      }
    }

    // Recebíveis da OS (boletos, transferências)
    for (const rec of osRes.receivablesArray || []) {
      const amt = Number(rec.amount || 0);
      current.recebiveis = round(current.recebiveis + amt);
      globalRecebiveisNovos = round(globalRecebiveisNovos + amt);
    }

    osByStore.set(storeId, current);
  }

  // 3.5 Agrupar Contas a Pagar por loja
  const billsByStore = new Map<string, number>();
  for (const cRes of results.contasPagarResults || results.contasAPagarResults || []) {
    for (const bill of (cRes as any).bills || []) {
      const rawStore = bill.store_id || bill.store_name || bill.storeName || '';
      const storeId = resolveStoreId(rawStore) || mapping[rawStore] || 'OUTROS';
      const amt = Math.abs(Number(bill.amount || 0));
      billsByStore.set(storeId, round((billsByStore.get(storeId) || 0) + amt));
    }
  }

  // 3.6 Extrair PIX, Maquininhas e Outras Entradas/Saídas do OFX por loja
  const ofxMaqByStore = new Map<string, number>();
  const ofxPixByStore = new Map<string, number>();
  const ofxJustifiedByStore = new Map<string, number>();
  const ofxSaidasJustifiedByStore = new Map<string, number>();

  for (const ofx of results.ofxResults || []) {
    if (!ofx.success) continue;
    const storeId = resolveStoreForOfx(ofx) || resolveStoreId(ofx.storeAlias || '') || resolveStoreId(ofx.alias || '') || 'OUTROS';
    let maqSum = 0;
    let pixSum = 0;
    let justSum = 0;
    let justifiedOut = 0;

    for (const tx of ofx.transactions || []) {
      const amt = Number(tx.amount || 0);
      if (amt > 0) {
        const desc = `${tx.title || ''} ${tx.counterpart_name || ''}`.toUpperCase();
        if (desc.includes('REDE') || desc.includes('CARD') || desc.includes('CIELO') || desc.includes('STONE') || desc.includes('GETNET') || desc.includes('PAGSEG') || desc.includes('RECEB CARTOES')) {
          maqSum += amt;
        } else if (desc.includes('PIX') || desc.includes('TRANSF')) {
          pixSum += amt;
        } else {
          justSum += amt;
        }
      } else if (amt < 0) {
        const absAmt = Math.abs(amt);
        const isMatched = !!tx.matched_bill_id || !!tx.manual_category || tx.match_status === 'matched' || tx.match_status === 'matched_batch' || tx.match_status === 'intercompany_paired' || tx.match_status === 'auto_cancelled';
        if (isMatched) {
          justifiedOut += absAmt;
        }
      }
    }
    ofxMaqByStore.set(storeId, round((ofxMaqByStore.get(storeId) || 0) + maqSum));
    ofxPixByStore.set(storeId, round((ofxPixByStore.get(storeId) || 0) + pixSum));
    ofxJustifiedByStore.set(storeId, round((ofxJustifiedByStore.get(storeId) || 0) + justSum));
    ofxSaidasJustifiedByStore.set(storeId, round((ofxSaidasJustifiedByStore.get(storeId) || 0) + justifiedOut));
  }

  // 3.7 Mapa de Pátio Real (Passivo Acumulado Físico por Loja)
  const baselineStoresPatio = new Map<string, number>();
  if (storePatioMap) {
    Object.entries(storePatioMap).forEach(([sId, val]) => baselineStoresPatio.set(sId, Number(val || 0)));
  } else if (previousSnapshot?.metadata?.stores) {
    (previousSnapshot.metadata.stores as any[]).forEach(s => {
      if (s.store_id) baselineStoresPatio.set(s.store_id, Number(s.na_loja_os ?? s.patio_os ?? 0));
    });
  }

  // 4. Montar o resumo por loja (StoreReconciliationSummary)
  const storesDetail: StoreReconciliationSummary[] = stores.map(store => {
    const ofx = ofxByStore.get(store.id) || { entradas: 0, saidas: 0, saldo: 0, hasOfx: false };
    const rede = redeByStore.get(store.id) || { bruto: 0, liquido: 0, juros: 0, devolucoes: 0 };
    const os = osByStore.get(store.id) || { dinheiro: 0, patio: 0, faturamento: 0, pix: 0, recebiveis: 0 };

    const storePatioVal = baselineStoresPatio.get(store.id) ?? (os.patio > 0 ? os.patio : 0);

    const ofxMaq = ofxMaqByStore.get(store.id) || 0;
    const ofxPix = ofxPixByStore.get(store.id) || os.pix;
    const ofxJust = ofxJustifiedByStore.get(store.id) || 0;
    const saidasJust = ofxSaidasJustifiedByStore.get(store.id) || 0;

    // Cartões a compensar (vendas de cartão do dia que ainda não caíram no extrato D+1)
    // Regra Canônica Spec 426: 100% das vendas da REDE de hoje permanecem A Compensar (D+0)
    const rawNaoEntrou = rede.liquido > 0 ? rede.liquido : 0;
    const statusCompensacao: 'sem_movimento' | 'entrou' | 'parcial' | 'nao_entrou' = rede.liquido > 0 ? 'nao_entrou' : 'sem_movimento';

    // Entradas Canônicas (Regra SSOT da RPC)
    const ofxEntradasTotal = ofx.entradas;
    const entradasRealizadas = round(ofxMaq + ofxPix + ofxJust);
    const difEntradasRaw = ofxEntradasTotal - entradasRealizadas;
    const difEntradas = Math.abs(difEntradasRaw) <= 0.05 ? 0 : difEntradasRaw;
    const entradasPrevisto = ofxEntradasTotal > 0 ? ofxEntradasTotal : entradasRealizadas;

    // Saídas Canônicas (Regra SSOT da RPC)
    const ofxSaidasTotal = ofx.saidas;
    const rawContasLoja = billsByStore.get(store.id) || 0;
    const contasLojaTotal = rawContasLoja > 0 ? rawContasLoja : (saidasJust > 0 ? saidasJust : ofxSaidasTotal);
    const difSaidasRaw = ofxSaidasTotal - (rawContasLoja > 0 ? rawContasLoja : (saidasJust > 0 ? saidasJust : contasLojaTotal));
    const difSaidas = Math.abs(difSaidasRaw) <= 0.05 ? 0 : Math.max(0, difSaidasRaw);

    const diferenca = round(difEntradas - difSaidas);
    const isApproved = Math.abs(diferenca) <= 0.05;

    return {
      store_id: store.id,
      store_name: store.name,
      saldo_banco: ofx.saldo,
      saldo_banco_ofx: ofx.saldo,
      saldo_devedor_real: ofx.saldo < 0 ? Math.abs(ofx.saldo) : 0,
      saldo_positivo_real: ofx.saldo > 0 ? ofx.saldo : 0,
      dinheiro_loja: os.dinheiro,
      nao_entrou_valor: rawNaoEntrou,
      status_compensacao: statusCompensacao,
      rede_bruto: rede.bruto,
      rede_liquido: rede.liquido,
      rede_devolucoes: rede.devolucoes,
      ofx_maquininhas: ofxMaq,
      maquininha: rede.liquido,
      pix: ofxPix,
      na_loja_os: storePatioVal,
      patio_os: storePatioVal,
      previsto_ofx: entradasPrevisto,
      diferenca,
      status: isApproved ? 'conciliado' : 'divergence',
      ofx_entradas_total: ofxEntradasTotal,
      entradas_realizadas: entradasRealizadas,
      entradas_previsto: entradasPrevisto,
      entradas_conciliadas: entradasPrevisto,
      dif_entradas: difEntradas,
      diferenca_entradas: difEntradas,
      ofx_saidas_total: ofxSaidasTotal,
      saidas_ofx: ofxSaidasTotal,
      contas_conciliadas: contasLojaTotal > 0 ? contasLojaTotal : ofxSaidasTotal,
      contas_loja_total: contasLojaTotal > 0 ? contasLojaTotal : ofxSaidasTotal,
      contas_loja: contasLojaTotal > 0 ? contasLojaTotal : ofxSaidasTotal,
      dif_saidas: difSaidas,
      diferenca_saidas: difSaidas
    };
  });

  // Se houver transações em 'OUTROS' (contas gerais/matriz não mapeadas), adicionar linha explicativa
  const outrosOfx = ofxByStore.get('OUTROS');
  const outrosRede = redeByStore.get('OUTROS');
  const outrosOs = osByStore.get('OUTROS');

  if (outrosOfx || outrosRede || outrosOs) {
    const sSaldo = outrosOfx?.saldo || 0;
    const sEntradas = outrosOfx?.entradas || 0;
    const sSaidas = outrosOfx?.saidas || 0;
    const sDinheiro = outrosOs?.dinheiro || 0;
    const sMaq = outrosRede?.liquido || 0;
    const sPix = outrosOs?.pix || 0;
    const sPatio = outrosOs?.patio || 0;
    const sPrevisto = round(sMaq + sPix);
    const difEntradas = round(sEntradas - sPrevisto);
    const diferenca = round(difEntradas - sSaidas);

    storesDetail.push({
      store_id: 'outros',
      store_name: 'Conta Geral / Outros',
      saldo_banco: sSaldo,
      saldo_banco_ofx: sSaldo,
      saldo_devedor_real: sSaldo < 0 ? Math.abs(sSaldo) : 0,
      saldo_positivo_real: sSaldo > 0 ? sSaldo : 0,
      dinheiro_loja: sDinheiro,
      nao_entrou_valor: round(Math.max(0, sMaq - sEntradas)),
      rede_bruto: outrosRede?.bruto || 0,
      rede_liquido: sMaq,
      rede_devolucoes: outrosRede?.devolucoes || 0,
      maquininha: sMaq,
      pix: sPix,
      na_loja_os: sPatio,
      patio_os: sPatio,
      previsto_ofx: sPrevisto,
      diferenca,
      status: Math.abs(diferenca) < 0.05 ? 'approved' : 'divergence',
      ofx_entradas_total: sEntradas,
      entradas_realizadas: sEntradas,
      entradas_previsto: sPrevisto,
      entradas_conciliadas: sPrevisto,
      dif_entradas: difEntradas,
      diferenca_entradas: difEntradas,
      ofx_saidas_total: sSaidas,
      saidas_ofx: sSaidas,
      contas_conciliadas: 0,
      contas_loja_total: 0,
      contas_loja: 0,
      dif_saidas: sSaidas,
      diferenca_saidas: sSaidas
    });
  }

  // 5. Cálculos dos 5 Pilares Globais com Baseline D-1 Real
  let totalPositivo = 0;
  let totalNegativo = 0;
  let globalOfxBalance = 0;
  storesDetail.forEach(s => {
    if (s.saldo_banco > 0) totalPositivo = round(totalPositivo + s.saldo_banco);
    if (s.saldo_banco < 0) totalNegativo = round(totalNegativo + Math.abs(s.saldo_banco));
    globalOfxBalance = round(globalOfxBalance + s.saldo_banco);
  });

  // Regra Canônica Spec 426: 100% das vendas REDE permanecem a compensar no dia (D+0)
  const cartoesACompensar = round(globalRedeNet);

  // Baseline D-1 herdado
  const prevMeta = (previousSnapshot?.metadata as any) || {};
  const caixaAnterior = Number(
    previousSnapshot?.caixa_atual 
    ?? prevMeta.caixa_atual 
    ?? 0
  );

  const baseAReceber = Number(
    manualOverrides?.aReceber 
    ?? previousSnapshot?.a_receber_manual 
    ?? prevMeta.a_receber 
    ?? prevMeta.a_receber_manual 
    ?? 0
  );
  const aReceberTotal = round(baseAReceber + globalRecebiveisNovos);

  const dinheiroMp = Number(
    manualOverrides?.dinheiroMp 
    ?? previousSnapshot?.dinheiro_mp 
    ?? prevMeta.dinheiro_mp 
    ?? 28316
  );

  const odometroAnterior = Number(
    prevMeta.odometro_hoje 
    ?? prevMeta.faturamento_odometro 
    ?? previousSnapshot?.faturamento 
    ?? 0
  );

  const faturamentoPeriodo = Number(
    manualOverrides?.faturamentoDia 
    ?? (manualOverrides?.odometroHoje && odometroAnterior > 0 ? round(manualOverrides.odometroHoje - odometroAnterior) : null)
    ?? (globalFaturamentoOs > 0 ? globalFaturamentoOs : 0)
  );

  const contasManual = Number(
    manualOverrides?.contasManual 
    ?? (results.contasPagarResults?.length > 0 ? results.contasPagarResults.reduce((acc, c) => acc + (c.totalAmount || 0), 0) : null)
    ?? previousSnapshot?.contas_a_pagar 
    ?? 0
  );
  const subtotalContas = round(contasManual + globalRedeInterest);

  // Fórmula Exata da Produção (ResumoDiaPanel):
  // Saldo Bancos Valor = Total Positivo Consolidado (OFX Positivo + Dinheiro Cofre + Cartões a Compensar)
  const saldoBancosValor = round(totalPositivo + globalDinheiro + cartoesACompensar);
  const totalStorePatio = Array.from(baselineStoresPatio.values()).reduce((a, b) => a + b, 0);
  const patioValor = (totalPatioReal && totalPatioReal > 0)
    ? totalPatioReal
    : (totalStorePatio > 0 ? totalStorePatio : (globalPatioOs > 0 ? globalPatioOs : Number(previousSnapshot?.total_patio ?? 0)));

  const caixaAtual = round(
    saldoBancosValor + 
    dinheiroMp + 
    aReceberTotal + 
    patioValor - 
    totalNegativo
  );

  const fluxoCaixa = round(caixaAtual - caixaAnterior);
  const valorDispContas = round(faturamentoPeriodo - fluxoCaixa);
  const diferencaFinal = round(valorDispContas - subtotalContas);
  const statusGeral: 'approved' | 'divergence' = Math.abs(diferencaFinal) <= 50 ? 'approved' : 'divergence';

  return {
    date: targetDate,
    data_atual: targetDate,
    total_saldo_banco: globalOfxBalance,
    total_saldo_banco_positivo: totalPositivo,
    total_saldo_banco_negativo: totalNegativo,
    saldo_bancos_ofx: globalOfxBalance,
    saldo_bancos_positivo: totalPositivo,
    saldo_bancos_ofx_positivo: totalPositivo,
    saldo_negativo_itau: totalNegativo,
    dinheiro_em_lojas: globalDinheiro,
    dinheiro_lojas: globalDinheiro,
    cartoes_a_compensar: cartoesACompensar,
    dinheiro_mp: dinheiroMp,
    a_receber: aReceberTotal,
    na_loja_os: patioValor,
    total_patio: patioValor,
    contas_manual: contasManual,
    juros_rede: globalRedeInterest,
    total_entradas_ofx: globalOfxIn,
    total_saidas_ofx: globalOfxOut,
    caixa_atual: caixaAtual,
    caixa_anterior: caixaAnterior,
    fluxo_caixa: fluxoCaixa,
    faturamento_periodo: faturamentoPeriodo,
    faturamento_oi_base: faturamentoPeriodo,
    odometro_anterior: odometroAnterior,
    odometro_hoje: manualOverrides?.odometroHoje ?? (odometroAnterior + faturamentoPeriodo),
    valor_disp_contas: valorDispContas,
    subtotal_contas: subtotalContas,
    diferenca_final: diferencaFinal,
    status_geral: statusGeral,
    is_closed: false,
    stores: storesDetail,
    stores_detail: storesDetail
  };
}
