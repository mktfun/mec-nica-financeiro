import { AiSettings } from '@/hooks/useAiSettings';
import { supabase } from '@/lib/supabase';

export interface MatchSuggestion {
  id: string;
  os_number?: string;
  os_id?: string;
  rede_ids?: string[];
  ofx_ids?: string[];
  reasoning: string;
  confidence: number; // 0-100
  client_name?: string;
  amount?: number;
  match_type: 'PIX_DIRECT' | 'REDE_DEPOSIT' | 'TRIPLE_MATCH';
}

export interface AiTelemetryLog {
  store_id?: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  execution_time_ms: number;
  input_payload: any;
  output_payload: any;
  reasoning_steps: any;
  raw_payload_json?: any;
  raw_response_json?: any;
  reasoning_steps_json?: any;
  matches_applied_count: number;
}


// Tabela de preços de referência por 1k tokens (USD)
const TOKEN_PRICING: Record<string, { prompt: number; completion: number }> = {
  'gemini-2.0-flash': { prompt: 0.0001, completion: 0.0004 },
  'gemini-1.5-pro': { prompt: 0.00125, completion: 0.005 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'gpt-4o': { prompt: 0.0025, completion: 0.01 },
  'claude-3-5-sonnet-20240620': { prompt: 0.003, completion: 0.015 },
  'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
};

async function saveTelemetryLog(log: AiTelemetryLog) {
  try {
    await supabase.from('ai_execution_logs').insert(log);
  } catch (err) {
    console.warn('Aviso: Não foi possível salvar o log de telemetria da IA:', err);
  }
}

export async function generateTripleMatchSuggestions(
  settings: AiSettings,
  unmatchedOs: any[],
  unmatchedRede: any[],
  unmatchedOfx: any[],
  storeId?: string
): Promise<MatchSuggestion[]> {
  if (!settings.api_key) {
    throw new Error('API Key da Inteligência Artificial não configurada em Configurações.');
  }

  const startTime = Date.now();

  const systemPrompt = `
Você é um especialista em inteligência de conciliação financeira para oficinas mecânicas.
Sua missão é analisar lançamentos não pareados de:
1. Ordens de Serviço (OSs do Pátio) - com número da OS, cliente, valor total, valor em PIX, valor em cartão e datas.
2. Transações de Adquirente (Rede) - com NSU, valor bruto, valor líquido e datas de pagamento.
3. Extrato Bancário (OFX Banco Itaú) - com descrições (ex: "PIX QR CODE RECEBIDO RONILDO DOS17/07"), valores depositados e datas.

Instruções Inteligentes de Associação:
- **Match de PIX:** Se houver um PIX no extrato OFX (ex: R$ 680,00 recebido de RONILDO) e uma OS do Pátio no valor de R$ 680,00 (ou com PIX de R$ 680,00) de cliente similar ("Ronildo dos Santos Lima"), associe-os imediatamente com ALTA CONFIANÇA (90-99%), explicando que o nome e valor coincidem.
- **Match por Tolerância de Taxas de Cartão:** Lembre-se que a adquirente (Rede) cobra taxas de MDR. O valor líquido que cai no banco pode ser de 1% a 4% menor que o bruto da OS.
- **Janela de Datas:** Depósitos no banco podem ocorrer de 1 a 7 dias após a emissão da OS. Não rejeite um match apenas porque o PIX foi feito em D-3 ou D-6.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON estrito):
Sua resposta DEVE ser um objeto JSON válido com a chave "matches" contendo um array de objetos.
Cada objeto do array DEVE seguir esta estrutura:
{
  "id": "uuid-curto-gerado",
  "os_number": "número da OS se houver",
  "os_id": "id interno da OS se houver",
  "rede_ids": ["id da transação da rede 1", ...],
  "ofx_ids": ["id da transação do ofx 1", ...],
  "reasoning": "Explicação em português curta e direta do motivo da associação",
  "confidence": 95,
  "client_name": "Nome do cliente envolvido",
  "amount": 680.00,
  "match_type": "PIX_DIRECT" | "REDE_DEPOSIT" | "TRIPLE_MATCH"
}

Se não encontrar associações plausíveis, retorne {"matches": []}.
`;

  const payload = {
    os: (unmatchedOs || []).map(o => {
      const raw = o.raw_os || o.os_data || o;
      const totalVal = Number(o.total_value || o.amount || raw.total_value || raw.paid_value || 0);
      const pixVal = Number(o.pix_value || o.pix_transfer_value || raw.pix_transfer_value || raw.parsed_pix_transfer || 0);
      const creditVal = Number(o.credit_value || o.credit_debit_value || raw.credit_debit_value || raw.parsed_credit || 0);
      const osNum = String(o.os_number || raw.os_number || o.id || raw.id || '');
      const clientName = o.client_name || raw.client_name || raw.customer_name || 'Cliente';

      return {
        id: osNum,
        os_number: osNum,
        client_name: clientName,
        total_value: totalVal > 0 ? totalVal : (pixVal + creditVal),
        pix_value: pixVal,
        credit_value: creditVal,
        opened_at: o.opened_at || raw.opened_at || raw.created_at || o.created_at,
        payment_method: o.payment_method || raw.payment_method || ''
      };
    }).filter(o => o.total_value > 0 || o.pix_value > 0 || o.credit_value > 0),

    rede: (unmatchedRede || []).map(r => {
      const raw = r.raw_rede || r;
      return {
        id: raw.id || r.id,
        title: raw.title || raw.maquininha_title || r.title || 'Rede',
        gross_value: Number(raw.gross_value || raw.rede_bruto || raw.amount || r.amount || 0),
        net_value: Number(raw.net_value || raw.amount || r.amount || 0),
        payment_date: raw.occurred_at || raw.payment_date || r.payment_date,
        nsu: raw.nsu || r.nsu || ''
      };
    }).filter(r => r.gross_value > 0 || r.net_value > 0),

    ofx: (unmatchedOfx || []).map(t => {
      const ofxObj = t.ofxDeposit || t.ofxPix || t;
      return {
        id: ofxObj.id,
        description: ofxObj.title || ofxObj.subtitle || ofxObj.memo || ofxObj.description || '',
        amount: Number(ofxObj.amount || 0),
        occurred_at: ofxObj.occurred_at || ofxObj.date
      };
    }).filter(t => Math.abs(t.amount) > 0)
  };


  const userMessage = `Analise os dados abaixo e retorne as associações recomendadas em JSON:\n${JSON.stringify(payload, null, 2)}`;

  let rawResponse: any = null;
  let matchesResult: MatchSuggestion[] = [];
  let promptTokens = 0;
  let completionTokens = 0;

  // 1. Google Gemini Provider
  if (settings.provider === 'google') {
    const modelName = settings.model || 'gemini-2.0-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${settings.api_key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Erro na API do Google Gemini (${res.status}): ${errorText}`);
    }

    rawResponse = await res.json();
    const rawText = rawResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    
    promptTokens = rawResponse.usageMetadata?.promptTokenCount || Math.ceil(userMessage.length / 4);
    completionTokens = rawResponse.usageMetadata?.candidatesTokenCount || Math.ceil((rawText || '').length / 4);

    if (rawText) {
      const parsed = JSON.parse(rawText);
      matchesResult = parsed.matches || [];
    }
  }

  // 2. OpenAI GPT Provider
  else if (settings.provider === 'openai') {
    const modelName = settings.model || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.api_key}`
      },
      body: JSON.stringify({
        model: modelName,
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Erro na API da OpenAI (${res.status}): ${errorText}`);
    }

    rawResponse = await res.json();
    const rawText = rawResponse.choices?.[0]?.message?.content;

    promptTokens = rawResponse.usage?.prompt_tokens || Math.ceil(userMessage.length / 4);
    completionTokens = rawResponse.usage?.completion_tokens || Math.ceil((rawText || '').length / 4);

    if (rawText) {
      const parsed = JSON.parse(rawText);
      matchesResult = parsed.matches || [];
    }
  }

  // 3. Anthropic Claude Provider
  else if (settings.provider === 'anthropic') {
    const modelName = settings.model || 'claude-3-5-sonnet-20240620';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.api_key,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage + "\nRetorne APENAS o JSON puro no formato {\"matches\": [...]}" }
        ]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Erro na API da Anthropic Claude (${res.status}): ${errorText}`);
    }

    rawResponse = await res.json();
    const rawText = rawResponse.content?.[0]?.text;

    promptTokens = rawResponse.usage?.input_tokens || Math.ceil(userMessage.length / 4);
    completionTokens = rawResponse.usage?.output_tokens || Math.ceil((rawText || '').length / 4);

    if (rawText) {
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      matchesResult = parsed.matches || [];
    }
  }

  const totalTokens = promptTokens + completionTokens;
  const rates = TOKEN_PRICING[settings.model] || { prompt: 0.00015, completion: 0.0006 };
  const estimatedCost = (promptTokens / 1000) * rates.prompt + (completionTokens / 1000) * rates.completion;
  const executionTimeMs = Date.now() - startTime;

  // Grava Log de Auditoria & Telemetria no Supabase com mapeamento correto de colunas
  await saveTelemetryLog({
    store_id: storeId,
    provider: settings.provider,
    model: settings.model,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    estimated_cost: estimatedCost,
    execution_time_ms: executionTimeMs,
    input_payload: payload,
    output_payload: rawResponse,
    reasoning_steps: matchesResult.map(m => ({ id: m.id, os_number: m.os_number, confidence: m.confidence, reasoning: m.reasoning, client_name: m.client_name, amount: m.amount })),
    raw_payload_json: payload,
    raw_response_json: rawResponse,
    reasoning_steps_json: matchesResult,
    matches_applied_count: matchesResult.filter(m => m.confidence >= 90).length,
  });

  return matchesResult;
}


