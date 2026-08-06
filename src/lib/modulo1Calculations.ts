export interface GlobalConciliacaoInput {
  saldo_bancario: number; // Soma de saldos das lojas no extrato
  dinheiro_mp: number; // Manual
  a_receber_manual: number; // Manual
  na_loja_os: number; // Soma das pendências de OS do pátio (total_patio)
  saldo_negativo_itau: number; // Extraído do OFX
  caixa_anterior: number; // Caixa da última conciliação
  faturamento_atual: number; // Acumulado lido do banco (todas as receitas) hoje
  faturamento_anterior: number; // Acumulado na última conciliação
  faturamento_outros: number; // Manual
  juros_rede: number; // Extraído do relatório REDE
  contas_a_pagar: number; // Manual
  provisao: number; // Manual
}

export interface GlobalConciliacaoCalculated {
  saldo: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja: number;
  caixa_atual: number;
  fluxo_cx: number;
  faturamento: number;
  valor_disp_contas: number;
  valor_contas: number;
  diferenca: number;
}

/**
 * Calcula a conciliação diária global exata conforme a regra de negócio consolidada (agosto 2026).
 */
export function calculateGlobalConciliacao(input: GlobalConciliacaoInput): GlobalConciliacaoCalculated {
  const saldo = Number(input.saldo_bancario || 0);
  const dinheiro_mp = Number(input.dinheiro_mp || 0);
  const a_receber = Number(input.a_receber_manual || 0);
  const na_loja = Number(input.na_loja_os || 0);
  const saldo_negativo_itau = Number(input.saldo_negativo_itau || 0);

  // Caixa atual = (Soma Saldos + Dinheiro MP + A Receber + Na Loja) - Saldo Negativo
  const caixa_atual = (saldo + dinheiro_mp + a_receber + na_loja) - saldo_negativo_itau;

  // Fluxo CX = caixa atual (conciliacao hoje) - caixa anterior (caixa da conciliacao anterior)
  const fluxo_cx = caixa_atual - Number(input.caixa_anterior || 0);

  // Faturamento = (faturamento atual - anterior) + outros faturamentos
  const faturamento = (Number(input.faturamento_atual || 0) - Number(input.faturamento_anterior || 0)) + Number(input.faturamento_outros || 0);

  // Valor disp contas = fat atual + fluxo caixa
  const valor_disp_contas = faturamento + fluxo_cx;

  // Valor contas = juros REDE + contas a pagar + provisão
  const valor_contas = Number(input.juros_rede || 0) + Number(input.contas_a_pagar || 0);

  // Diferença = valor disp - contas
  const diferenca = valor_disp_contas - valor_contas;

  return {
    saldo,
    dinheiro_mp,
    a_receber,
    na_loja,
    caixa_atual,
    fluxo_cx,
    faturamento,
    valor_disp_contas,
    valor_contas,
    diferenca,
  };
}

export interface StoreSaldoState {
  store_id: string;
  store_name: string;
  saldo_banco_itau: number;
  limite_credito: number;
  cartao_entrou: number;
  cartao_nao_entrou: number;
  dinheiro_loja: number;
  dinheiro_mp_manual?: number;
  a_receber: number;
  na_loja_os: number;
  pix_os?: number;
  pix_os_expected?: number;
  faturamento_real_ofx?: number;
  faturamento_atual: number;
  faturamento_anterior: number;
  seguro_sinistro: number;
  juros_atual: number;
  caixa_anterior: number;
  valor_contas: number;
}

export interface Modulo1Calculated {
  saldo_g13: number;
  dinheiro_mp_g14: number;
  a_receber_g15: number;
  na_loja_g16: number;
  saldo_total_g17: number;
  caixa_atual_g21: number;
  fluxo_caixa_g23: number;
  faturamento_g27: number;
  disponivel_contas_g29: number;
  resultado_final_g31: number;
}

export function calculateModulo1Saldo(stores: StoreSaldoState[]): {
  storesCalculated: Record<string, Modulo1Calculated>;
  globalCalculated: Modulo1Calculated;
} {
  let globalG13 = 0;
  let globalG14 = 0;
  let globalG15 = 0;
  let globalG16 = 0;
  let globalLimite = 0;
  let globalCaixaAnt = 0;
  let globalFatAtual = 0;
  let globalFatAnt = 0;
  let globalSeguro = 0;
  let globalJuros = 0;
  let globalContas = 0;

  const storesCalculated: Record<string, Modulo1Calculated> = {};

  stores.forEach(st => {
    const g13 = Number(st.saldo_banco_itau || 0);
    const g14 = st.dinheiro_mp_manual !== undefined
      ? Number(st.dinheiro_mp_manual || 0)
      : Number(st.dinheiro_loja || 0) + Number(st.cartao_nao_entrou || 0);

    const g15 = Number(st.a_receber || 0);
    const g16 = Number(st.na_loja_os || 0);
    const g17 = g13 + g14 + g15 + g16;
    const g21 = g17 - Number(st.limite_credito || 0);
    const g23 = g21 - Number(st.caixa_anterior || 0);
    const g25 = Number(st.faturamento_atual || 0) - Number(st.faturamento_anterior || 0);
    const g27 = g25 + Number(st.seguro_sinistro || 0) + Number(st.juros_atual || 0);
    const g29 = g27 - g23;
    const g31 = g29 - Number(st.valor_contas || 0);

    storesCalculated[st.store_id] = {
      saldo_g13: g13,
      dinheiro_mp_g14: g14,
      a_receber_g15: g15,
      na_loja_g16: g16,
      saldo_total_g17: g17,
      caixa_atual_g21: g21,
      fluxo_caixa_g23: g23,
      faturamento_g27: g27,
      disponivel_contas_g29: g29,
      resultado_final_g31: g31,
    };

    globalG13 += g13;
    globalG14 += g14;
    globalG15 += g15;
    globalG16 += g16;
    globalLimite += Number(st.limite_credito || 0);
    globalCaixaAnt += Number(st.caixa_anterior || 0);
    globalFatAtual += Number(st.faturamento_atual || 0);
    globalFatAnt += Number(st.faturamento_anterior || 0);
    globalSeguro += Number(st.seguro_sinistro || 0);
    globalJuros += Number(st.juros_atual || 0);
    globalContas += Number(st.valor_contas || 0);
  });

  const globalG17 = globalG13 + globalG14 + globalG15 + globalG16;
  const globalG21 = globalG17 - globalLimite;
  const globalG23 = globalG21 - globalCaixaAnt;
  const globalG25 = globalFatAtual - globalFatAnt;
  const globalG27 = globalG25 + globalSeguro + globalJuros;
  const globalG29 = globalG27 - globalG23;
  const globalG31 = globalG29 - globalContas;

  return {
    storesCalculated,
    globalCalculated: {
      saldo_g13: globalG13,
      dinheiro_mp_g14: globalG14,
      a_receber_g15: globalG15,
      na_loja_g16: globalG16,
      saldo_total_g17: globalG17,
      caixa_atual_g21: globalG21,
      fluxo_caixa_g23: globalG23,
      faturamento_g27: globalG27,
      disponivel_contas_g29: globalG29,
      resultado_final_g31: globalG31,
    }
  };
}
