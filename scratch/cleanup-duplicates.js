import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://cnwzsvowkfymtdiryhqc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNTM3MDgsImV4cCI6MjA5NTYyOTcwOH0.TzfygcAWycghnlQWCZKjuAYVLPFw1aJ1lq2TPnm_n1Q';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Autenticando...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'mktfunil1@gmail.com',
    password: 'Mktfunil8563*'
  });

  if (authError) {
    console.error("Erro no login:", authError.message);
    process.exit(1);
  }

  console.log("✅ Login bem-sucedido.");

  // 1. Contar total de transações
  const { count: totalTx, error: cErr } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  console.log(`📊 Total de transações antes da limpeza: ${totalTx}`);

  // 2. Buscar todas as transações source = ofx para encontrar duplicadas
  const { data: ofxData, error: ofxErr } = await supabase.from('transactions')
    .select('id, store_id, target_date, amount, occurred_at')
    .eq('source', 'ofx');
  
  if (ofxErr) throw ofxErr;

  const ofxMap = new Map();
  const toDeleteOfx = [];

  ofxData.forEach(tx => {
    // Chave de deduplicação agressiva para OFX: store + data alvo + data ocorrencia + valor
    const key = `${tx.store_id || 'null'}_${tx.target_date}_${tx.occurred_at}_${tx.amount}`;
    if (ofxMap.has(key)) {
      toDeleteOfx.push(tx.id);
    } else {
      ofxMap.set(key, true);
    }
  });

  console.log(`🧹 Encontradas ${toDeleteOfx.length} transações OFX duplicadas.`);

  // 3. Buscar todas as transações Rede (fitid is null e source = rede)
  const { data: redeData, error: redeErr } = await supabase.from('transactions')
    .select('id, store_id, target_date, amount, occurred_at')
    .eq('source', 'rede')
    .is('fitid', null);

  if (redeErr) throw redeErr;

  const redeMap = new Map();
  const toDeleteRede = [];

  redeData.forEach(tx => {
    // Mesma lógica de chave
    const key = `${tx.store_id || 'null'}_${tx.target_date}_${tx.occurred_at}_${tx.amount}`;
    if (redeMap.has(key)) {
      toDeleteRede.push(tx.id);
    } else {
      redeMap.set(key, true);
    }
  });

  console.log(`🧹 Encontradas ${toDeleteRede.length} transações da Rede duplicadas.`);

  const allToDelete = [...toDeleteOfx, ...toDeleteRede];

  if (allToDelete.length > 0) {
    console.log(`🗑️ Deletando ${allToDelete.length} registros fantasmas...`);
    
    // Batch delete
    const batchSize = 100;
    for (let i = 0; i < allToDelete.length; i += batchSize) {
      const batch = allToDelete.slice(i, i + batchSize);
      const { error: delErr } = await supabase.from('transactions').delete().in('id', batch);
      if (delErr) {
        console.error("Erro ao deletar lote:", delErr);
      } else {
        process.stdout.write('.');
      }
    }
    console.log("\n✅ Limpeza concluída!");
  } else {
    console.log("✅ Nenhuma duplicação encontrada!");
  }

  // Verificar total final
  const { count: finalTx } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
  console.log(`📊 Total de transações APÓS a limpeza: ${finalTx}`);
}

run().catch(console.error);
