const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: stores } = await s.from('stores').select('id, name').eq('active', true);
  const { data: txs } = await s.from('ofx_transactions').select('*').eq('target_date', '2026-08-24').eq('type', 'in');

  console.log('=== AUDITORIA DE ENTRADAS, JUSTIFICATIVAS E DIFERENÇA POR LOJA (24/08/2026) ===');
  console.log('Total de Entradas OFX no dia:', txs?.length);

  let grandPrevisto = 0;
  let grandIdentificado = 0;
  let grandPendente = 0;

  stores.forEach(st => {
    const storeTxs = txs?.filter(t => t.store_id === st.id) || [];
    const totalEntradas = storeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    
    // Identificados como Rede/Cartão
    const isRede = (t) => {
      const txt = `${t.counterpart_name || ''} ${t.fitid || ''}`.toUpperCase();
      return txt.includes('REDE') || txt.includes('CIELO') || txt.includes('GETNET') || txt.includes('STONE') || txt.includes('ADQ') || txt.includes('CART') || txt.includes('MAST') || txt.includes('VISA') || txt.includes('ELO');
    };
    
    const redeTxs = storeTxs.filter(t => isRede(t));
    const totalRede = redeTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    
    // Identificados como PIX Vinculado a OS
    const pixOsTxs = storeTxs.filter(t => !isRede(t) && t.matched_os_number);
    const totalPixOs = pixOsTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    
    // Identificados como Justificados / Avulsos
    const justTxs = storeTxs.filter(t => !isRede(t) && !t.matched_os_number && t.manual_category);
    const totalJust = justTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);
    
    // Não Identificados / Pendentes
    const pendTxs = storeTxs.filter(t => !isRede(t) && !t.matched_os_number && !t.manual_category);
    const totalPend = pendTxs.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    grandPrevisto += totalEntradas;
    grandIdentificado += (totalRede + totalPixOs + totalJust);
    grandPendente += totalPend;
    
    console.log(`Loja: ${st.name.padEnd(25)} | Previsto (Entradas): R$ ${totalEntradas.toFixed(2).padStart(9)} | Rede: R$ ${totalRede.toFixed(2).padStart(9)} | PIX OS: R$ ${totalPixOs.toFixed(2).padStart(8)} | Justif: R$ ${totalJust.toFixed(2).padStart(8)} | DIFERENÇA (Pendente): R$ ${totalPend.toFixed(2).padStart(8)}`);
    if (pendTxs.length > 0) {
      pendTxs.forEach(p => console.log(`   -> Lançamento Pendente: R$ ${p.amount} | ${p.counterpart_name || p.fitid}`));
    }
  });

  console.log('------------------------------------------------------------------------------------------------------------------------');
  console.log(`TOTAIS GLOBAIS: Previsto: R$ ${grandPrevisto.toFixed(2)} | Identificado: R$ ${grandIdentificado.toFixed(2)} | DIFERENÇA PENDENTE TOTAL: R$ ${grandPendente.toFixed(2)}`);
}
main();
