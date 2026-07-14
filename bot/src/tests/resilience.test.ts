import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// --- Mocks e Definições ---

// Schema da API parceira (estrito)
const BankTransactionSchema = z.object({
  id: z.string(), // external_id
  amount: z.number(),
  date: z.string(),
  type: z.enum(['CREDIT', 'DEBIT']),
  // Campo que pode vir corrompido (ex: banco muda pra null sem avisar)
  fee_percentage: z.number().nullable(),
});

type BankTransaction = z.infer<typeof BankTransactionSchema>;

// Supabase mock
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null }),
};

// --- Funções do Bot ---

// Função de Exponential Backoff para Rate Limit (HTTP 429)
async function fetchWithBackoff(url: string, retries = 3, delay = 1000): Promise<any> {
  try {
    // Simula fetch
    const response = await global.fetch(url);
    
    if (response.status === 429) {
      throw new Error('Rate Limit Exceeded (HTTP 429)');
    }
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: any) {
    if (retries > 0 && error.message.includes('429')) {
      const jitter = Math.random() * 200;
      await new Promise(res => setTimeout(res, delay + jitter));
      return fetchWithBackoff(url, retries - 1, delay * 2);
    }
    throw error;
  }
}

// O motor principal do bot de sincronização
async function syncTransactions(url: string) {
  let rawData: any[] = [];
  
  try {
    rawData = await fetchWithBackoff(url);
  } catch (error: any) {
    // Loga o erro crítico e aborta o loop
    await mockSupabase.from('bot_audit_logs').insert({
      bot_name: 'oficina_inteligente_sync',
      status: 'error',
      message: `Falha fatal na comunicação: ${error.message}`,
    });
    return;
  }

  // Dead Letter Queue (DLQ) pattern
  for (const item of rawData) {
    const parseResult = BankTransactionSchema.safeParse(item);
    
    if (!parseResult.success) {
      // Schema Poisoning! Joga na DLQ pra não quebrar a transação.
      await mockSupabase.from('bot_audit_logs').insert({
        bot_name: 'oficina_inteligente_sync',
        status: 'warning',
        message: 'Payload inválido recebido da API (Schema alterado?)',
        payload: item // Salva cru para inspeção manual
      });
      continue;
    }

    const tx = parseResult.data;
    // Tenta salvar usando ON CONFLICT DO UPDATE
    // (no mock do Supabase apenas representamos)
    await mockSupabase.from('transactions').insert({
      external_id: tx.id,
      amount: tx.amount,
      // ... mapeamento
    });
  }
  
  await mockSupabase.from('bot_audit_logs').insert({
    bot_name: 'oficina_inteligente_sync',
    status: 'success',
    message: `Sincronização concluída com sucesso. Total: ${rawData.length} itens.`,
  });
}

// --- Suite de Testes de Resiliência (E2E Council) ---

describe('Bot Resilience & Failover E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve usar Exponential Backoff quando receber HTTP 429 (Rate Limit)', async () => {
    let callCount = 0;
    
    // Simula a API falhando nas 2 primeiras chamadas com 429 e passando na 3ª
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({ status: 429, ok: false });
      }
      return Promise.resolve({
        status: 200,
        ok: true,
        json: () => Promise.resolve([])
      });
    });

    const startTime = Date.now();
    await syncTransactions('https://api.banco.com/v1/extract');
    const elapsed = Date.now() - startTime;

    // Atraso de 1s + 2s + Jitter = > 3000ms de espera
    expect(callCount).toBe(3);
    expect(elapsed).toBeGreaterThan(2500);
    expect(mockSupabase.from).toHaveBeenCalledWith('bot_audit_logs');
  });

  it('deve interceptar dados corrompidos usando Zod e enviar para a Dead Letter Queue (DLQ)', async () => {
    // API retorna um dado correto e um dado corrompido (fee_percentage é boolean em vez de number/null)
    const mockPayload = [
      { id: '123', amount: 100, date: '2023-10-01', type: 'CREDIT', fee_percentage: 1.5 },
      { id: '456', amount: 50, date: '2023-10-02', type: 'DEBIT', fee_percentage: false } // Corrompido
    ];

    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve(mockPayload)
    });

    await syncTransactions('https://api.banco.com/v1/extract');

    // Verifica se inseriu o dado correto em "transactions"
    expect(mockSupabase.from).toHaveBeenCalledWith('transactions');
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ external_id: '123' })
    );

    // Verifica se o dado corrompido foi jogado pra "bot_audit_logs" como warning (DLQ)
    expect(mockSupabase.from).toHaveBeenCalledWith('bot_audit_logs');
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'warning',
        message: expect.stringContaining('Payload inválido'),
        payload: mockPayload[1]
      })
    );
  });
});
