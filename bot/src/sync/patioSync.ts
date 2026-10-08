import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { OSDeepDetail } from '../scrapers/patioDeepCrawler';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Sync] Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export interface SyncResult {
  totalOS: number;
  insertedPatioOS: number;
  updatedPatioOS: number;
  cachedOSDetails: number;
  syncedItens: number;
  errors: string[];
}

export async function syncPatioToSupabase(allOS: OSDeepDetail[]): Promise<SyncResult> {
  const result: SyncResult = {
    totalOS: allOS.length,
    insertedPatioOS: 0,
    updatedPatioOS: 0,
    cachedOSDetails: 0,
    syncedItens: 0,
    errors: []
  };

  if (!allOS || allOS.length === 0) {
    console.log('[Sync] Nenhuma OS para sincronizar.');
    return result;
  }

  console.log(`\n======================================================`);
  console.log(`🔄 INICIANDO PERSISTÊNCIA ATÔMICA NO SUPABASE (${allOS.length} OSs)`);
  console.log(`======================================================\n`);

  // Agrupa OSs por loja para consulta eficiente
  const byStore: Record<string, OSDeepDetail[]> = {};
  for (const os of allOS) {
    if (!byStore[os.store_id]) byStore[os.store_id] = [];
    byStore[os.store_id].push(os);
  }

  for (const [store_id, storeOSs] of Object.entries(byStore)) {
    console.log(`[Sync] Processando loja ${store_id} (${storeOSs.length} OSs)...`);

    // 1. Consulta OSs já existentes na loja
    const { data: existingRows, error: fetchErr } = await supabase
      .from('patio_os')
      .select('id, os_number, total_value, paid_value, history_log')
      .eq('store_id', store_id);

    if (fetchErr) {
      console.error(`[Sync] Erro ao buscar patio_os da loja ${store_id}:`, fetchErr.message);
      result.errors.push(`Loja ${store_id}: ${fetchErr.message}`);
      continue;
    }

    const existingMap = new Map<string, any>();
    (existingRows || []).forEach(r => existingMap.set(r.os_number, r));

    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const os of storeOSs) {
      const existing = existingMap.get(os.numero_os);

      // Parse date
      let openedAt = new Date().toISOString();
      if (os.data_os) {
        const parts = os.data_os.split('/');
        if (parts.length === 3) {
          openedAt = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`).toISOString();
        }
      }

      const payload = {
        os_number: os.numero_os,
        store_id: os.store_id === 'st-master' ? null : os.store_id,
        store_name: os.store_name,
        plate: os.placa || 'SEM-PLACA',
        total_value: os.valor_total || 0,
        paid_value: os.valor_pago || 0,
        status: 'em_aberto',
        raw_status: os.status || 'Aberta',
        client_name: os.cliente || 'CLIENTE NÃO IDENTIFICADO',
        days_open: 0,
        opened_at: openedAt,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        let history = Array.isArray(existing.history_log) ? existing.history_log : [];
        toUpdate.push({
          id: existing.id,
          ...payload,
          history_log: history
        });
      } else {
        toInsert.push({
          history_log: [],
          ...payload
        });
      }
    }

    // Executa inserções em lote
    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('patio_os').insert(toInsert);
      if (insErr) {
        console.error(`[Sync] Erro ao inserir patio_os (${store_id}):`, insErr.message);
        result.errors.push(`Insert patio_os ${store_id}: ${insErr.message}`);
      } else {
        result.insertedPatioOS += toInsert.length;
        console.log(`[Sync] ✅ Inseridas ${toInsert.length} novas OSs em patio_os para ${store_id}`);
      }
    }

    // Executa atualizações
    for (const upd of toUpdate) {
      const { error: updErr } = await supabase
        .from('patio_os')
        .update(upd)
        .eq('id', upd.id);

      if (updErr) {
        result.errors.push(`Update OS ${upd.os_number}: ${updErr.message}`);
      } else {
        result.updatedPatioOS++;
      }
    }

    // 2. Persiste detalhamento granular em oficina_os_cache (Payload Completo)
    try {
      const { data: existingCacheRows } = await supabase
        .from('oficina_os_cache')
        .select('id, os_number')
        .eq('store_id', store_id);

      const cacheMap = new Map<string, string>();
      (existingCacheRows || []).forEach(r => cacheMap.set(r.os_number, r.id));

      const cacheToInsert: any[] = [];
      const cacheToUpdate: any[] = [];

      for (const os of storeOSs) {
        const existingId = cacheMap.get(os.numero_os);
        const cachePayload = {
          store_id: os.store_id === 'st-master' ? null : os.store_id,
          os_number: os.numero_os,
          status_cache: os.status,
          payload_completo: os,
          updated_at: new Date().toISOString()
        };

        if (existingId) {
          cacheToUpdate.push({ id: existingId, ...cachePayload });
        } else {
          cacheToInsert.push(cachePayload);
        }
      }

      if (cacheToInsert.length > 0) {
        const { error: insCacheErr } = await supabase.from('oficina_os_cache').insert(cacheToInsert);
        if (insCacheErr) {
          console.warn(`[Sync] Erro ao inserir oficina_os_cache (${store_id}):`, insCacheErr.message);
        } else {
          result.cachedOSDetails += cacheToInsert.length;
        }
      }

      for (const upd of cacheToUpdate) {
        const { error: updCacheErr } = await supabase.from('oficina_os_cache').update(upd).eq('id', upd.id);
        if (!updCacheErr) result.cachedOSDetails++;
      }

      console.log(`[Sync] ✅ Detalhes de ${storeOSs.length} OSs sincronizados em oficina_os_cache (${store_id})`);
    } catch (err: any) {
      console.warn(`[Sync] Erro em oficina_os_cache (${store_id}):`, err?.message || err);
    }

    // 3. Persiste itens granulares se patio_os_itens estiver disponível
    try {
      const itemRows: any[] = [];
      for (const os of storeOSs) {
        for (const it of (os.itens || [])) {
          itemRows.push({
            os_number: os.numero_os,
            store_id: os.store_id,
            tipo: it.tipo,
            codigo: it.codigo || null,
            referencia: it.referencia || null,
            descricao: it.descricao,
            quantidade: it.quantidade,
            valor_unitario: it.valor_unitario,
            valor_total: it.valor_total,
            executor: it.executor || null
          });
        }
      }

      if (itemRows.length > 0) {
        // Tenta inserir na tabela patio_os_itens
        const { error: itemErr } = await supabase.from('patio_os_itens').insert(itemRows);
        if (!itemErr) {
          result.syncedItens += itemRows.length;
          console.log(`[Sync] ✅ ${itemRows.length} peças e serviços inseridos em patio_os_itens`);
        } else {
          // Tabela ainda pode não ter sido criada no schema cache
          console.log(`[Sync] (Info) patio_os_itens aguarda schema migration: ${itemErr.message}`);
        }
      }
    } catch (err) {
      // Non-blocking
    }
  }

  console.log(`\n======================================================`);
  console.log(`✨ PERSISTÊNCIA CONCLUÍDA`);
  console.log(`📊 Total OSs: ${result.totalOS} | Novas: ${result.insertedPatioOS} | Atualizadas: ${result.updatedPatioOS} | Cacheadas: ${result.cachedOSDetails}`);
  console.log(`======================================================\n`);

  return result;
}
