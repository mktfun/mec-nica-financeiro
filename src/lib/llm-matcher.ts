import { supabase } from '@/lib/supabase';

export type CardBrand = 'Mastercard' | 'Visa' | 'Elo' | 'Hipercard' | 'Outros';

export interface RedeSaleItem {
  id?: string;
  nsu?: string;
  authorization?: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  method: string;
  brand?: CardBrand;
  dateVenda: string;
  previsaoPgto?: string;
  storeId?: string;
  storeName?: string;
}

export interface OfxCreditItem {
  id?: string;
  fitid?: string;
  title: string;
  amount: number;
  date: string;
  brand?: CardBrand;
  storeId?: string;
}

export interface RedeReconciliationResult {
  storeId: string;
  storeName: string;
  totalVendasLiquidas: number;
  totalCreditadoOfx: number;
  aCompensarReal: number; // Vendas que ainda NÃO caíram
  salesStatus: Array<{
    sale: RedeSaleItem;
    status: 'entrou' | 'nao_entrou';
    matchedOfxFitid?: string;
    reasoning: string;
  }>;
  aiUsed: boolean;
  modelUsed?: string;
  byBrandSummary?: Record<string, {
    vendasLiquidas: number;
    creditadoOfx: number;
    aCompensar: number;
    status: 'entrou' | 'nao_entrou' | 'parcial';
  }>;
}

export interface AiTripleMatchResult {
  matches: Array<{
    id: string;
    os_number?: string;
    ofx_fitid?: string;
    amount: number;
    client_name?: string;
    match_type: 'PIX_DIRECT' | 'REDE_DEPOSIT' | 'TRIPLE_MATCH';
    confidence: number;
    reasoning: string;
  }>;
  aiUsed: boolean;
}

function getGeminiApiKey(explicitKey?: string): string {
  if (explicitKey && explicitKey.trim().length > 5) return explicitKey.trim();
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) {
      return String((import.meta as any).env.VITE_GEMINI_API_KEY).trim();
    }
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) {
      return String(process.env.VITE_GEMINI_API_KEY).trim();
    }
  } catch (_) {}
  return '';
}

/**
 * Extrai a bandeira do cartão a partir do método de pagamento ou texto do extrato/transação
 */
export function extractCardBrand(text: string): CardBrand {
  const t = (text || '').toLowerCase();
  if (t.includes('mast') || t.includes('mastercard') || t.includes('redemast')) return 'Mastercard';
  if (t.includes('visa') || t.includes('redevisa')) return 'Visa';
  if (t.includes('elo') || t.includes('redeelo')) return 'Elo';
  if (t.includes('hiper') || t.includes('hipercard')) return 'Hipercard';
  return 'Outros';
}

/**
 * Reconcilia Vendas da Rede (D-1) com Créditos OFX (D0) usando Motor 100% Determinístico e Matemático por Bandeiras (Sem IA).
 */
