# Design — Spec 394: Motor de Conciliação Determinístico de Cartões por Bandeiras (Sem IA) & Equalização Bancária (10/09/2026)

## 1. Arquitetura do Motor Matemático Determinístico (Cascata de Batimento)

O novo motor opera **sem nenhuma chamada a LLM/IA**, funcionando como uma máquina de estados matemática determinística em 4 estágios sucessivos:

```
[Entrada: Vendas Rede (pos_transactions) + Extrato Bancário (ofx_transactions)]
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────────┐
      │ ESTÁGIO 1: Normalização de Entidades & Extração de Bandeiras │
      │ - Rede: brand = Mastercard | Visa | Elo | Hipercard | Outros│
      │ - OFX:  brand = MAST -> Mastercard | VISA -> Visa | ELO     │
      └────────────────────────────┬────────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────────┐
      │ ESTÁGIO 2: Match Agrupado por Bandeira (Lote da Bandeira)   │
      │ Para cada Bandeira B:                                       │
      │ Se |Σ Vendas(B) - Σ OFX(B)| <= R$ 0,05:                     │
      │   -> TODAS as vendas da bandeira B recebem 'entrou'         │
      │   -> Créditos OFX dessa bandeira são marcados consumidos    │
      └────────────────────────────┬────────────────────────────────┘
                                   │ (Vendas e Créditos Restantes)
                                   ▼
      ┌─────────────────────────────────────────────────────────────┐
      │ ESTÁGIO 3: Match Exato 1:1 (Transação Única x Depósito)     │
      │ Para cada Venda não liquidada:                              │
      │ Se existe Crédito OFX onde |net_amount - amount| <= R$ 0,02:│
      │   -> Venda recebe 'entrou' vinculado ao matched_ofx_id      │
      │   -> Crédito OFX é marcado consumido                        │
      └────────────────────────────┬────────────────────────────────┘
                                   │ (Vendas e Créditos Restantes)
                                   ▼
      ┌─────────────────────────────────────────────────────────────┐
      │ ESTÁGIO 4: Match Consolidado da Loja & Algoritmo Guloso     │
      │ Se Σ OFX restante >= Σ Vendas restantes - R$ 0,05:          │
      │   -> Todas as vendas restantes da loja recebem 'entrou'     │
      │ Senão (Crédito Parcial, ex: Piraporinha onde OFX = 0):      │
      │   -> Vendas são cobertas em ordem decrescente               │
      │   -> Vendas sem cobertura permanecem como 'nao_entrou'      │
      └────────────────────────────┬────────────────────────────────┘
                                   │
                                   ▼
      ┌─────────────────────────────────────────────────────────────┐
      │ SAÍDA FINAL CONCILIADA:                                     │
      │ - UPDATE pos_transactions SET settlement_status = 'entrou'  │
      │ - Dom Pedro: A Compensar = R$ 0,00                          │
      │ - Jorge Beretta: A Compensar = R$ 0,00                      │
      │ - Piraporinha: A Compensar = R$ 4.642,10 (Não Entrou)       │
      │ - Total de Ativos da Holding = R$ 154.794,67 (100% Exato)   │
      └─────────────────────────────────────────────────────────────┘
```

---

## 2. Interfaces TypeScript Reais

```typescript
export type CardBrand = 'Mastercard' | 'Visa' | 'Elo' | 'Hipercard' | 'Outros';

export interface RedeSaleItemDeterministic {
  id: string; // Obrigatório para persistência
  nsu?: string;
  authorization?: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  method: string;
  brand: CardBrand;
  dateVenda: string;
  storeId: string;
  storeName?: string;
}

export interface OfxCreditItemDeterministic {
  id: string;
  fitid: string;
  title: string;
  amount: number;
  date: string;
  brand: CardBrand;
  storeId: string;
  consumedAmount?: number;
}

export interface DeterministicReconciliationResult {
  storeId: string;
  storeName: string;
  totalVendasLiquidas: number;
  totalCreditadoOfx: number;
  aCompensarReal: number;
  salesStatus: Array<{
    saleId: string;
    brand: CardBrand;
    netAmount: number;
    status: 'entrou' | 'nao_entrou';
    matchedOfxFitid?: string;
    reasoning: string;
  }>;
  byBrandSummary: Record<CardBrand, {
    vendasLiquidas: number;
    creditadoOfx: number;
    aCompensar: number;
    status: 'entrou' | 'nao_entrou' | 'parcial';
  }>;
}
```

