export interface StoreSaldoState {
  store_id: string;
  store_name: string;
  saldo_banco_itau: number;
  limite_credito: number;
  cartao_entrou: number;
  cartao_nao_entrou: number;
  dinheiro_loja: number;
  dinheiro_mp_manual?: number; // Preenchimento manual conforme pedido do usuário
  a_receber: number;
  na_loja_os: number;
  pix_os?: number;             // PIX recebido nas OSs do dia
  faturamento_atual: number;
  faturamento_anterior: number;
  seguro_sinistro: number;
  juros_atual: number;
  caixa_anterior: number;
  valor_contas: number;
}

export interface Modulo1Calculated {
  saldo_g13: number;             // Soma Saldo Banco Itaú
  dinheiro_mp_g14: number;       // Dinheiro MP (Preenchimento manual / apurado)
  a_receber_g15: number;         // Soma Módulo 3 (Recebíveis)
  na_loja_g16: number;           // Soma Módulo 2 (OSs em aberto na loja)
  saldo_total_g17: number;       // G13 + G14 + G15 + G16
  caixa_atual_g21: number;       // G17 - Limite Consolidado
  fluxo_caixa_g23: number;       // G21 - Caixa Anterior
  faturamento_g27: number;       // (FatAtual - FatAnt) + Seguro + Juros
  disponivel_contas_g29: number; // G27 - G23 (Faturamento - Fluxo Caixa)
  resultado_final_g31: number;   // G29 - G30 (Saldo Livre Real)
}

/**
 * Utilitário central de cálculo da Aba SALDO (Módulo 1 da planilha CONCILIACAO-2307.xlsx)
 * Aplica rigorosamente as fórmulas de G13 a G31 da planilha
 */
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
    // Dinheiro MP: Se fornecido manual usa o manual; senão soma dinheiro da loja + cartões não entrou
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
