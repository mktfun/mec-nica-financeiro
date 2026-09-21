import { extractCardBrand, CardBrand } from '@/lib/llm-matcher';

export interface RawOfxItem {
  id?: string;
  fitid: string;
  type?: string;
  amount: number;
  date?: string;
  occurred_at?: string;
  title?: string;
  memo?: string;
  counterpart_name?: string;
}

export interface RawRedeSale {
  id?: string;
  nsu?: string;
  authorization?: string;
  tid?: string;
  brand?: string;
  method?: string;
  dateVenda?: string;
  date?: string;
  creditDate?: string;
  grossAmount?: number;
  netAmount: number;
  feeAmount?: number;
  manualCategory?: string;
  machineName?: string;
}

export interface MatchedRedeSale {
  saleId: string;
  nsu?: string;
  authorization?: string;
  brand: CardBrand;
  method: string;
  dataVenda: string;
  dataPrevista: string;
  valorBruto: number;
  valorLiquido: number;
  statusMatch: boolean;
  fitidBancoVinculado?: string;
  valorBancoVinculado?: number;
  reasoning: string;
  rawSale: RawRedeSale;
}

export interface CleanOfxCredit {
  fitid: string;
  dataBanco: string;
  valorBanco: number;
  memo: string;
  brand: CardBrand;
  statusMatch: boolean;
  remainingAmount: number;
  vinculadoSaleIds: string[];
}

export interface ReconciliadorRedeOfxOutput {
  storeId: string;
  storeName: string;
  totalVendasLiquidas: number;
  totalCreditadoBanco: number;
  totalNaoEntrou: number;
  totalOrfaosBanco: number;
  conciliados: MatchedRedeSale[];
  naoEntrou: MatchedRedeSale[];
  orfaosBanco: CleanOfxCredit[];
}

/**
 * Motor de Reconciliação Bipartido Determinístico (Rede x OFX)
 * Implementação pura em TypeScript conforme especificação técnica.
 */
export class ReconciliadorRedeOFX {
  private storeId: string;
  private storeName: string;
  private targetDate: string;
  private ofxTransactions: RawOfxItem[];
  private redeSales: RawRedeSale[];

  constructor(
    storeId: string,
    storeName: string,
    targetDate: string,
    ofxTransactions: RawOfxItem[] = [],
    redeSales: RawRedeSale[] = []
  ) {
    this.storeId = storeId;
    this.storeName = storeName;
    this.targetDate = targetDate;
    this.ofxTransactions = ofxTransactions;
    this.redeSales = redeSales;
  }

  /**
   * Extrai e filtra apenas créditos legítimos de adquirente ocorridos na data alvo.
   * Descarta débitos (saídas), rendimentos, tarifas e aplicações.
   */
  public parseEFiltrarOfx(): CleanOfxCredit[] {
    const cleanTargetDate = this.targetDate.replace(/[-/]/g, '').slice(0, 8);
    const regexAdquirente = /REDE|REDECARD|MAST|VISA|ELO|HIPER|CIELO|GETNET|STONE|CARTAO|ADQ/i;
    const regexExclusoes = /REND|APLIC|RESG|CDB|LCI|LCA|JUROS|POUP|AUT APR|TARIFA/i;

    const creditos: CleanOfxCredit[] = [];

    this.ofxTransactions.forEach((tx, idx) => {
      const valor = Math.abs(Number(tx.amount || 0));
      const rawType = String(tx.type || '').toLowerCase();
      const isCredit = rawType === 'in' || rawType === 'credit' || rawType === 'c' || (Number(tx.amount || 0) > 0 && rawType !== 'out' && rawType !== 'debit');

      if (!isCredit || valor <= 0) return;

      const fullMemo = `${tx.title || ''} ${tx.memo || ''} ${tx.counterpart_name || (tx as any).counterpart || ''}`.trim();

      // Filtro de negócio: deve conter tag de adquirente e não ser rendimento/aplicação
      if (!regexAdquirente.test(fullMemo) || regexExclusoes.test(fullMemo)) {
        return;
      }

      // Validação da data do extrato (D0 da conciliação ou janela de fim de semana/feriado de até 4 dias)
      const rawDate = tx.occurred_at || tx.date || this.targetDate;
      const cleanTxDate = String(rawDate).replace(/[-/]/g, '').slice(0, 8);
      const txParsed = String(rawDate).split('T')[0];
      const diffDays = Math.round(Math.abs(new Date(this.targetDate + 'T12:00:00Z').getTime() - new Date(txParsed + 'T12:00:00Z').getTime()) / 86400000);
      const isMatchWindow = cleanTxDate === cleanTargetDate || diffDays <= 4;
      if (!isMatchWindow) {
        return;
      }

      const fitid = tx.fitid || tx.id || `ofx-credit-${idx}-${valor}`;
      const brand = extractCardBrand(fullMemo);

      creditos.push({
        fitid,
        dataBanco: rawDate.split('T')[0],
        valorBanco: Number(valor.toFixed(2)),
        memo: fullMemo,
        brand,
        statusMatch: false,
        remainingAmount: Number(valor.toFixed(2)),
        vinculadoSaleIds: []
      });
    });

    return creditos;
  }