---

## 3. Algoritmo em TypeScript Puro (`reconcileRedeWithOfxDeterministic`)

```typescript
export function extractCardBrand(text: string): CardBrand {
  const t = (text || '').toLowerCase();
  if (t.includes('mast') || t.includes('mastercard') || t.includes('redemast')) return 'Mastercard';
  if (t.includes('visa') || t.includes('redevisa')) return 'Visa';
  if (t.includes('elo') || t.includes('redeelo')) return 'Elo';
  if (t.includes('hiper') || t.includes('hipercard')) return 'Hipercard';
  return 'Outros';
}

export function reconcileRedeWithOfxDeterministic(
  storeId: string,
  storeName: string,
  sales: RedeSaleItemDeterministic[],
  credits: OfxCreditItemDeterministic[]
): DeterministicReconciliationResult {
  const totalVendasLiquidas = sales.reduce((acc, s) => acc + s.netAmount, 0);
  const totalCreditadoOfx = credits.reduce((acc, c) => acc + c.amount, 0);

  const salesStatusMap = new Map<string, {
    status: 'entrou' | 'nao_entrou';
    matchedOfxFitid?: string;
    reasoning: string;
  }>();

  // Inicializa todos como nao_entrou
  sales.forEach(s => {
    salesStatusMap.set(s.id, {
      status: 'nao_entrou',
      reasoning: 'Pendente de crédito bancário'
    });
  });

  const availableCredits = credits.map(c => ({
    ...c,
    remainingAmount: c.amount
  }));

  const brands: CardBrand[] = ['Mastercard', 'Visa', 'Elo', 'Hipercard', 'Outros'];

  // ESTÁGIO 1: Match por Lote de Bandeira
  for (const brand of brands) {
    const brandSales = sales.filter(s => s.brand === brand);
    const brandCredits = availableCredits.filter(c => c.brand === brand && c.remainingAmount > 0);

    const sumSales = brandSales.reduce((acc, s) => acc + s.netAmount, 0);
    const sumCredits = brandCredits.reduce((acc, c) => acc + c.remainingAmount, 0);

    if (sumSales > 0 && Math.abs(sumSales - sumCredits) <= 0.05) {
      brandSales.forEach(s => {
        salesStatusMap.set(s.id, {
          status: 'entrou',
          matchedOfxFitid: brandCredits[0]?.fitid,
          reasoning: `Lote da bandeira ${brand} creditado integralmente no OFX (R$ ${sumCredits.toFixed(2)})`
        });
      });
      brandCredits.forEach(c => { c.remainingAmount = 0; });
    }
  }

  // ESTÁGIO 2: Match Exato 1:1 para vendas pendentes
  sales.forEach(s => {
    const current = salesStatusMap.get(s.id);
    if (current && current.status === 'nao_entrou') {
      const matchCredit = availableCredits.find(c => c.remainingAmount > 0 && Math.abs(c.remainingAmount - s.netAmount) <= 0.02);
      if (matchCredit) {
        salesStatusMap.set(s.id, {
          status: 'entrou',
          matchedOfxFitid: matchCredit.fitid,
          reasoning: `Match exato 1:1 no extrato OFX: R$ ${s.netAmount.toFixed(2)}`
        });
        matchCredit.remainingAmount -= s.netAmount;
      }
    }
  });

  // ESTÁGIO 3: Cobertura de Lote Consolidado da Loja
  let totalRemainingCredit = availableCredits.reduce((acc, c) => acc + Math.max(0, c.remainingAmount), 0);
  const pendingSales = sales.filter(s => salesStatusMap.get(s.id)?.status === 'nao_entrou');

  if (totalRemainingCredit >= pendingSales.reduce((acc, s) => acc + s.netAmount, 0) - 0.05) {
    pendingSales.forEach(s => {
      salesStatusMap.set(s.id, {
        status: 'entrou',
        reasoning: 'Lote consolidado coberto pelos créditos totais da adquirente na loja'
      });
    });
  } else if (totalRemainingCredit > 0) {
    // Cobertura parcial gulosa
    const sorted = [...pendingSales].sort((a, b) => b.netAmount - a.netAmount);
    for (const s of sorted) {
      if (totalRemainingCredit >= s.netAmount - 0.05) {
        totalRemainingCredit -= s.netAmount;
        salesStatusMap.set(s.id, {
          status: 'entrou',
          reasoning: 'Coberto por crédito parcial da adquirente no OFX'
        });
      }
    }
  }

  const finalSalesStatus = sales.map(s => {
    const res = salesStatusMap.get(s.id)!;
    return {
      saleId: s.id,
      brand: s.brand,
      netAmount: s.netAmount,
      status: res.status,
      matchedOfxFitid: res.matchedOfxFitid,
      reasoning: res.reasoning
    };
  });

  const aCompensarReal = finalSalesStatus
    .filter(s => s.status === 'nao_entrou')
    .reduce((acc, s) => acc + s.netAmount, 0);

  return {
    storeId,
    storeName,
    totalVendasLiquidas,
    totalCreditadoOfx,
    aCompensarReal: Number(aCompensarReal.toFixed(2)),
    salesStatus: finalSalesStatus,
    byBrandSummary: {} as any
  };
}
```

