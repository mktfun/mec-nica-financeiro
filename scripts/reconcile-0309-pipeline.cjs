const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\03-09';
const targetDate = '2026-09-03';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Mapeamento Canônico de Contas Bancárias -> store_id
const ACCOUNT_STORE_MAPPING = {
  '0263811531': { id: 'st-01', name: 'Dom Pedro - DP' },
  '63304449':   { id: 'st-02', name: 'Jabaquara - JAB' },
  '8813994293': { id: 'st-02', name: 'Jabaquara - JAB' },
  '2783070820': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  '7386162601': { id: 'st-04', name: 'Kennedy - MP' },
  '8813984633': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  '7386166586': { id: 'st-06', name: 'Planalto - BRASICAR' },
  '8813984112': { id: 'st-07', name: 'Rudge Ramos - CAP' },
  '8813992677': { id: 'st-08', name: 'Santo André - HD' },
  '7386175298': { id: 'st-09', name: 'Rei do Módulo - MP' },
  '3385988047': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' }
};

// Mapeamento Canônico de Arquivos XLS de OS -> store_id
const OS_FILE_MAPPING = {
  '863_ConferenciaOSxFinanceiro.xls':  { id: 'st-01', name: 'Dom Pedro - DP' },
  '726_ConferenciaOSxFinanceiro.xls':  { id: 'st-02', name: 'Jabaquara - JAB' },
  '1867_ConferenciaOSxFinanceiro.xls': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  '2013_ConferenciaOSxFinanceiro.xls': { id: 'st-04', name: 'Kennedy - MP' },
  '1812_ConferenciaOSxFinanceiro.xls': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  '2073_ConferenciaOSxFinanceiro.xls': { id: 'st-06', name: 'Planalto - BRASICAR' },
  '1844_ConferenciaOSxFinanceiro.xls': { id: 'st-07', name: 'Rudge Ramos - CAP' },
  '2354_ConferenciaOSxFinanceiro.xls': { id: 'st-08', name: 'Santo André - HD' },
  '1721_ConferenciaOSxFinanceiro.xls': { id: 'st-09', name: 'Rei do Módulo - MP' },
  '2580_ConferenciaOSxFinanceiro.xls': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' }
};

