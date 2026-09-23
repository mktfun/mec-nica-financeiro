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
  private previousBalance?: number;
  private bankTotal?: number;

  constructor(
    storeId: string,
    storeName: string,
    targetDate: string,
    ofxTransactions: RawOfxItem[] = [],
    redeSales: RawRedeSale[] = [],
    previousBalance?: number,
    bankTotal?: number
  ) {
    this.storeId = storeId;
    this.storeName = storeName;
    this.targetDate = targetDate;
    this.ofxTransactions = ofxTransactions;
    this.redeSales = redeSales;
    this.previousBalance = previousBalance !== undefined && !isNaN(Number(previousBalance)) ? Number(previousBalance) : undefined;
    this.bankTotal = bankTotal !== undefined && !isNaN(Number(bankTotal)) ? Number(bankTotal) : undefined;
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

    // Detecção de créditos de adquirente absorvidos na variação de saldo bancário (Spec 436)
    // Se a variação de saldo (bankTotal - previousBalance) for superior à soma dos lançamentos do extrato,
    // significa que o banco consolidou liquidações no saldo final sem linha avulsa de extrato.
    if (this.previousBalance !== undefined && this.bankTotal !== undefined) {
      const sumOfxCredits = this.ofxTransactions
        .filter(tx => {
          const rawType = String(tx.type || '').toLowerCase();
          return rawType === 'in' || rawType === 'credit' || rawType === 'c' || (Number(tx.amount || 0) > 0 && rawType !== 'out' && rawType !== 'debit');
        })
        .reduce((acc, tx) => acc + Math.abs(Number(tx.amount || 0)), 0);

      const sumOfxDebits = this.ofxTransactions
        .filter(tx => {
          const rawType = String(tx.type || '').toLowerCase();
          return rawType === 'out' || rawType === 'debit' || rawType === 'd' || (Number(tx.amount || 0) < 0);
        })
        .reduce((acc, tx) => acc + Math.abs(Number(tx.amount || 0)), 0);

      const expectedFinal = Number((this.previousBalance + sumOfxCredits - sumOfxDebits).toFixed(2));
      const unitemizedCredit = Number((this.bankTotal - expectedFinal).toFixed(2));

      if (unitemizedCredit > 0.05) {
        bancoCreditos.push({
          fitid: `ofx-balance-absorbed-${this.storeId}-${unitemizedCredit}`,
          dataBanco: this.targetDate,
          valorBanco: unitemizedCredit,
          memo: `CRÉDITO ADQUIRENTE ABSORVIDO NO SALDO BANCÁRIO (Diferença de Fechamento: R$ ${unitemizedCredit.toFixed(2)})`,
          brand: 'Outros',
          statusMatch: false,
          remainingAmount: unitemizedCredit,
          vinculadoSaleIds: []
        });
      }
    }

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

      const saleIsDebit = (sale.method || '').toLowerCase().includes('deb') || (sale.method || '').toLowerCase().includes('déb');
      const saleIsCredit = (sale.method || '').toLowerCase().includes('cred') || (sale.method || '').toLowerCase().includes('créd');

      const matchIdx = bancoCreditos.findIndex(c => {
        if (c.statusMatch || c.remainingAmount <= 0) return false;

        const isAbsorbedCredit = c.fitid.startsWith('ofx-balance-absorbed');
        const tolerance = isAbsorbedCredit ? Math.max(0.05, sale.valorLiquido * 0.03) : 0.05;
        if (Math.abs(c.remainingAmount - sale.valorLiquido) > tolerance) return false;

        // Se ambos especificarem tipo (debito vs credito), respeitar
        const creditIsDebit = /[\s\b](db|deb|débito|debito)[\s\b\d]/i.test(c.memo);
        const creditIsCredit = /[\s\b](at|cr|crédito|credito)[\s\b\d]/i.test(c.memo);
        if (saleIsDebit && creditIsCredit && !creditIsDebit) return false;
        if (saleIsCredit && creditIsDebit && !creditIsCredit) return false;

        return true;
      });

      if (matchIdx !== -1) {
        const credit = bancoCreditos[matchIdx];
        sale.statusMatch = true;
        sale.fitidBancoVinculado = credit.fitid;
        sale.valorBancoVinculado = sale.valorLiquido;
        sale.reasoning = credit.fitid.startsWith('ofx-balance-absorbed')
          ? `Liquidado no saldo bancário absorvido (R$ ${sale.valorLiquido.toFixed(2)})`
          : `Match determinístico 1:1 no extrato bancário (R$ ${sale.valorLiquido.toFixed(2)})`;

        credit.remainingAmount = Math.max(0, Number((credit.remainingAmount - sale.valorLiquido).toFixed(2)));
        if (credit.remainingAmount <= 0.05 || credit.fitid.startsWith('ofx-balance-absorbed')) {
          credit.statusMatch = true;
          credit.remainingAmount = 0;
        }
        credit.vinculadoSaleIds.push(sale.saleId);
      }
    }

    // =========================================================================
    // ESTÁGIO 2: Match por Soma Líquida do Lote de Bandeira e Modalidade (Spec 399 / Spec 435)
    // Agrupa as vendas da bandeira/modalidade e cruza com a soma dos créditos correspondentes no extrato
    // =========================================================================
    const brands: CardBrand[] = ['Mastercard', 'Visa', 'Elo', 'Hipercard', 'Outros'];
    const modalities: Array<'debito' | 'credito' | 'todos'> = ['debito', 'credito', 'todos'];

    for (const brand of brands) {
      for (const mod of modalities) {
        const pendingBrandSales = salesList.filter(s => {
          if (s.statusMatch || s.brand !== brand) return false;
          if (mod === 'todos') return true;
          const sIsDeb = (s.method || '').toLowerCase().includes('deb') || (s.method || '').toLowerCase().includes('déb');
          return mod === 'debito' ? sIsDeb : !sIsDeb;
        });

        const availableBrandCredits = bancoCreditos.filter(c => {
          if (c.brand !== brand || c.remainingAmount <= 0) return false;
          if (mod === 'todos') return true;
          const cIsDeb = /[\s\b](db|deb|débito|debito)[\s\b\d]/i.test(c.memo);
          const cIsCred = /[\s\b](at|cr|crédito|credito)[\s\b\d]/i.test(c.memo);
          if (mod === 'debito') return cIsDeb;
          return cIsCred;
        });

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
              s.reasoning = `Lote da bandeira ${brand} (${mod}) liquidado no OFX (Vendas: R$ ${sumSales.toFixed(2)}, Banco: R$ ${sumCredits.toFixed(2)})`;
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
    }

    // =========================================================================
    // SEGREGAÇÃO NOS 3 VETORES DE SAÍDA (Spec 435: Zero absorção cega no Estágio 3)
    // As vendas que não tiveram correspondência bancária fiduciária permanecem como 'naoEntrou' (A Compensar).
    // =========================================================================
    const conciliados = salesList.filter(s => s.statusMatch);
    const naoEntrou = salesList.filter(s => !s.statusMatch);
    const orfaosBanco = bancoCreditos.filter(c => (!c.statusMatch || c.remainingAmount > 0.05) && !c.fitid.startsWith('ofx-balance-absorbed'));

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