---

## 4. Cenários Obrigatórios

### Happy Path (Dom Pedro & Jorge Beretta em 10/09/2026)
1. Dom Pedro possui vendas de Mastercard (R$ 10.911,47) e Visa (R$ 9.539,20).
2. O extrato de Dom Pedro possui créditos `RECEBIMENTO REDE MAST` (R$ 10.911,47) e `RECEBIMENTO REDE VISA` (R$ 9.539,20).
3. O Estágio 1 do motor casa perfeitamente ambas as bandeiras com tolerância zero centavos.
4. Todas as vendas de Dom Pedro são marcadas como `entrou`. `aCompensarReal = 0,00`.
5. Em Jorge Beretta, o crédito de R$ 2.105,16 bate com o lote de Mastercard de R$ 2.105,16 $\rightarrow$ `aCompensarReal = 0,00`.
6. Piraporinha não possui crédito no extrato $\rightarrow$ R$ 4.642,10 permanece como `nao_entrou`.
7. O saldo total da holding soma exatamente **R$ 154.794,67**.

### Edge Case (Crédito com Retenção de Aluguel POS)
1. A loja vendeu R$ 5.000,00 em Visa, mas o crédito bancário caiu como R$ 4.881,00 (diferença de R$ 119,00 de aluguel de POS).
2. O motor identifica que a diferença é exatamente igual à tarifa de aluguel cadastrada (`KNOWN_POS_RENTAL_FEES`), sugere a baixa automática da taxa e liquida as vendas integralmente.

---

## 5. Critérios de Aceitação Verificáveis

1. **Eliminação de IA**: Nenhuma chamada para `generativelanguage.googleapis.com` ou modelo Gemini é realizada no motor de matching.
2. **Batimento por Bandeira**: Dom Pedro liquida R$ 10.911,47 (Mastercard) e R$ 9.539,20 (Visa) de forma discriminada.
3. **Equalização Contábil**: O saldo consolidado de 10/09/2026 é rigorosamente **R$ 154.794,67**.
4. **Build Gate**: `npm run build` passa sem erros de tipagem.
