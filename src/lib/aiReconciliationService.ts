/**
 * AI RECONCILIATION SERVICE — CONCILIAPRO / OFICINA INTELIGENTE
 * 
 * Motor de Inteligência Artificial para Auditoria Contábil e Pareamento de Conciliação.
 * Utiliza o modelo campeão do benchmark: Gemini 3.5 Flash-Lite (com fallback para 3.1 Flash-Lite e Heurística Local).
 */

export interface CashAuditResult {
  osNumber: string;
  extractedCashValue: number;
  hasCash: boolean;
  rawText: string;
}

export interface DiscrepancyDiagnosis {
  status: 'CONFORME' | 'DIVERGENCIA' | 'ATENCAO';
  explanation: string;
  suggestedAction?: string;
  confidence: number;
}

export interface FuzzyMatchResult {
  transactionId: string;
  suggestedOsNumber?: string;
  suggestedStoreId?: string;
  confidence: number;
  reason: string;
}

const PRIMARY_MODEL = 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

async function callGoogleGeminiApi(
  model: string, 
  prompt: string, 
  systemInstruction: string, 
  apiKey: string
): Promise<{ success: boolean; text?: string; error?: string; elapsedMs: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const start = Date.now();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
          responseMimeType: "application/json"
        }
      })
    });

    const elapsed = Date.now() - start;
    const json = await res.json();

    if (json.error) {
      return { success: false, error: json.error.message, elapsedMs: elapsed };
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, text, elapsedMs: elapsed };
  } catch (err: any) {
    return { success: false, error: err.message, elapsedMs: Date.now() - start };
  }
}

/**
 * 1. AUDITORIA DE DINHEIRO VIVO EM ORDENS DE SERVIÇO
 * Identifica valores pagos em dinheiro na Oficina Inteligente para somar ao Pilar 1 de Saldo.
 */
export async function auditCashInOsList(
  osList: Array<{ osNumber: string; paymentForms: string }>,
  apiKey?: string
): Promise<CashAuditResult[]> {
  if (!osList || osList.length === 0) return [];

  // Se não houver chave de API, executa o Motor Determinístico Local (Fallback)
  if (!apiKey) {
    return osList.map(os => {
      const match = (os.paymentForms || '').match(/dinheiro:\s*([\d.,]+)/i);
      const val = match ? parseFloat(match[1].replace(',', '.')) : 0;
      return {
        osNumber: os.osNumber,
        extractedCashValue: isNaN(val) ? 0 : val,
        hasCash: val > 0,
        rawText: os.paymentForms
      };
    });
  }

  const prompt = `Analise as seguintes formas de pagamento de Ordens de Serviço da Oficina Inteligente e extraia com precisão o valor pago em Dinheiro Vivo (float decimal).

Linhas:
${JSON.stringify(osList, null, 2)}

Retorne um JSON no formato:
{
  "cashAudits": [
    { "osNumber": "...", "extractedCashValue": 0.00, "hasCash": true }
  ]
}`;

  // Tenta com o modelo campeão (3.5 Flash-Lite)
  let response = await callGoogleGeminiApi(
    PRIMARY_MODEL,
    prompt,
    "Você é um auditor contábil financeiro rigoroso. Extraia valores monetários sem arredondar centavos.",
    apiKey
  );

  // Se falhar, tenta o fallback (3.1 Flash-Lite)
  if (!response.success) {
    response = await callGoogleGeminiApi(
      FALLBACK_MODEL,
      prompt,
      "Você é um auditor contábil financeiro rigoroso. Extraia valores monetários sem arredondar centavos.",
      apiKey
    );
  }

  if (response.success && response.text) {
    try {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed.cashAudits)) {
        return parsed.cashAudits.map((a: any) => ({
          osNumber: String(a.osNumber),
          extractedCashValue: typeof a.extractedCashValue === 'number' ? a.extractedCashValue : 0,
          hasCash: Boolean(a.hasCash || a.extractedCashValue > 0),
          rawText: osList.find(o => String(o.osNumber) === String(a.osNumber))?.paymentForms || ''
        }));
      }
    } catch (e) {
      console.warn('[AI Service] Erro ao parsear JSON de dinheiro, aplicando fallback determinístico:', e);
    }
  }

  // Fallback determinístico caso o LLM oscile
  return osList.map(os => {
    const match = (os.paymentForms || '').match(/dinheiro:\s*([\d.,]+)/i);
    const val = match ? parseFloat(match[1].replace(',', '.')) : 0;
    return {
      osNumber: os.osNumber,
      extractedCashValue: isNaN(val) ? 0 : val,
      hasCash: val > 0,
      rawText: os.paymentForms
    };
  });
}