// Mapeamento Canônico de Estabelecimentos Rede -> store_id
const REDE_ESTAB_MAPPING = {
  '71854878':  { id: 'st-01', name: 'Dom Pedro - DP' },
  '63304449':  { id: 'st-02', name: 'Jabaquara - JAB' },
  '101423667': { id: 'st-03', name: 'Jorge Beretta - DHJV' },
  '76347036':  { id: 'st-04', name: 'Kennedy - MP' },
  '101422997': { id: 'st-05', name: 'Piraporinha - EMPORIO' },
  '101423446': { id: 'st-06', name: 'Planalto - BRASICAR' },
  '63034336':  { id: 'st-07', name: 'Rudge Ramos - CAP' },
  '104112840': { id: 'st-08', name: 'Santo André - HD' },
  '47712201':  { id: 'st-09', name: 'Rei do Módulo - MP' },
  '102553424': { id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', name: 'Maua - MHE' }
};

async function run0309Pipeline() {
  console.log('================================================================');
  console.log('🚀 MOTOR DE CONCILIAÇÃO AUTÔNOMA — DATA 03/09/2026');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // FASE 1: INGESTÃO DOS 10 EXTRATOS BANCÁRIOS (OFX)
  // ---------------------------------------------------------------------------
  console.log('📌 FASE 1: Processando os 10 extratos bancários Itaú (OFX)...');
  const ofxFiles = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.ofx'));
  const ofxToInsert = [];
  const storeBalances = {};

  for (const file of ofxFiles) {
    const content = fs.readFileSync(path.join(dir, file), 'latin1');
    const acctId = content.match(/<ACCTID>([^<]+)/)?.[1]?.trim() || '';
    const storeInfo = ACCOUNT_STORE_MAPPING[acctId] || { id: 'st-01', name: 'Dom Pedro - DP' };

    const balAmt = parseFloat(content.match(/<BALAMT>([^<]+)/)?.[1] || '0');
    storeBalances[storeInfo.id] = balAmt;

    const stmtBlocks = content.split('<STMTTRN>').slice(1);
    for (const block of stmtBlocks) {
      const trnAmt = parseFloat(block.match(/<TRNAMT>([^<]+)/)?.[1] || '0');
      const fitid = block.match(/<FITID>([^<]+)/)?.[1]?.trim() || '';
      const memo = block.match(/<MEMO>([^<]+)/)?.[1]?.trim() || '';

      if (memo.includes('SALDO ANTERIOR') || memo.includes('SALDO DIA') || memo.includes('SALDO TOTAL DISPON')) {
        continue;
      }
      if (trnAmt === 0) continue;

      ofxToInsert.push({
        store_id: storeInfo.id,
        target_date: targetDate,
        occurred_at: `${targetDate} 12:00:00+00`,
        amount: trnAmt,
        type: trnAmt > 0 ? 'in' : 'out',
        fitid: fitid,
        counterpart_name: memo,
        bank_name: 'ITAU'
      });
    }
  }

  await supabase.from('ofx_transactions').delete().eq('target_date', targetDate);
  const { error: ofxErr } = await supabase.from('ofx_transactions').insert(ofxToInsert);
  if (ofxErr) console.error('   ❌ Erro ao salvar ofx_transactions:', ofxErr.message);
  else console.log(`   ✅ OFX: ${ofxToInsert.length} transações salvas com sucesso em ofx_transactions!`);

  // ---------------------------------------------------------------------------
  // FASE 2: INGESTÃO DAS VENDAS DE CARTÃO DA REDE
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 2: Ingerindo arquivos de vendas da Rede...');
  const redeFiles = fs.readdirSync(dir).filter(f => f.startsWith('Rede_') && f.endsWith('.xlsx'));
  const posToInsert = [];

  for (const file of redeFiles) {
    const wb = XLSX.readFile(path.join(dir, file));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    // Encontrar cabeçalhos
    let hIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = (data[i] || []).map(x => String(x || '').toLowerCase());
      if (row.some(c => c.includes('data da venda') || c.includes('nsu') || c.includes('valor'))) {
        hIdx = i;
        break;
      }
    }
    if (hIdx === -1) continue;

    const headers = data[hIdx].map(x => String(x || '').trim().toLowerCase());
    const grossIdx = headers.findIndex(h => h.includes('venda atualizado') || h.includes('original') || h.includes('bruto') || h === 'valor da venda');
    const netIdx = headers.findIndex(h => h.includes('líquido') || h.includes('liquido') || h.includes('valor l'));
    const feeIdx = headers.findIndex(h => h.includes('taxa') || h.includes('desconto'));
    const methodIdx = headers.findIndex(h => h.includes('modalidade') || h.includes('tipo'));
    const nsuIdx = headers.findIndex(h => h.includes('nsu'));

    const parseNum = v => {
      if (!v) return 0;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };

    // Identificar a loja pelo estabelecimento no cabeçalho
    let storeId = null;
    for (let r = 0; r < hIdx; r++) {
      const lineStr = (data[r] || []).join(' ');
      for (const [estabNum, sInfo] of Object.entries(REDE_ESTAB_MAPPING)) {
        if (lineStr.includes(estabNum)) {
          storeId = sInfo.id;
          break;
        }
      }
      if (storeId) break;
    }

    for (let r = hIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const gross = parseNum(row[grossIdx !== -1 ? grossIdx : 2]);
      const net = parseNum(row[netIdx !== -1 ? netIdx : 3]);
      const fee = feeIdx !== -1 ? parseNum(row[feeIdx]) : (gross - net);
      if (gross <= 0 && net <= 0) continue;

      const mod = String(row[methodIdx !== -1 ? methodIdx : 0] || '').toLowerCase();
      const isDeb = mod.includes('deb') || mod.includes('déb');

      // Se storeId não foi identificado no cabeçalho, tenta casar com os créditos OFX das contas
      let finalStoreId = storeId;
      if (!finalStoreId) {
        // Busca qual conta bancária teve crédito da Rede com valor próximo a net
        for (const [acct, sInfo] of Object.entries(ACCOUNT_STORE_MAPPING)) {
          const matchTx = ofxToInsert.find(t => t.store_id === sInfo.id && Math.abs(t.amount - net) < 0.05);
          if (matchTx) {
            finalStoreId = sInfo.id;
            break;
          }
        }
      }

      posToInsert.push({
        store_id: finalStoreId || 'st-01',
        target_date: targetDate,
        occurred_at: `${targetDate} 12:00:00+00`,
        machine_name: 'REDE',
        payment_method: isDeb ? 'Débito' : 'Crédito',
        transaction_type: 'venda',
        gross_amount: gross,
        net_amount: net > 0 ? net : gross,
        fee_amount: fee >= 0 ? fee : 0
      });
    }
  }

  await supabase.from('pos_transactions').delete().eq('target_date', targetDate);
  const { error: posErr } = await supabase.from('pos_transactions').insert(posToInsert);
  if (posErr) console.error('   ❌ Erro ao salvar pos_transactions:', posErr.message);
  else console.log(`   ✅ Rede: ${posToInsert.length} transações salvas com sucesso em pos_transactions!`);

  // ---------------------------------------------------------------------------
  // FASE 3: INGESTÃO DOS 10 ARQUIVOS DE OS (ConferenciaOSxFinanceiro.xls)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 3: Processando os 10 arquivos de Ordens de Serviço (XLS)...');
  const osFiles = fs.readdirSync(dir).filter(f => f.endsWith('ConferenciaOSxFinanceiro.xls'));
  const osRecordsToUpsert = [];

  for (const file of osFiles) {
    const sInfo = OS_FILE_MAPPING[file];
    if (!sInfo) continue;

    const wb = XLSX.readFile(path.join(dir, file));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let hIdx = -1;
    for (let r = 0; r < Math.min(10, rows.length); r++) {
      const line = (rows[r] || []).map(x => String(x || '').toLowerCase());
      if (line.some(c => c === 'os' || c.includes('ordem') || c.includes('placa'))) {
        hIdx = r;
        break;
      }
    }
    if (hIdx === -1) continue;

    const headers = rows[hIdx].map(x => String(x || '').trim().toLowerCase());
    const osIdx = headers.findIndex(h => h === 'os' || h.includes('número') || h.includes('numero'));
    const dataIdx = headers.findIndex(h => h.includes('data') && !h.includes('faturam') && !h.includes('finaliz'));
    const cliIdx = headers.findIndex(h => h.includes('cliente'));
    const placaIdx = headers.findIndex(h => h.includes('placa'));
    const statusIdx = headers.findIndex(h => h.includes('status'));
    const finEmIdx = headers.findIndex(h => h.includes('finalizada em'));
    const fatEmIdx = headers.findIndex(h => h.includes('data do faturamento'));
    const prodIdx = headers.findIndex(h => h.includes('produto'));
    const servIdx = headers.findIndex(h => h.includes('serviço') || h.includes('servico') || h.includes('serv'));
    const totIdx = headers.findIndex(h => h.includes('total'));

    const parseNum = v => {
      if (!v) return 0;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };

    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const osNum = String(row[osIdx !== -1 ? osIdx : 0] || '').trim();
      if (!osNum || isNaN(Number(osNum)) || Number(osNum) <= 0) continue;

      const rawStatus = String(row[statusIdx !== -1 ? statusIdx : 4] || '').trim();
      const isFin = rawStatus.toLowerCase().includes('finaliz') || rawStatus.toLowerCase().includes('faturad') || rawStatus.toLowerCase().includes('pago');

      const vProd = parseNum(row[prodIdx !== -1 ? prodIdx : 8]);
      const vServ = parseNum(row[servIdx !== -1 ? servIdx : 9]);
      const vTot = totIdx !== -1 ? parseNum(row[totIdx]) : (vProd + vServ);

      const plate = String(row[placaIdx !== -1 ? placaIdx : 3] || 'S/PLACA').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PATIO';
      const client = String(row[cliIdx !== -1 ? cliIdx : 2] || 'Cliente').trim();

      osRecordsToUpsert.push({
        store_id: sInfo.id,
        store_name: sInfo.name,
        os_number: osNum,
        plate: plate,
        client_name: client,
        total_value: vTot,
        paid_value: isFin ? vTot : 0,
        status: isFin ? 'finalizada' : 'em_aberto',
        raw_status: rawStatus || (isFin ? 'Finalizada' : 'Em Aberto'),
        payment_method: isFin ? 'Faturado / Finalizado' : 'A Combinar',
        opened_at: `${targetDate} 08:00:00+00`,
        closed_at: isFin ? `${targetDate} 18:00:00+00` : null,
        updated_at: new Date().toISOString()
      });
    }
  }

  for (const os of osRecordsToUpsert) {
    await supabase.from('patio_os').upsert(os, { onConflict: 'store_id,os_number' });
  }
  console.log(`   ✅ OSs: ${osRecordsToUpsert.length} ordens de serviço importadas/atualizadas com sucesso!`);

  // ---------------------------------------------------------------------------
  // FASE 4: INGESTÃO DE CONTAS A PAGAR (BuscaContasAPagar.xls)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 4: Ingerindo Contas a Pagar do dia...');
  const contasFile = path.join(dir, 'BuscaContasAPagar.xls');
  const billsToInsert = [];

  if (fs.existsSync(contasFile)) {
    const wb = XLSX.readFile(contasFile);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const parseNum = v => {
      if (!v) return 0;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };

    for (let i = 4; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length === 0) continue;

      const emp = String(r[1] || '').trim();
      const desc = String(r[4] || 'Conta a Pagar').trim();
      const status = String(r[10] || '').trim();

      if (!emp || emp.toLowerCase().includes('total') || emp.toLowerCase().includes('tl.') || status.toLowerCase().includes('tl.') || desc.toLowerCase().includes('total')) {
        continue;
      }

      const vlPago = parseNum(r[12]);
      const vlAPagar = parseNum(r[9]);
      const amount = vlPago > 0 ? vlPago : vlAPagar;
      if (amount <= 0 || isNaN(amount)) continue;

      let storeId = null;
      const empLow = emp.toLowerCase();
      if (empLow.includes('dompedro')) storeId = 'st-01';
      else if (empLow.includes('jabaquara')) storeId = 'st-02';
      else if (empLow.includes('jorgeberetta') || empLow.includes('beretta')) storeId = 'st-03';
      else if (empLow.includes('kennedy')) storeId = 'st-04';
      else if (empLow.includes('piraporinha')) storeId = 'st-05';
      else if (empLow.includes('planalto')) storeId = 'st-06';
      else if (empLow.includes('rudge')) storeId = 'st-07';
      else if (empLow.includes('santoandre')) storeId = 'st-08';
      else if (empLow.includes('modulo')) storeId = 'st-09';
      else if (empLow.includes('maua') || empLow.includes('mhe')) storeId = '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';

      billsToInsert.push({
        date: targetDate,
        store_id: storeId,
        title: desc.substring(0, 100),
        amount: amount,
        category: desc.toLowerCase().includes('flash') ? 'Benefícios' : (desc.toLowerCase().includes('aluguel') ? 'Imóvel' : 'Fornecedores'),
        due_date: targetDate,
        payment_date: vlPago > 0 ? targetDate : null,
        external_code: String(r[2] || '')
      });
    }

    await supabase.from('daily_manual_bills').delete().eq('date', targetDate);
    const { error: billErr } = await supabase.from('daily_manual_bills').insert(billsToInsert);
    if (billErr) console.error('   ❌ Erro ao salvar daily_manual_bills:', billErr.message);
    else console.log(`   ✅ Contas a Pagar: ${billsToInsert.length} títulos salvos (Total: R$ ${billsToInsert.reduce((s, b) => s + b.amount, 0).toFixed(2)})!`);
  }

  // ---------------------------------------------------------------------------
  // FASE 5: ATUALIZAR RECONCILIATIONS (10 LOJAS)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 5: Atualizando fechamento por filial em reconciliations...');
  const STORE_NAMES = {
    'st-01': 'Dom Pedro - DP',
    'st-02': 'Jabaquara - JAB',
    'st-03': 'Jorge Beretta - DHJV',
    'st-04': 'Kennedy - MP',
    'st-05': 'Piraporinha - EMPORIO',
    'st-06': 'Planalto - BRASICAR',
    'st-07': 'Rudge Ramos - CAP',
    'st-08': 'Santo André - HD',
    'st-09': 'Rei do Módulo - MP',
    '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f': 'Maua - MHE'
  };

  for (const [storeId, storeName] of Object.entries(STORE_NAMES)) {
    const bankBal = storeBalances[storeId] || 0;

    const { data: patioRows } = await supabase
      .from('patio_os')
      .select('total_value, paid_value')
      .eq('store_id', storeId)
      .in('status', ['em_aberto', 'pago_parcial']);
    
    const patioTotal = (patioRows || []).reduce((s, r) => s + Math.max(0, (r.total_value || 0) - (r.paid_value || 0)), 0);

    await supabase.from('reconciliations').upsert({
      store_id: storeId,
      date: targetDate,
      bank_total: bankBal,
      na_loja_os: patioTotal,
      status: 'pending',
      divergence: 0,
      ofx_imported: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'store_id,date' });
  }
  console.log('   ✅ Todas as 10 lojas atualizadas em reconciliations!');

  // ---------------------------------------------------------------------------
  // FASE 6: AUTO-MATCHING EXATO (SEM JUSTIFICATIVAS FORÇADAS)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 6: Executando auto-match exato de PIX, Cartão e Contas...');
  const { data: matchRes, error: matchErr } = await supabase.rpc('auto_match_daily_transactions', { p_date: targetDate });
  if (matchErr) console.error('   ❌ Erro no auto-match:', matchErr.message);
  else console.log('   ✅ Auto-match concluído com sucesso!');

  // ---------------------------------------------------------------------------
  // FASE 7: APURAÇÃO DAS TRANSAÇÕES ÓRFÃS / PENDENTES DE JUSTIFICATIVA
  // ---------------------------------------------------------------------------
  console.log('\n🔍 FASE 7: Mapeando pendências exatas (Entradas, Saídas e OSs para atualizar)...');

  // 7.1 Entradas OFX Órfãs (sem OS vinculada)
  const { data: orfanIns } = await supabase
    .from('ofx_transactions')
    .select('store_id, counterpart_name, amount, fitid')
    .eq('target_date', targetDate)
    .eq('type', 'in')
    .is('matched_os_number', null)
    .not('counterpart_name', 'ilike', '%SALDO%');

  // 7.2 Saídas OFX Órfãs (sem conta a pagar vinculada)
  const { data: orfanOuts } = await supabase
    .from('ofx_transactions')
    .select('store_id, counterpart_name, amount, fitid')
    .eq('target_date', targetDate)
    .eq('type', 'out')
    .is('matched_os_number', null)
    .not('counterpart_name', 'ilike', '%SALDO%');

  // 7.3 OSs em Pátio (Em Aberto) que necessitam de conferência ou quitação manual
  const { data: openOss } = await supabase
    .from('patio_os')
    .select('store_id, store_name, os_number, client_name, plate, total_value, paid_value, status, payment_method')
    .in('status', ['em_aberto', 'pago_parcial'])
    .order('store_id');

  // 7.4 Apuração dos 5 Pilares do Dia 03/09/2026
  let saldoPositivo = 0;
  let saldoNegativo = 0;
  for (const b of Object.values(storeBalances)) {
    if (b > 0) saldoPositivo += b;
    else saldoNegativo += Math.abs(b);
  }

  const { data: prevSnap } = await supabase.from('daily_snapshots').select('*').eq('date', '2026-09-02').single();
  const caixaAnterior = Number(prevSnap?.caixa_atual || 341123.41);
  const dinheiroMp = Number(prevSnap?.dinheiro_mp || 24955.00);

  const { data: recs } = await supabase.from('receivables').select('value').eq('status', 'pendente');
  const totalRecebiveis = (recs || []).reduce((s, r) => s + Number(r.value || 0), 0);

  const totalPatio = (openOss || []).reduce((s, r) => s + Math.max(0, (r.total_value || 0) - (r.paid_value || 0)), 0);

  const caixaAtual = (saldoPositivo + dinheiroMp + totalRecebiveis + totalPatio) - saldoNegativo;
  const fluxoCaixa = caixaAtual - caixaAnterior;

  console.log('\n================================================================');
  console.log(`📊 CONSOLIDAÇÃO PRELIMINAR DOS 5 PILARES — ${targetDate}`);
  console.log('================================================================');
  console.log(`🏛️ 1. Saldo Bancos Positivo:   R$ ${saldoPositivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🏦 (-) Cheque Especial Itaú:  R$ ${saldoNegativo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`💵 2. Dinheiro MP (Cofre):      R$ ${dinheiroMp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📄 3. A Receber:               R$ ${totalRecebiveis.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🚗 4. Na Loja OS (Pátio):      R$ ${totalPatio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log('----------------------------------------------------------------');
  console.log(`💰 CAIXA ATUAL ESTIMADO:       R$ ${caixaAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🔙 CAIXA ANTERIOR (02/09):     R$ ${caixaAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📈 FLUXO DE CAIXA:             R$ ${fluxoCaixa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log('================================================================\n');

  // Retornar os arrays brutos estruturados para o relatório do usuário
  return {
    orfanIns: (orfanIns || []).map(i => ({ ...i, store_name: STORE_NAMES[i.store_id] })),
    orfanOuts: (orfanOuts || []).map(o => ({ ...o, store_name: STORE_NAMES[o.store_id] })),
    openOss: openOss || [],
    pilares: { saldoPositivo, saldoNegativo, dinheiroMp, totalRecebiveis, totalPatio, caixaAtual, caixaAnterior, fluxoCaixa }
  };
}

run0309Pipeline().then(res => {
  fs.writeFileSync(path.join(__dirname, 'reconciliation_0309_pending_audit.json'), JSON.stringify(res, null, 2));
  console.log('📁 Relatório de auditoria salvo em scripts/reconciliation_0309_pending_audit.json');
}).catch(console.error);
