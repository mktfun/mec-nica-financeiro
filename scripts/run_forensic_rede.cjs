const XLSX = require('xlsx');
const fs = require('fs');
const path = 'C:/Users/admin/Desktop/conciliacao/27-08';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const files = fs.readdirSync(path).filter(f => f.startsWith('Rede_Rel_Vendas_'));
  
  const parsedFiles = [];
  files.forEach(f => {
    const wb = XLSX.readFile(path + '/' + f);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const periodHeader = rawRows[0]?.[0] || '';
    const headers = rawRows[1] || [];
    const rows = [];
    for (let i = 2; i < rawRows.length; i++) {
      const r = rawRows[i];
      if (!r || r.length === 0 || !r[0]) continue;
      rows.push({
        modalidade: r[0],
        bandeira: r[1],
        bruto: Number(r[2]),
        liquido: Number(r[3]),
        taxa: Number((r[2] - r[3]).toFixed(2)),
        taxaPct: (( (r[2] - r[3]) / r[2] ) * 100).toFixed(2) + '%',
        nsu: r[4],
        prazo: r[5],
        lote: r[6],
        auto: r[7],
        pv: r[8],
        estabelecimento: r[9],
        cnpj: r[10],
        cartao: r[11],
        meio: r[13],
        tipoMaq: r[14],
        codMaq: r[15],
        tid: r[16],
        pedido: r[17]
      });
    }
    parsedFiles.push({
      file: f,
      periodHeader,
      rows
    });
  });

  console.log('=== DETALHAMENTO ARQUIVO POR ARQUIVO ===');
  parsedFiles.forEach(pf => {
    console.log('\n-----------------------------------------------');
    console.log('ARQUIVO: ' + pf.file);
    console.log('Periodo: ' + pf.periodHeader.replace(/\r?\n/g, ' | '));
    console.log('Total de vendas: ' + pf.rows.length);
    let fBruto = 0, fLiq = 0, fTaxa = 0;
    pf.rows.forEach((r, idx) => {
      fBruto += r.bruto;
      fLiq += r.liquido;
      fTaxa += r.taxa;
      console.log('  [Linha ' + (idx+1) + '] Estabelecimento: ' + r.estabelecimento + ' (PV ' + r.pv + ', CNPJ ' + r.cnpj + ')');
      console.log('    Meio: ' + r.modalidade + ' ' + r.bandeira + ' via ' + r.meio + ' | NSU: ' + r.nsu + ' | Auto: ' + r.auto);
      console.log('    Bruto: R$ ' + r.bruto.toFixed(2) + ' | Taxa: R$ ' + r.taxa.toFixed(2) + ' (' + r.taxaPct + ') | Liquido: R$ ' + r.liquido.toFixed(2) + ' | Prazo: ' + r.prazo);
    });
    console.log('  SUBTOTAL -> Bruto: R$ ' + fBruto.toFixed(2) + ' | Taxa: R$ ' + fTaxa.toFixed(2) + ' | Liquido: R$ ' + fLiq.toFixed(2));
  });

  const { data: stores } = await supabase.from('stores').select('*').order('name');
  const { data: pos27 } = await supabase.from('pos_transactions').select('*').eq('target_date', '2026-08-27');
  const { data: ofx27 } = await supabase.from('ofx_transactions').select('*').eq('target_date', '2026-08-27');
  const { data: rpcTriple } = await supabase.rpc('get_store_pos_triple_reconciliation', { p_target_date: '2026-08-27' });
  const { data: rpcDaily } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-27' });
  
  console.log('\n======================================================');
  console.log('CROSS-ANALYSIS COM SUPABASE E OFX:');
  console.log('pos_transactions count 27/08: ' + pos27?.length);
  console.log('OFX count 27/08: ' + ofx27?.length);
  console.log('RPC Triple totals:', {
    total_rede_bruto: rpcTriple?.total_rede_bruto,
    total_rede_taxas: rpcTriple?.total_rede_taxas,
    total_rede_liquido: rpcTriple?.total_rede_liquido,
    total_ofx_maquininhas: rpcTriple?.total_ofx_maquininhas,
    total_nao_entrou: rpcTriple?.total_nao_entrou
  });

  console.log('\nOFX Maquininhas transactions by Store on 27/08:');
  const ofxRedeRows = ofx27.filter(o => o.counterpart_name?.toUpperCase().includes('REDE') || o.fitid?.toUpperCase().includes('REDE'));
  ofxRedeRows.forEach(o => {
    const s = stores.find(st => st.id === o.store_id);
    console.log('  Loja: ' + (s?.name || o.store_id) + ' | Valor: R$ ' + o.amount + ' | FITID: ' + o.fitid + ' | Counterpart: ' + o.counterpart_name + ' | Occurred: ' + o.occurred_at);
  });

  console.log('\nDaily Reconciliation Summary Stores Array:');
  rpcDaily?.stores?.forEach(st => {
    console.log('  Loja: ' + st.store_name + ' | OFX: R$ ' + st.saldo_banco_ofx + ' | Cofre: R$ ' + st.dinheiro_loja + ' | Maquininha: R$ ' + st.maquininha + ' | NaoEntrouValor: R$ ' + st.nao_entrou_valor + ' | NaoEntrouMaq: ' + st.nao_entrou_maquininhas);
  });
}
run();