/**
 * 2. DIAGNÓSTICO INTELIGENTE DE DIVERGÊNCIAS NO FECHAMENTO DIÁRIO
 */
export async function diagnoseReconciliationDiscrepancy(
  metrics: {
    saldoBancosTotal: number;
    faturamentoDia: number;
    fluxoCaixa: number;
    valorDisponivelContas: number;
    contasPagas: number;
    jurosRede: number;
    devolucoesRede: number;
    diferencaFinal: number;
    dataBase: string;
  },
  apiKey?: string
): Promise<DiscrepancyDiagnosis> {
  const diff = metrics.diferencaFinal;
  const isConforme = Math.abs(diff) <= 50.00;

  // Se não houver chave de API, retorna diagnóstico determinístico padrão
  if (!apiKey) {
    if (isConforme) {
      return {
        status: 'CONFORME',
        explanation: `Fechamento conforme para ${metrics.dataBase}. Divergência residual de R$ ${diff.toFixed(2)} dentro da margem de tolerância.`,
        confidence: 1.0
      };
    }
    return {
      status: 'DIVERGENCIA',
      explanation: `Diferença de R$ ${diff.toFixed(2)} detectada entre o fluxo disponível e o subtotal de contas pagas.`,
      suggestedAction: 'Verifique se há depósitos de dinheiro pendentes ou taxas da Rede não compensadas.',
      confidence: 0.9
    };
  }

  const prompt = `Você é o Copiloto Contábil da rede de oficinas. Analise o fechamento financeiro do dia ${metrics.dataBase}:
- Saldo Bancos: R$ ${metrics.saldoBancosTotal.toFixed(2)}
- Faturamento Oficina Inteligente (Dia): R$ ${metrics.faturamentoDia.toFixed(2)}
- Fluxo de Caixa: R$ ${metrics.fluxoCaixa.toFixed(2)}
- Valor Disp. Contas: R$ ${metrics.valorDisponivelContas.toFixed(2)}
- Contas Pagas (Manual): R$ ${metrics.contasPagas.toFixed(2)}
- Juros Rede: R$ ${metrics.jurosRede.toFixed(2)}
- Devoluções Rede: R$ ${metrics.devolucoesRede.toFixed(2)}
- Diferença Calculada: R$ ${diff.toFixed(2)}

Retorne um JSON no formato:
{
  "status": "${isConforme ? 'CONFORME' : 'DIVERGENCIA'}",
  "explanation": "Explicação em 1 frase clara e técnica para o gestor financeiro.",
  "suggestedAction": "Ação recomendada se houver diferença relevante."
}`;

  let response = await callGoogleGeminiApi(
    PRIMARY_MODEL,
    prompt,
    "Você é um CFO consultor sênior. Seja conciso, direto e profissional em português brasileiro.",
    apiKey
  );

  if (!response.success) {
    response = await callGoogleGeminiApi(
      FALLBACK_MODEL,
      prompt,
      "Você é um CFO consultor sênior. Seja conciso, direto e profissional em português brasileiro.",
      apiKey
    );
  }

  if (response.success && response.text) {
    try {
      const parsed = JSON.parse(response.text);
      return {
        status: parsed.status || (isConforme ? 'CONFORME' : 'DIVERGENCIA'),
        explanation: parsed.explanation || `Fechamento do dia ${metrics.dataBase} avaliado com diferença de R$ ${diff.toFixed(2)}.`,
        suggestedAction: parsed.suggestedAction,
        confidence: 0.98
      };
    } catch (e) {
      console.warn('[AI Service] Erro ao parsear diagnóstico:', e);
    }
  }

  return {
    status: isConforme ? 'CONFORME' : 'DIVERGENCIA',
    explanation: isConforme 
      ? `Fechamento balanceado para ${metrics.dataBase}. Diferença de R$ ${diff.toFixed(2)} dentro da margem aceitável.`
      : `Diferença de R$ ${diff.toFixed(2)} requer conferência de extratos ou comprovantes.`,
    confidence: 0.85
  };
}
