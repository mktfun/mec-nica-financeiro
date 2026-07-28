import { createClient } from '@supabase/supabase-js';
import { RedeTransacao } from '../scrapers/rede';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);

/**
 * Faz bulk insert das transações da Rede no Supabase.
 * Usa ON CONFLICT DO NOTHING para idempotência total —
 * pode rodar múltiplas vezes sem criar duplicatas.
 */
export async function uploadRedeTransacoes(
  transacoes: RedeTransacao[],
  storeMap: Record<string, string> // nome_normalizado -> store_id
): Promise<void> {
  if (transacoes.length === 0) {
    console.log('[Uploader] Nenhuma transação da Rede para enviar.');
    return;
  }

  const rows = transacoes.map((tx) => {
    // Tenta encontrar a loja pelo nome do estabelecimento (Rede)
    const normalizedEstab = tx.estabelecimento.trim().toLowerCase();
    const matchedStoreId = Object.entries(storeMap).find(([name]) => 
      normalizedEstab.includes(name) || name.includes(normalizedEstab)
    )?.[1] || null;

    return {
      store_id: matchedStoreId,
      title: `${tx.modalidade.toUpperCase()} Rede — ${tx.estabelecimento}`,
      subtitle: tx.nsu ? `NSU: ${tx.nsu}` : null,
      amount: tx.valor_liquido || tx.valor_bruto,
      type: 'in' as const,
      status: 'completed' as const,
      payment_method: tx.modalidade,
      os_number: null, // Rede não tem nº OS — será cruzado depois
      external_id: `rede_${tx.nsu || Math.random().toString(36).substring(7)}`,
      raw_data: tx,
      occurred_at: new Date(`${tx.data}T12:00:00`).toISOString(),
      target_date: tx.data,
      source: 'rede',
      icon_type: tx.modalidade.includes('debito') ? 'card' : tx.modalidade.includes('credito') ? 'card' : 'bank',
    };
  });

  // Chunk de 100 para evitar timeout
  const chunkSize = 100;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('transactions')
      .upsert(chunk, { onConflict: 'store_id,target_date,source,amount', ignoreDuplicates: true });

    if (error) {
      console.error(`[Uploader] Erro ao inserir chunk ${i}–${i + chunkSize}:`, error.message);
    } else {
      console.log(`[Uploader] Inserido chunk ${i}–${Math.min(i + chunkSize, rows.length)} (${chunk.length} registros)`);
    }
  }
}

/**
 * Busca o mapeamento cnpj -> store_id do banco.
 */
export async function getStoreMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name');

  if (error) {
    console.error('[Uploader] Erro ao buscar stores:', error.message);
    return {};
  }

  const map: Record<string, string> = {};
  for (const store of data || []) {
    if (store.name) {
      const nameClean = store.name.trim().toLowerCase();
      map[nameClean] = store.id;
    }
  }
  return map;
}

/**
 * Busca as credenciais do bot do banco (tabela bot_credentials).
 */
export async function getBotCredentials(portal: 'oficina_inteligente' | 'rede') {
  const { data, error } = await supabase
    .from('bot_credentials')
    .select('username, password, url')
    .eq('portal', portal)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `[Uploader] Credenciais não encontradas para "${portal}". Configure em Configurações > Bot de Automação.`
    );
  }

  return data;
}