  /**
   * Executa o Casamento Bipartido (Previsto vs Realizado) com segregação nos 3 vetores.
   */
  public executarReconciliacao(): ReconciliadorRedeOfxOutput {
    const bancoCreditos = this.parseEFiltrarOfx();

    // Padroniza as vendas da Rede com resolução precisa e tolerante de bandeira
    const salesList: MatchedRedeSale[] = this.redeSales.map((s, idx) => {
      const saleId = s.id || (s.nsu ? `nsu-${s.nsu}` : (s.authorization ? `auth-${s.authorization}` : `sale-${idx}`));
      const dataVenda = (s.dateVenda || s.date || this.targetDate).split('T')[0];
      const dataPrevista = (s.creditDate || s.date || this.targetDate).split('T')[0];
      const valorBruto = Number((s.grossAmount ?? s.netAmount ?? 0).toFixed(2));
      const valorLiquido = Number(Number(s.netAmount || 0).toFixed(2));
      
      let brand: CardBrand = 'Outros';
      if (s.brand && s.brand !== 'Outros') {
        const parsed = extractCardBrand(s.brand);
        if (parsed !== 'Outros') brand = parsed;
      }
      if (brand === 'Outros' && s.manualCategory) {
        const parsed = extractCardBrand(s.manualCategory);
        if (parsed !== 'Outros') brand = parsed;
      }
      if (brand === 'Outros') {
        const textToSearch = `${s.machineName || ''} ${s.method || ''} ${s.authorization || ''} ${s.nsu || ''}`;
        brand = extractCardBrand(textToSearch);
      }

      return {
        saleId,
        nsu: s.nsu,
        authorization: s.authorization,
        brand,
        method: s.method || 'Cartão',
        dataVenda,
        dataPrevista,
        valorBruto,
        valorLiquido,
        statusMatch: false,
        reasoning: 'Pendente de liquidação bancária (A Compensar)',
        rawSale: s
      };
    });

    const totalVendasLiquidas = Number(salesList.reduce((acc, s) => acc + s.valorLiquido, 0).toFixed(2));
    const totalCreditadoBanco = Number(bancoCreditos.reduce((acc, b) => acc + b.valorBanco, 0).toFixed(2));

    // Se não há créditos bancários no dia (ex: Piraporinha em 10/09), todas as vendas vão para Não Entrou
    if (bancoCreditos.length === 0) {
      return {
        storeId: this.storeId,
        storeName: this.storeName,
        totalVendasLiquidas,
        totalCreditadoBanco: 0,
        totalNaoEntrou: totalVendasLiquidas,
        totalOrfaosBanco: 0,
        conciliados: [],
        naoEntrou: salesList,
        orfaosBanco: []
      };
    }

    // =========================================================================
    // ESTÁGIO 1: Match Determinístico Greedy 1:1 (Mesma Data e Mesmo Valor Líquido)
    // =========================================================================
    for (const sale of salesList) {
      if (sale.statusMatch) continue;

      const matchIdx = bancoCreditos.findIndex(c => 
        !c.statusMatch &&
        c.remainingAmount > 0 &&
        Math.abs(c.remainingAmount - sale.valorLiquido) <= 0.01
      );

      if (matchIdx !== -1) {
        const credit = bancoCreditos[matchIdx];
        sale.statusMatch = true;
        sale.fitidBancoVinculado = credit.fitid;
        sale.valorBancoVinculado = sale.valorLiquido;
        sale.reasoning = `Match determinístico 1:1 no extrato bancário (R$ ${sale.valorLiquido.toFixed(2)})`;

        credit.statusMatch = true;
        credit.remainingAmount = 0;
        credit.vinculadoSaleIds.push(sale.saleId);
      }
    }

    // =========================================================================
    // ESTÁGIO 2: Match por Soma Líquida do Lote de Bandeira (Spec 399)
    // Agrupa todas as vendas da bandeira e cruza com a soma dos créditos daquela bandeira no extrato
    // =========================================================================
    const brands: CardBrand[] = ['Mastercard', 'Visa', 'Elo', 'Hipercard', 'Outros'];
    for (const brand of brands) {
      const pendingBrandSales = salesList.filter(s => !s.statusMatch && s.brand === brand);
      const availableBrandCredits = bancoCreditos.filter(c => c.brand === brand && c.remainingAmount > 0);

      const sumSales = Number(pendingBrandSales.reduce((acc, s) => acc + s.valorLiquido, 0).toFixed(2));
      const sumCredits = Number(availableBrandCredits.reduce((acc, c) => acc + c.remainingAmount, 0).toFixed(2));

      if (sumSales > 0 && sumCredits > 0) {
        const diff = Math.abs(sumCredits - sumSales);
        // Bate se a diferença for até R$ 0.05 ou pequena variação por desconto MDR
        const isMatch = diff <= 0.05 || (diff <= Math.max(0.05, sumSales * 0.03) && sumCredits <= sumSales);

        if (isMatch) {
          pendingBrandSales.forEach(s => {
            s.statusMatch = true;
            s.fitidBancoVinculado = availableBrandCredits[0]?.fitid;
            s.valorBancoVinculado = s.valorLiquido;
            s.reasoning = `Lote da bandeira ${brand} liquidado integralmente no OFX (Vendas: R$ ${sumSales.toFixed(2)}, Banco: R$ ${sumCredits.toFixed(2)})`;
          });

          let remainingToDeduct = sumSales;
          for (const c of availableBrandCredits) {
            const deduct = Math.min(c.remainingAmount, remainingToDeduct);
            c.remainingAmount = Number((c.remainingAmount - deduct).toFixed(2));
            remainingToDeduct = Number((remainingToDeduct - deduct).toFixed(2));
            c.statusMatch = true;
            pendingBrandSales.forEach(s => c.vinculadoSaleIds.push(s.saleId));
            if (remainingToDeduct <= 0) break;
          }
        }
      }
    }

    // =========================================================================
    // ESTÁGIO 3: Lote Consolidado Loja (quando o banco recebe depósito integral)
    // =========================================================================
    const remainingPendingSales = salesList.filter(s => !s.statusMatch);
    const sumPending = Number(remainingPendingSales.reduce((acc, s) => acc + s.valorLiquido, 0).toFixed(2));
    let totalRemainingCredit = Number(bancoCreditos.reduce((acc, c) => acc + c.remainingAmount, 0).toFixed(2));

    if (sumPending > 0 && totalRemainingCredit >= sumPending - 0.05) {
      remainingPendingSales.forEach(s => {
        s.statusMatch = true;
        s.fitidBancoVinculado = bancoCreditos[0]?.fitid;
        s.valorBancoVinculado = s.valorLiquido;
        s.reasoning = `Lote consolidado da loja creditado no OFX (R$ ${totalCreditadoBanco.toFixed(2)})`;
      });

      let remainingToDeduct = sumPending;
      for (const c of bancoCreditos) {
        if (c.remainingAmount <= 0) continue;
        const deduct = Math.min(c.remainingAmount, remainingToDeduct);
        c.remainingAmount = Number((c.remainingAmount - deduct).toFixed(2));
        remainingToDeduct = Number((remainingToDeduct - deduct).toFixed(2));
        c.statusMatch = true;
        if (remainingToDeduct <= 0) break;
      }
    } else if (totalRemainingCredit > 0 && remainingPendingSales.length > 0) {
      // Cobertura parcial gulosa: maiores vendas primeiro
      const sorted = [...remainingPendingSales].sort((a, b) => b.valorLiquido - a.valorLiquido);
      for (const s of sorted) {
        const availableCredit = bancoCreditos.find(c => c.remainingAmount >= s.valorLiquido - 0.05);
        if (availableCredit) {
          s.statusMatch = true;
          s.fitidBancoVinculado = availableCredit.fitid;
          s.valorBancoVinculado = s.valorLiquido;
          s.reasoning = `Coberto por crédito parcial da adquirente no OFX (${availableCredit.fitid})`;
          availableCredit.remainingAmount = Number((availableCredit.remainingAmount - s.valorLiquido).toFixed(2));
          availableCredit.statusMatch = true;
          availableCredit.vinculadoSaleIds.push(s.saleId);
        }
      }
    }

    // =========================================================================
    // SEGREGAÇÃO NOS 3 VETORES DE SAÍDA
    // =========================================================================
    const conciliados = salesList.filter(s => s.statusMatch);
    const naoEntrou = salesList.filter(s => !s.statusMatch);
    const orfaosBanco = bancoCreditos.filter(c => !c.statusMatch || c.remainingAmount > 0.05);

    const totalNaoEntrou = Number(naoEntrou.reduce((acc, s) => acc + s.valorLiquido, 0).toFixed(2));
    const totalOrfaosBanco = Number(orfaosBanco.reduce((acc, c) => acc + c.remainingAmount, 0).toFixed(2));

    return {
      storeId: this.storeId,
      storeName: this.storeName,
      totalVendasLiquidas,
      totalCreditadoBanco,
      totalNaoEntrou,
      totalOrfaosBanco,
      conciliados,
      naoEntrou,
      orfaosBanco
    };
  }
}
