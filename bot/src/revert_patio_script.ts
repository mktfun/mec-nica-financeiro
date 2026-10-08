import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- INICIANDO REVERSÃO DE PATIO_OS ---');

  // Busca todas as OSs alteradas hoje às 15:5...
  const { data: rows, error } = await supabase
    .from('patio_os')
    .select('*')
    .gte('updated_at', '2026-09-14T15:50:00Z');

  if (error) {
    console.error('Erro ao buscar:', error);
    process.exit(1);
  }

  console.log(`Total de registros afetados encontrados: ${rows.length}`);

  let restoredCount = 0;
  let deletedCount = 0;

  for (const r of rows) {
    // 1. Se for st-master (inserida indevidamente), deleta
    if (r.store_id === null || r.store_name === 'Master (Interno)') {
      console.log(`Deletando OS indevida st-master: ${r.os_number}`);
      await supabase.from('patio_os').delete().eq('id', r.id);
      deletedCount++;
      continue;
    }

    // 2. Verifica pagamentos existentes
    const credit = Number(r.credit_value || 0);
    const debit = Number(r.debit_value || 0);
    const pix = Number(r.pix_transfer_value || 0);
    const cash = Number(r.cash_value || 0);
    const sumPayments = credit + debit + pix + cash;

    let targetPaid = sumPayments;
    let targetStatus = r.status;
    let targetRawStatus = r.raw_status;

    // Se tiver histórico de mudanças, pega o último valor válido antes das 15:50
    if (Array.isArray(r.history_log) && r.history_log.length > 0) {
      for (const entry of r.history_log) {
        // Se foi um registro de conciliação legítimo
        if (entry.changes) {
          for (const ch of entry.changes) {
            if (ch.field === 'paid_value') targetPaid = Number(ch.to);
            if (ch.field === 'status') targetStatus = ch.to;
            if (ch.field === 'raw_status') targetRawStatus = ch.to;
          }
        }
      }
    } else if (sumPayments > 0) {
      targetPaid = sumPayments;
      if (targetPaid >= Number(r.total_value) && Number(r.total_value) > 0) {
        targetStatus = 'finalizado';
      } else {
        targetStatus = 'pago_parcial';
      }
    }

    // Se a OS foi inserida hoje nova em folha pelo crawler e não tem nenhum pagamento ou histórico
    const isBrandNewFromCrawler = (!r.history_log || r.history_log.length === 0) && sumPayments === 0 && Number(r.paid_value) === 0;

    if (isBrandNewFromCrawler) {
      console.log(`[Removendo nova OS inserida pelo crawler] OS: ${r.os_number} (Loja: ${r.store_id})`);
      await supabase.from('patio_os').delete().eq('id', r.id);
      deletedCount++;
    } else {
      // Restaura os valores corretos de paid_value e status
      console.log(`[Restaurando OS existente] OS: ${r.os_number} (Loja: ${r.store_id}) -> Paid: ${targetPaid} | Status: ${targetStatus}`);
      await supabase
        .from('patio_os')
        .update({
          paid_value: targetPaid,
          status: targetStatus,
          raw_status: targetRawStatus,
          updated_at: '2026-09-14T12:45:00.000Z' // reseta updated_at para o horário da conciliação original
        })
        .eq('id', r.id);
      restoredCount++;
    }
  }

  console.log('--- REVERSÃO CONCLUÍDA ---');
  console.log(`OSs restauradas para o estado de conciliação original: ${restoredCount}`);
  console.log(`OSs inseridas pelo crawler removidas de patio_os: ${deletedCount}`);
}

main().catch(console.error);
