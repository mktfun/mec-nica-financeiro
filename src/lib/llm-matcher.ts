import { AiSettings } from '@/hooks/useAiSettings';
import { PatioOsRow, ReceivableRow, TransactionRow } from '@/lib/supabase';

export interface MatchSuggestion {
  os_id: string;
  rede_ids: string[];
  ofx_ids: string[];
  reasoning: string;
  confidence: number; // 0-100
}

export async function generateTripleMatchSuggestions(
  settings: AiSettings,
  unmatchedOs: PatioOsRow[],
  unmatchedRede: ReceivableRow[],
  unmatchedOfx: TransactionRow[]
): Promise<MatchSuggestion[]> {
  if (!settings.api_key) {
    throw new Error('API Key da Inteligência Artificial não configurada.');
  }

  const systemPrompt = `
Você é um especialista em conciliação financeira (Triple Match).
Sua tarefa é encontrar correlações exatas ou parciais entre:
1. Ordens de Serviço (OS)
2. Transações de Adquirente (Rede)
3. Extrato Bancário (OFX)

Em muitos casos, uma OS é paga em múltiplos cartões/Pix, resultando em várias transações na Rede e no banco.
A Rede cobra taxas, então o valor que cai no banco (OFX) ou que está na Rede (líquido) pode ser menor que o valor pago na OS.

Regras de Associação:
- Uma OS pode ter Múltiplos Recebíveis e Múltiplas Transações bancárias.
- Retorne um JSON com a chave "matches" contendo um array de objetos.
- Cada objeto deve ter: "os_id" (string), "rede_ids" (array de strings), "ofx_ids" (array de strings), "reasoning" (string curta explicando o raciocínio), "confidence" (0-100).
- Associe apenas quando tiver alta confiança.
`;

  const payload = {
    os: unmatchedOs.map(o => ({ id: o.id, value: o.total_value, paid: o.paid_value, date: o.exit_date, customer: o.customer_name })),
    rede: unmatchedRede.map(r => ({ id: r.id, net_value: r.net_value, gross_value: r.gross_value, date: r.payment_date, nsu: r.nsu })),
    ofx: unmatchedOfx.map(t => ({ id: t.id, amount: t.amount, date: t.date, memo: t.memo }))
  };

  const userMessage = JSON.stringify(payload);

  if (settings.provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.api_key}`
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        response_format: { type: "json_object" },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Erro na OpenAI: ${error}`);
    }

    const data = await res.json();
    const result = JSON.parse(data.choices[0].message.content);
    return result.matches || [];
  }
  
  if (settings.provider === 'google') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Erro no Google Gemini: ${error}`);
    }

    const data = await res.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    return result.matches || [];
  }

  throw new Error(`Provedor de IA não suportado: ${settings.provider}`);
}
