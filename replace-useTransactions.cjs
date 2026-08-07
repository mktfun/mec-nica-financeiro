const fs = require('fs');
const content = fs.readFileSync('src/hooks/useTransactions.ts', 'utf8');

const newContent = content.replace(
  /if \(ofxTxs\.length > 0\) {[\s\S]*?if \(!error && otherTxs\.length > 0\) {[\s\S]*?if \(e2\) { error = e2; } else { data = data \|\| d2; }\n      }/g,
  \if (ofxTxs.length > 0) {
        const { data: d1, error: e1 } = await supabase
          .from('ofx_transactions')
          .upsert(ofxTxs.map(t => { const {title, subtitle, icon_type, target_date, previous_balance, import_batch_id, source, match_status, external_id, gross_amount, fee_amount, payment_method, matched_os_number, ...rest} = t; return rest; }), { onConflict: 'store_id, fitid', ignoreDuplicates: true });
        if (e1) { error = e1; } else { data = d1; }
      }

      // Outras transações (Rede/Maquininha): insert na pos_transactions
      if (!error && otherTxs.length > 0) {
        const posTxs = otherTxs.filter(t => t.source === 'rede' || t.source === 'maquininha').map(t => {
          return {
            store_id: t.store_id,
            machine_name: t.counterpart_name || t.title || 'Maquininha',
            payment_method: t.payment_method || 'Outros',
            gross_amount: t.gross_amount || t.amount,
            net_amount: t.amount,
            fee_amount: t.fee_amount || 0,
            occurred_at: t.occurred_at,
            matched_os_number: t.os_number,
            import_batch_id: t.import_batch_id
          }
        });

        if (posTxs.length > 0) {
          const { data: d2, error: e2 } = await supabase
            .from('pos_transactions')
            .insert(posTxs);
          if (e2) { error = e2; } else { data = data || d2; }
        }
      }\
);

fs.writeFileSync('src/hooks/useTransactions.ts', newContent, 'utf8');