export function reconcileRedeWithOfxDeterministic(
  storeId: string,
  storeName: string,
  targetDate: string,
  redeSales: RedeSaleItem[],
  ofxCredits: OfxCreditItem[]
): RedeReconciliationResult {
  // Filtra os créditos da adquirente ocorridos na data de conciliação (D0) ou no dia útil seguinte (D+1),
  // permitindo o casamento de liquidações matinais de débito e antecipação sem vazar para períodos distantes.
  const targetCredits = ofxCredits.filter(c => {
    if (!c.date) return true;
    const cleanDate = c.date.replace(/[-/]/g, '').slice(0, 8);
    const cleanTarget = targetDate.replace(/[-/]/g, '').slice(0, 8);
    if (cleanDate === cleanTarget) return true;

    try {
      const d1 = new Date(c.date.slice(0, 10));
      const d2 = new Date(targetDate.slice(0, 10));
      const diffDays = Math.round(Math.abs((d1.getTime() - d2.getTime()) / 86400000));
      return diffDays <= 1;
    } catch {
      return false;
    }
  });

  const totalCreditadoOfx = Number(targetCredits.reduce((acc, o) => acc + Number(o.amount || 0), 0).toFixed(2));

  if (redeSales.length === 0) {
    return {
      storeId,
      storeName,
      totalVendasLiquidas: 0,
      totalCreditadoOfx,
      aCompensarReal: 0,
      salesStatus: [],
      aiUsed: false
    };
  }

  // Enriquece as vendas e créditos com suas bandeiras normalizadas
  const enrichedSales = redeSales.map((s, idx) => ({
    ...s,
    tempIndex: idx,
    brand: s.brand || extractCardBrand(`${s.method || ''} ${s.nsu || ''}`)
  }));

  const availableCredits = targetCredits.map((c, idx) => ({
    ...c,
    tempIndex: idx,
    brand: c.brand || extractCardBrand(c.title || ''),
    remainingAmount: Number(c.amount || 0)
  }));

  const salesStatusMap = new Map<number, {
    status: 'entrou' | 'nao_entrou';
    matchedOfxFitid?: string;
    reasoning: string;
  }>();

  // Inicializa todas as vendas como pendentes (nao_entrou)
  enrichedSales.forEach(s => {
    salesStatusMap.set(s.tempIndex, {
      status: 'nao_entrou',
      reasoning: 'Aguardando liquidação bancária (A Compensar)'
    });
  });

  const brands: CardBrand[] = ['Mastercard', 'Visa', 'Elo', 'Hipercard', 'Outros'];
  const brandSummary: Record<string, { vendasLiquidas: number; creditadoOfx: number; aCompensar: number; status: 'entrou' | 'nao_entrou' | 'parcial' }> = {};

  // =========================================================================
  // ESTÁGIO 1: Match Agrupado por Lote da Bandeira
  // =========================================================================
  for (const brand of brands) {
    const brandSales = enrichedSales.filter(s => s.brand === brand);
    const brandCredits = availableCredits.filter(c => c.brand === brand && c.remainingAmount > 0);

    const sumSales = Number(brandSales.reduce((acc, s) => acc + Number(s.netAmount || 0), 0).toFixed(2));
    const sumCredits = Number(brandCredits.reduce((acc, c) => acc + Number(c.remainingAmount || 0), 0).toFixed(2));

    if (sumSales > 0) {
      // Se o total de créditos da bandeira cobrir as vendas da bandeira com tolerância de centavos
      if (sumCredits >= sumSales - 0.05) {
        brandSales.forEach(s => {
          salesStatusMap.set(s.tempIndex, {
            status: 'entrou',
            matchedOfxFitid: brandCredits[0]?.fitid,
            reasoning: `Lote da bandeira ${brand} creditado integralmente no OFX (R$ ${sumCredits.toFixed(2)})`
          });
        });

        // Abate proporcional do saldo disponível dos créditos da bandeira
        let remainingToDeduct = sumSales;
        for (const c of brandCredits) {
          const deduct = Math.min(c.remainingAmount, remainingToDeduct);
          c.remainingAmount = Number((c.remainingAmount - deduct).toFixed(2));
          remainingToDeduct = Number((remainingToDeduct - deduct).toFixed(2));
          if (remainingToDeduct <= 0) break;
        }

        brandSummary[brand] = {
          vendasLiquidas: sumSales,
          creditadoOfx: sumCredits,
          aCompensar: 0,
          status: 'entrou'
        };
      } else {
        brandSummary[brand] = {
          vendasLiquidas: sumSales,
          creditadoOfx: sumCredits,
          aCompensar: Number(Math.max(0, sumSales - sumCredits).toFixed(2)),
          status: sumCredits > 0 ? 'parcial' : 'nao_entrou'
        };
      }
    }
  }

  // =========================================================================
  // ESTÁGIO 2: Match Exato 1:1 (Transação Individual x Depósito OFX Único)
  // =========================================================================
  enrichedSales.forEach(s => {
    const cur = salesStatusMap.get(s.tempIndex);
    if (cur && cur.status === 'nao_entrou') {
      const matchCredit = availableCredits.find(c => c.remainingAmount > 0 && Math.abs(c.remainingAmount - Number(s.netAmount || 0)) <= 0.02);
      if (matchCredit) {
        salesStatusMap.set(s.tempIndex, {
          status: 'entrou',
          matchedOfxFitid: matchCredit.fitid,
          reasoning: `Match exato 1:1 no extrato OFX: R$ ${Number(s.netAmount).toFixed(2)}`
        });
        matchCredit.remainingAmount = Number((matchCredit.remainingAmount - Number(s.netAmount)).toFixed(2));
      }
    }
  });

  // =========================================================================
  // ESTÁGIO 3: Cobertura de Lote Consolidado da Loja & Algoritmo Guloso
  // =========================================================================
  let totalRemainingCredit = Number(availableCredits.reduce((acc, c) => acc + Math.max(0, c.remainingAmount), 0).toFixed(2));
  const pendingSales = enrichedSales.filter(s => salesStatusMap.get(s.tempIndex)?.status === 'nao_entrou');
  const sumPendingSales = Number(pendingSales.reduce((acc, s) => acc + Number(s.netAmount || 0), 0).toFixed(2));

  if (totalRemainingCredit >= sumPendingSales - 0.05 && sumPendingSales > 0) {
    pendingSales.forEach(s => {
      salesStatusMap.set(s.tempIndex, {
        status: 'entrou',
        reasoning: 'Lote consolidado coberto pelos créditos totais da adquirente na loja'
      });
    });
  } else if (totalRemainingCredit > 0 && pendingSales.length > 0) {
    // Cobertura parcial gulosa (maiores vendas primeiro)
    const sorted = [...pendingSales].sort((a, b) => Number(b.netAmount) - Number(a.netAmount));
    for (const s of sorted) {
      if (totalRemainingCredit >= Number(s.netAmount) - 0.05) {
        totalRemainingCredit = Number((totalRemainingCredit - Number(s.netAmount)).toFixed(2));
        salesStatusMap.set(s.tempIndex, {
          status: 'entrou',
          reasoning: 'Coberto por crédito parcial da adquirente no OFX'
        });
      }
    }
  }

  // =========================================================================
  // COMPILAÇÃO DOS RESULTADOS
  // =========================================================================
  const finalSalesStatus = enrichedSales.map(s => {
    const res = salesStatusMap.get(s.tempIndex)!;
    return {
      sale: s,
      status: res.status,
      matchedOfxFitid: res.matchedOfxFitid,
      reasoning: res.reasoning
    };
  });

  const aCompensarReal = Number(
    finalSalesStatus
      .filter(s => s.status === 'nao_entrou')
      .reduce((acc, s) => acc + Number(s.sale.netAmount || 0), 0)
      .toFixed(2)
  );

  return {
    storeId,
    storeName,
    totalVendasLiquidas,
    totalCreditadoOfx,
    aCompensarReal,
    salesStatus: finalSalesStatus,
    aiUsed: false,
    modelUsed: 'deterministic-brand-engine',
    byBrandSummary: brandSummary
  };
}

