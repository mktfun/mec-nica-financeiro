import { supabase } from '@/lib/supabase';

export interface RedeSaleItem {
  id?: string;
  nsu?: string;
  authorization?: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  method: string;
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
 * Reconcilia Vendas da Rede (D-1) com Créditos OFX (D0) usando Google Gemini com Fallback Determinístico.
 */
export async function reconcileRedeWithOfxViaGemini(
  storeId: string,
  storeName: string,
  targetDate: string,
  redeSales: RedeSaleItem[],
  ofxCredits: OfxCreditItem[],
  apiKey?: string,
  modelName: string = 'gemini-2.5-flash'
): Promise<RedeReconciliationResult> {
  const totalVendasLiquidas = redeSales.reduce((acc, s) => acc + (s.netAmount || 0), 0);
  const totalCreditadoOfx = ofxCredits.reduce((acc, o) => acc + (o.amount || 0), 0);

  // Se não houver vendas ou créditos, retorno rápido
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

  // Tenta resolver com Gemini se a chave existir
  const keyToUse = getGeminiApiKey(apiKey);

  if (keyToUse && keyToUse.trim().length > 10) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout estrito

      const systemPrompt = `Você é um auditor financeiro sênior especializado em conciliação bancária de cartões (Rede) e extratos (OFX Itaú).
Sua missão:
1. Avaliar cada venda líquida da Rede e determinar se ela JÁ CAIU no extrato bancário de hoje ou se AINDA NÃO CAIU (está A COMPENSAR).
2. Note que a Rede pode creditar as vendas individualmente ou agrupadas em lote por bandeira/tipo (ex: Débito Elo, Crédito Visa, Mastercard).
3. Se a soma dos créditos do extrato bater ou cobrir as vendas líquidas, todas as vendas correspondentes devem ser marcadas como "entrou" (status: "entrou").
4. Apenas vendas que efetivamente NÃO foram creditadas hoje devem ser marcadas como "nao_entrou" (A Compensar).

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON puro):
{
  "sales": [
    {
      "index": 0,
      "status": "entrou" | "nao_entrou",
      "matchedOfx": "fitid ou descrição se houver",
      "reasoning": "Breve justificativa contábil"
    }
  ],
  "aCompensarTotal": 0.00
}`;

      const userContent = JSON.stringify({
        loja: storeName,
        dataFechamento: targetDate,
        vendasRede: redeSales.map((s, idx) => ({
          index: idx,
          bruto: s.grossAmount,
          taxa: s.feeAmount,
          liquido: s.netAmount,
          metodo: s.method,
          dataVenda: s.dateVenda
        })),
        creditosOfx: ofxCredits.map(c => ({
          fitid: c.fitid,
          descricao: c.title,
          valor: c.amount,
          data: c.date
        }))
      }, null, 2);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${keyToUse}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const salesStatus = redeSales.map((sale, idx) => {
            const matchInfo = parsed.sales?.find((s: any) => s.index === idx);
            const isEntrou = matchInfo ? matchInfo.status === 'entrou' : false;
            return {
              sale,
              status: isEntrou ? ('entrou' as const) : ('nao_entrou' as const),
              matchedOfxFitid: matchInfo?.matchedOfx,
              reasoning: matchInfo?.reasoning || (isEntrou ? 'Conciliado via Gemini' : 'Pendente de compensação')
            };
          });

          const aCompensarReal = salesStatus
            .filter(s => s.status === 'nao_entrou')
            .reduce((acc, s) => acc + (s.sale.netAmount || 0), 0);

          return {
            storeId,
            storeName,
            totalVendasLiquidas,
            totalCreditadoOfx,
            aCompensarReal: Number(aCompensarReal.toFixed(2)),
            salesStatus,
            aiUsed: true,
            modelUsed: modelName
          };
        }
      }
    } catch (aiErr) {
      console.warn(`[Gemini Matcher] Fallback acionado para ${storeName}:`, aiErr);
    }
  }

  // --- FALLBACK DETERMINÍSTICO DE ALTA PRECISÃO ---
  // Se a soma do OFX for igual ou maior que as vendas líquidas, todas entraram
  const diff = totalCreditadoOfx - totalVendasLiquidas;
  const isTotalmenteLiquidado = Math.abs(diff) < 0.10 || diff >= 0;

  if (isTotalmenteLiquidado) {
    return {
      storeId,
      storeName,
      totalVendasLiquidas,
      totalCreditadoOfx,
      aCompensarReal: 0,
      salesStatus: redeSales.map(sale => ({
        sale,
        status: 'entrou',
        reasoning: 'Valor creditado integralmente no OFX do dia (Fallback determinístico)'
      })),
      aiUsed: false
    };
  }

  // Se o OFX for parcial, vincula pelo valor exato de cada venda
  let saldoOfxDisponivel = totalCreditadoOfx;
  const salesStatus = redeSales.map(sale => {
    // Procura se tem um crédito de OFX exatamente igual ao líquido da venda
    const exactOfx = ofxCredits.find(o => Math.abs(o.amount - sale.netAmount) < 0.05);
    if (exactOfx) {
      return {
        sale,
        status: 'entrou' as const,
        matchedOfxFitid: exactOfx.fitid,
        reasoning: `Match exato no extrato OFX: R$ ${sale.netAmount.toFixed(2)}`
      };
    }

    if (saldoOfxDisponivel >= sale.netAmount - 0.05) {
      saldoOfxDisponivel -= sale.netAmount;
      return {
        sale,
        status: 'entrou' as const,
        reasoning: 'Lote consolidado coberto pelos créditos do OFX'
      };
    }

    return {
      sale,
      status: 'nao_entrou' as const,
      reasoning: 'Aguardando liquidação bancária (A Compensar)'
    };
  });

  const aCompensarReal = salesStatus
    .filter(s => s.status === 'nao_entrou')
    .reduce((acc, s) => acc + (s.sale.netAmount || 0), 0);

  return {
    storeId,
    storeName,
    totalVendasLiquidas,
    totalCreditadoOfx,
    aCompensarReal: Number(aCompensarReal.toFixed(2)),
    salesStatus,
    aiUsed: false
  };
}

/**
 * Pareador Fuzzy Inteligente de PIX no Extrato com OSs do Pátio via Google Gemini
 */
export async function matchPixWithOsViaGemini(
  storeId: string,
  unmatchedOs: Array<{ id: string; os_number: string; client_name: string; amount: number }>,
  unmatchedOfxPix: Array<{ id: string; fitid: string; title: string; counterpart_name?: string; amount: number }>,
  apiKey?: string,
  modelName: string = 'gemini-2.5-flash'
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
