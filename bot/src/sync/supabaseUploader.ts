import { createClient } from '@supabase/supabase-js';
import { RedeTransacao } from '../scrapers/rede';
import { decryptBankPassword } from '../lib/credentialCrypto';
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

export interface BankBotCredentialRecord {
  id: string;
  store_id: string;
  bank_code: string;
  bank_name: string;
  agency: string;
  account_number: string;
  operator_cpf: string;
  password: string;
  access_type: 'full' | 'view_only';
  is_active: boolean;
  last_status?: string | null;
  last_sync_at?: string | null;
  last_error?: string | null;
}

/**
 * Busca credenciais bancárias ativas na tabela bank_bot_credentials e decifra a senha para o bot.
 */
export async function getBankBotCredentials(
  storeId?: string,
  bankCode = 'itau'
): Promise<BankBotCredentialRecord[]> {
  let query = supabase
    .from('bank_bot_credentials')
    .select('*')
    .eq('is_active', true);

  if (storeId) {
    query = query.eq('store_id', storeId);
  }
  if (bankCode) {
    query = query.eq('bank_code', bankCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Uploader] Erro ao buscar credenciais bancárias:', error.message);
    throw new Error(`[Uploader] Falha ao consultar credenciais bancárias: ${error.message}`);
  }

  const list: BankBotCredentialRecord[] = [];
  for (const row of data || []) {
    let plainPassword = '';
    try {
      plainPassword = await decryptBankPassword(row.encrypted_password || '');
    } catch (err: any) {
      console.warn(`[Uploader] Não foi possível decifrar senha da conta ${row.account_number}:`, err?.message || err);
    }

    list.push({
      id: row.id,
      store_id: row.store_id,
      bank_code: row.bank_code,
      bank_name: row.bank_name,
      agency: row.agency,
      account_number: row.account_number,
      operator_cpf: row.operator_cpf,
      password: plainPassword,
      access_type: row.access_type,
      is_active: row.is_active,
      last_status: row.last_status,
      last_sync_at: row.last_sync_at,
      last_error: row.last_error,
    });
  }

  return list;
}

export interface UploadOfxBufferOptions {
  storeId: string;
  bankCode?: string;
  bankName?: string;
  fileName: string;
  fileSizeBytes: number;
  content: string;
  sha256: string;
  fromDate: string;
  toDate: string;
}

export interface UploadOfxBufferResult {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  sha256: string;
  expiresAt: string;
  purgedCount: number;
}

/**
 * Salva o extrato OFX como texto na tabela temporária bot_downloaded_files com retenção de 48h
 * e aciona o expurgo de registros com mais de 2 dias.
 */
export async function uploadOfxBufferToSupabase(
  options: UploadOfxBufferOptions
): Promise<UploadOfxBufferResult> {
  const {
    storeId,
    bankCode = 'itau',
    bankName = 'Itaú Empresas',
    fileName,
    fileSizeBytes,
    content,
    sha256,
    fromDate,
    toDate,
  } = options;

  console.log(`[Uploader] Salvando extrato OFX no buffer do Supabase: ${fileName} (${(fileSizeBytes / 1024).toFixed(1)} KB)...`);

  const { data, error } = await supabase
    .from('bot_downloaded_files')
    .insert({
      store_id: storeId,
      bank_code: bankCode,
      bank_name: bankName,
      file_name: fileName,
      file_size_bytes: fileSizeBytes,
      content,
      sha256,
      from_date: fromDate,
      to_date: toDate,
      status: 'available',
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    .select('id, file_name, file_size_bytes, sha256, expires_at')
    .single();

  if (error || !data) {
    console.error('[Uploader] Erro ao salvar OFX no buffer do Supabase:', error?.message || error);
    throw new Error(`[Uploader] Falha ao gravar extrato no buffer do Supabase: ${error?.message}`);
  }

  // Executa auto-limpeza de arquivos com mais de 2 dias
  let purgedCount = 0;
  try {
    const { data: purgeResult, error: purgeErr } = await supabase.rpc('purge_expired_bot_files');
    if (!purgeErr && typeof purgeResult === 'number') {
      purgedCount = purgeResult;
      if (purgedCount > 0) {
        console.log(`[Uploader] 🧹 Limpeza automática: ${purgedCount} arquivo(s) expirado(s) removido(s).`);
      }
    }
  } catch (purgeError) {
    console.warn('[Uploader] Aviso: falha ao rodar purge_expired_bot_files:', purgeError);
  }

  console.log(`[Uploader] ✅ Extrato salvo com sucesso no buffer temporário! ID: ${data.id}`);

  return {
    id: data.id,
    fileName: data.file_name,
    fileSizeBytes: data.file_size_bytes,
    sha256: data.sha256,
    expiresAt: data.expires_at,
    purgedCount,
  };
}