/**
 * Reconcilia Vendas da Rede (D-1) com Créditos OFX (D0).
 * Wrapper retrocompatível que utiliza estritamente o motor determinístico por bandeiras (100% Sem IA).
 */
export async function reconcileRedeWithOfxViaGemini(
  storeId: string,
  storeName: string,
  targetDate: string,
  redeSales: RedeSaleItem[],
  ofxCredits: OfxCreditItem[],
  _apiKey?: string,
  _modelName: string = 'gemini-3.5-flash-lite'
): Promise<RedeReconciliationResult> {
  // Delegação direta para o motor determinístico sem chamadas a APIs externas
  return reconcileRedeWithOfxDeterministic(storeId, storeName, targetDate, redeSales, ofxCredits);
}

/**
 * Pareador Fuzzy Inteligente de PIX no Extrato com OSs do Pátio via Google Gemini
 */
export async function matchPixWithOsViaGemini(
  storeId: string,
  unmatchedOs: Array<{ id: string; os_number: string; client_name: string; amount: number }>,
  unmatchedOfxPix: Array<{ id: string; fitid: string; title: string; counterpart_name?: string; amount: number }>,
  apiKey?: string,
  modelName: string = 'gemini-3.5-flash-lite'
): Promise<AiTripleMatchResult> {
  const keyToUse = getGeminiApiKey(apiKey);

  if (!keyToUse || unmatchedOs.length === 0 || unmatchedOfxPix.length === 0) {
    // Fallback determinístico por valor exato
    const matches: any[] = [];
    const usedOs = new Set<string>();

    unmatchedOfxPix.forEach(pix => {
      const foundOs = unmatchedOs.find(os => !usedOs.has(os.id) && Math.abs(os.amount - pix.amount) < 0.10);
      if (foundOs) {
        usedOs.add(foundOs.id);
        matches.push({
          id: crypto.randomUUID(),
          os_number: foundOs.os_number,
          ofx_fitid: pix.fitid,
          amount: pix.amount,
          client_name: foundOs.client_name,
          match_type: 'PIX_DIRECT',
          confidence: 100,
          reasoning: `Match exato de valor: R$ ${pix.amount.toFixed(2)}`
        });
      }
    });

    return { matches, aiUsed: false };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const systemPrompt = `Você é um reconciliador bancário inteligente. Analise transferências PIX do extrato e Ordens de Serviço (OSs).
Encontre associações entre os dois considerando:
1. Valores idênticos ou com variação de centavos.
2. Similaridade entre o nome do pagador no PIX e o nome do cliente na OS (ex: "Mauro Juliani" x "Mauro J Cogo").
Retorne APENAS um JSON: {"matches": [{"os_number": "...", "ofx_fitid": "...", "amount": 0.00, "confidence": 95, "reasoning": "..."}]}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyToUse}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: 'user',
          parts: [{
            text: JSON.stringify({
              osList: unmatchedOs,
              pixList: unmatchedOfxPix
            })
          }]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          matches: (parsed.matches || []).map((m: any) => ({
            id: crypto.randomUUID(),
            os_number: m.os_number,
            ofx_fitid: m.ofx_fitid,
            amount: Number(m.amount || 0),
            match_type: 'PIX_DIRECT',
            confidence: Number(m.confidence || 90),
            reasoning: m.reasoning || 'Pareamento via Gemini'
          })),
          aiUsed: true
        };
      }
    }
  } catch (err) {
    console.warn("[matchPixWithOsViaGemini] Fallback para determinístico:", err);
  }

  // Fallback se API falhar
  const matches: any[] = [];
  const usedOs = new Set<string>();

  unmatchedOfxPix.forEach(pix => {
    const foundOs = unmatchedOs.find(os => !usedOs.has(os.id) && Math.abs(os.amount - pix.amount) < 0.10);
    if (foundOs) {
      usedOs.add(foundOs.id);
      matches.push({
        id: crypto.randomUUID(),
        os_number: foundOs.os_number,
        ofx_fitid: pix.fitid,
        amount: pix.amount,
        client_name: foundOs.client_name,
        match_type: 'PIX_DIRECT',
        confidence: 95,
        reasoning: `Match exato por valor (Fallback): R$ ${pix.amount.toFixed(2)}`
      });
    }
  });

  return { matches, aiUsed: false };
}
