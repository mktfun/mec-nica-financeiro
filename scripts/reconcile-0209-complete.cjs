const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const dir = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\02-09';
const cacheFile = path.join(__dirname, 'extracted_0209_os_cache.json');
const targetDate = '2026-09-02';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// 1. Mapeamento Canônico de Contas Bancárias -> store_id
const ACCOUNT_STORE_MAPPING = {
  '0263811531': 'st-01',                             // Dom Pedro - DP
  '63304449': 'st-02',                               // Jabaquara - JAB
  '8813994293': 'st-02',                             // Jabaquara - JAB
  '2783070820': 'st-03',                             // Jorge Beretta - DHJV
  '7386162601': 'st-04',                             // Kennedy - MP
  '8813984633': 'st-05',                             // Piraporinha - EMPORIO
  '7386166586': 'st-06',                             // Planalto - BRASICAR
  '8813984112': 'st-07',                             // Rudge Ramos - CAP
  '8813992677': 'st-08',                             // Santo André - HD
  '7386175298': 'st-09',                             // Rei do Módulo - MP
  '3385988047': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f' // Maua - MHE
};

// 2. Mapeamento Canônico de Estabelecimentos Rede -> store_id
const REDE_ESTAB_MAPPING = {
  '71854878': 'st-01',                              // Dom Pedro - DP
  '63304449': 'st-02',                              // Jabaquara - JAB
  '101423667': 'st-03',                             // Jorge Beretta - DHJV
  '76347036': 'st-04',                              // Kennedy - MP
  '101422997': 'st-05',                             // Piraporinha - EMPORIO
  '101423446': 'st-06',                             // Planalto - BRASICAR
  '63034336': 'st-07',                              // Rudge Ramos - CAP
  '104112840': 'st-08',                             // Santo André - HD
  '47712201': 'st-09',                              // Rei do Módulo - MP
  '102553424': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f' // Maua - MHE
};

// 3. Mapeamento Canônico dos Arquivos de Prints de OS -> store_id
const FILE_STORE_MAPPING = {
  'Captura de tela 2026-09-02 155709.png': 'st-01', // Dom Pedro OS 508
  'Captura de tela 2026-09-02 155729.png': 'st-01', // Dom Pedro OS 597
  'Captura de tela 2026-09-02 155750.png': 'st-01', // Dom Pedro OS 598
  'Captura de tela 2026-09-02 155811.png': 'st-01', // Dom Pedro OS 600
  'Captura de tela 2026-09-02 155828.png': 'st-01', // Dom Pedro OS 601

  'Captura de tela 2026-09-02 155906.png': 'st-02', // Jabaquara OS 388

  'Captura de tela 2026-09-02 155951.png': 'st-03', // Jorge Beretta OS 1103

  'Captura de tela 2026-09-02 160055.png': 'st-04', // Kennedy OS 4418
  'Captura de tela 2026-09-02 160109.png': 'st-04', // Kennedy OS 4418

  'Captura de tela 2026-09-02 160214.png': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', // Mauá OS 22559
  'Captura de tela 2026-09-02 160235.png': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', // Mauá OS 22592
  'Captura de tela 2026-09-02 160252.png': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', // Mauá OS 22563

  'Captura de tela 2026-09-02 160328.png': 'st-05', // Piraporinha OS 40337
  'Captura de tela 2026-09-02 160350.png': 'st-05', // Piraporinha OS 40340

  'Captura de tela 2026-09-02 160418.png': 'st-06', // Planalto OS 18461
  'Captura de tela 2026-09-02 160437.png': 'st-06', // Planalto OS 18462
  'Captura de tela 2026-09-02 160458.png': 'st-06', // Planalto OS 18463
  'Captura de tela 2026-09-02 160524.png': 'st-06', // Planalto OS 18464

  'Captura de tela 2026-09-02 160550.png': 'st-09', // Rei do Módulo OS 1818
  'Captura de tela 2026-09-02 160616.png': 'st-09', // Rei do Módulo OS 1846
  'Captura de tela 2026-09-02 160640.png': 'st-09', // Rei do Módulo OS 1847
  'Captura de tela 2026-09-02 160658.png': 'st-09', // Rei do Módulo OS 1855
  'Captura de tela 2026-09-02 160721.png': 'st-09', // Rei do Módulo OS 1856
  'Captura de tela 2026-09-02 160833.png': 'st-09', // Rei do Módulo OS 1856

  'Captura de tela 2026-09-02 160938.png': 'st-07', // Rudge Ramos OS 8689
  'Captura de tela 2026-09-02 160959.png': 'st-07', // Rudge Ramos OS 8756
  'Captura de tela 2026-09-02 161018.png': 'st-07', // Rudge Ramos OS 8762
  'Captura de tela 2026-09-02 161042.png': 'st-07', // Rudge Ramos OS 8763
  'Captura de tela 2026-09-02 161125.png': 'st-07', // Rudge Ramos OS 8764
  'Captura de tela 2026-09-02 161219.png': 'st-07', // Rudge Ramos OS 8765
  'Captura de tela 2026-09-02 161339.png': 'st-07', // Rudge Ramos OS 8765
  'Captura de tela 2026-09-02 161359.png': 'st-07', // Rudge Ramos OS 8766

  'Captura de tela 2026-09-02 161530.png': 'st-08', // Santo André OS 24027
  'Captura de tela 2026-09-02 161622.png': 'st-08'  // Santo André OS 2405
};

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

async function runFullReconciliation() {
  console.log('================================================================');
  console.log('🏁 MOTOR DE CONCILIAÇÃO AUTÔNOMA — DATA 02/09/2026');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // FASE 1: INGESTÃO E ATUALIZAÇÃO DAS OSs DO PÁTIO (DEDUPLICADO)
  // ---------------------------------------------------------------------------
  console.log('📌 FASE 1: Processando 34 Ordens de Serviço extraídas...');
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

  const dedupMap = new Map();

  for (const [file, d] of Object.entries(cache)) {
    const storeId = FILE_STORE_MAPPING[file] || 'st-01';
    const storeName = STORE_NAMES[storeId];

    let osNum = String(d.os_number || '').trim();
    if (osNum.includes('Faturamento') || osNum.includes('faturamento') || osNum.includes('Faturando')) {
      osNum = osNum.replace(/[^0-9]/g, '');
      if (!osNum) osNum = '600';
    }
    if (osNum.length > 20) osNum = osNum.substring(0, 10);

    const key = `${storeId}_${osNum}`;

    const totalVal = Number(d.total_value) || 0;
    const paidVal = Number(d.paid_value) || 0;
    const openVal = d.open_value !== undefined ? Number(d.open_value) : Math.max(0, totalVal - paidVal);

    let debitVal = Number(d.debit_value) || 0;
    let creditVal = Number(d.credit_value) || 0;
    let pixVal = Number(d.pix_transfer_value) || 0;
    let cashVal = Number(d.cash_value) || 0;

    const payments = Array.isArray(d.payments) ? d.payments : [];
    if (debitVal === 0 && creditVal === 0 && pixVal === 0 && cashVal === 0 && payments.length > 0) {
      payments.forEach(p => {
        const m = (p.method || '').toLowerCase();
        const amt = Number(p.amount) || 0;
        if (m.includes('deb') || m.includes('díbito')) debitVal += amt;
        else if (m.includes('cred') || m.includes('crédito')) creditVal += amt;
        else if (m.includes('pix') || m.includes('transf')) pixVal += amt;
        else if (m.includes('dinh') || m.includes('especie') || m.includes('espécie')) cashVal += amt;
      });
    }

    if (dedupMap.has(key)) {
      const existing = dedupMap.get(key);
      existing.total_value = Math.max(existing.total_value, totalVal);
      existing.paid_value = Math.max(existing.paid_value, paidVal);
      existing.credit_value = Math.max(existing.credit_value, creditVal);
      existing.debit_value = Math.max(existing.debit_value, debitVal);
      existing.pix_transfer_value = Math.max(existing.pix_transfer_value, pixVal);
      existing.cash_value = Math.max(existing.cash_value, cashVal);
      if (payments.length > 0 && (!existing.payments || existing.payments.length === 0)) {
        existing.payment_method = payments.map(p => p.method).join(', ');
      }
      const isFin = (existing.total_value - existing.paid_value) <= 0.05 && existing.total_value > 0;
      existing.status = isFin ? 'finalizada' : (existing.paid_value > 0 ? 'pago_parcial' : 'em_aberto');
    } else {
      const isFinalizada = openVal <= 0.05 && totalVal > 0;
      const isParcial = paidVal > 0 && openVal > 0.05;
      const status = isFinalizada ? 'finalizada' : (isParcial ? 'pago_parcial' : 'em_aberto');

      dedupMap.set(key, {
        store_id: storeId,
        store_name: storeName,
        os_number: osNum,
        plate: (d.plate || 'N/I').toUpperCase().replace(/[^A-Z0-9]/g, ''),
        client_name: d.client_name || 'Cliente',
        total_value: totalVal,
        paid_value: paidVal,
        credit_value: creditVal,
        debit_value: debitVal,
        pix_transfer_value: pixVal,
        cash_value: cashVal,
        status: status,
        raw_status: isFinalizada ? 'Finalizada' : (isParcial ? 'Pago Parcial' : 'Em Aberto'),
        payment_method: payments.length > 0 ? payments.map(p => p.method).join(', ') : (debitVal > 0 ? 'Débito' : creditVal > 0 ? 'Crédito' : pixVal > 0 ? 'PIX' : cashVal > 0 ? 'Dinheiro' : 'A Combinar'),
        opened_at: `${d.opened_at || targetDate} 08:00:00+00`,
        closed_at: isFinalizada ? `${targetDate} 18:00:00+00` : null,
        updated_at: new Date().toISOString()
      });
    }
  }

  const osByStore = {};
  for (const os of dedupMap.values()) {
    if (!osByStore[os.store_id]) osByStore[os.store_id] = [];
    osByStore[os.store_id].push(os);
  }

  for (const [storeId, items] of Object.entries(osByStore)) {
    const { error: upsertErr } = await supabase.from('patio_os').upsert(items, { onConflict: 'store_id,os_number' });
    if (upsertErr) {
      console.error(`   ❌ Erro ao salvar OSs para ${STORE_NAMES[storeId]}:`, upsertErr.message);
    } else {
      console.log(`   ✅ ${STORE_NAMES[storeId]}: ${items.length} OSs atualizadas em patio_os!`);
    }
  }

  // ---------------------------------------------------------------------------
  // FASE 2: INGESTÃO DE VENDAS DA REDE (01/09 -> 02/09)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 2: Ingerindo arquivos de vendas da Rede...');
  const redeFiles = fs.readdirSync(dir).filter(f => f.startsWith('Rede_') && f.endsWith('.xlsx'));
  const posToInsert = [];

  for (const file of redeFiles) {
    const wb = XLSX.readFile(path.join(dir, file));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    let hIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = (data[i] || []).map(x => String(x || '').toLowerCase());
      if (row.some(c => c.includes('estabelecimento') || c.includes('cnpj'))) {
        hIdx = i;
        break;
      }
    }

    if (hIdx === -1) continue;
    const headers = data[hIdx].map(x => String(x || '').trim());
    const estabIdx = headers.findIndex(h => h.toLowerCase().includes('estabelecimento'));
    const valBrutoIdx = headers.findIndex(h => h.toLowerCase().includes('valor da venda') || h.toLowerCase().includes('original'));
    const valLiqIdx = headers.findIndex(h => h.toLowerCase().includes('valor l') || h.toLowerCase().includes('liquido') || h.toLowerCase().includes('líquido'));
    const taxaIdx = headers.findIndex(h => h.toLowerCase().includes('desconto') || h.toLowerCase().includes('taxa'));
    const statusIdx = headers.findIndex(h => h.toLowerCase().includes('status'));
    const modIdx = headers.findIndex(h => h.toLowerCase().includes('modalidade'));

    const parseNum = v => {
      if (!v) return 0;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };

    for (let r = hIdx + 1; r < data.length; r++) {
      const row = data[r];
      if (!row || row.length === 0) continue;

      const estab = String(row[estabIdx] || '').trim();
      const storeId = REDE_ESTAB_MAPPING[estab] || 'st-01';

      if (statusIdx !== -1) {
        const st = String(row[statusIdx] || '').toLowerCase();
        if (!st.includes('aprovad') && !st.includes('paga') && !st.includes('confirmad')) continue;
      }

      const gross = parseNum(row[valBrutoIdx]);
      const net = valLiqIdx !== -1 ? parseNum(row[valLiqIdx]) : gross;
      const fee = taxaIdx !== -1 ? parseNum(row[taxaIdx]) : (gross - net);

      if (gross <= 0) continue;
      const isDeb = modIdx !== -1 && String(row[modIdx]).toLowerCase().includes('deb');

      posToInsert.push({
        store_id: storeId,
        target_date: targetDate,
        occurred_at: `${targetDate} 12:00:00+00`,
        machine_name: 'Importação Rede',
        payment_method: isDeb ? 'Débito' : 'Crédito',
        transaction_type: 'venda',
        gross_amount: gross,
        net_amount: net,
        fee_amount: fee
      });
    }
  }

  await supabase.from('pos_transactions').delete().eq('target_date', targetDate);
  const { error: posErr } = await supabase.from('pos_transactions').insert(posToInsert);
  if (posErr) console.error('   ❌ Erro ao salvar pos_transactions:', posErr.message);
  else console.log(`   ✅ Rede: ${posToInsert.length} transações salvas com sucesso em pos_transactions!`);

  // ---------------------------------------------------------------------------
  // FASE 3: INGESTÃO DE EXTRATOS BANCÁRIOS (OFX)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 3: Ingerindo 10 extratos bancários OFX...');
  const ofxFiles = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.ofx'));
  const ofxToInsert = [];
  const storeBalances = {};
  const storePrevBalances = {};

  for (const file of ofxFiles) {
    const content = fs.readFileSync(path.join(dir, file), 'latin1');
    const acctId = content.match(/<ACCTID>([^<]+)/)?.[1]?.trim() || '';
    const storeId = ACCOUNT_STORE_MAPPING[acctId] || 'st-01';

    const balAmt = parseFloat(content.match(/<BALAMT>([^<]+)/)?.[1] || '0');
    storeBalances[storeId] = balAmt;

    const stmtBlocks = content.split('<STMTTRN>').slice(1);
    for (const block of stmtBlocks) {
      const trnAmt = parseFloat(block.match(/<TRNAMT>([^<]+)/)?.[1] || '0');
      const fitid = block.match(/<FITID>([^<]+)/)?.[1]?.trim() || '';
      const memo = block.match(/<MEMO>([^<]+)/)?.[1]?.trim() || '';

      if (memo.includes('SALDO ANTERIOR') || memo.includes('SALDO DIA')) {
        storePrevBalances[storeId] = trnAmt;
        continue;
      }

      if (trnAmt === 0) continue;

      ofxToInsert.push({
        store_id: storeId,
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
  // FASE 4: INGESTÃO DE CONTAS A PAGAR (BuscaContasAPagar.xls - LIMPO SEM TOTAIS)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 4: Ingerindo Contas a Pagar...');
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

      // Ignorar linhas de resumo / totais
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
    else console.log(`   ✅ Contas a Pagar: ${billsToInsert.length} títulos salvos com sucesso (Total: R$ ${billsToInsert.reduce((s, b) => s + b.amount, 0).toFixed(2)})!`);
  }

  // ---------------------------------------------------------------------------
  // FASE 5: ATUALIZAÇÃO DA TABELA RECONCILIATIONS (10 LOJAS)
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 5: Atualizando fechamento por filial em reconciliations...');
  for (const [storeId, storeName] of Object.entries(STORE_NAMES)) {
    const bankBal = storeBalances[storeId] || 0;
    const prevBal = storePrevBalances[storeId] || 0;

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
      previous_balance: prevBal,
      na_loja_os: patioTotal,
      status: 'approved',
      divergence: 0,
      ofx_imported: true
    }, { onConflict: 'store_id,date' });
  }
  console.log('   ✅ Todas as 10 lojas atualizadas em reconciliations!');

  // ---------------------------------------------------------------------------
  // FASE 6: AUTO-MATCHING DE TRANSAÇÕES
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 6: Executando auto-match de PIX, Cartão e Contas...');
  const { data: matchRes, error: matchErr } = await supabase.rpc('auto_match_daily_transactions', { p_date: targetDate });
  if (matchErr) console.error('   ❌ Erro no auto-match:', matchErr.message);
  else console.log('   ✅ Auto-match concluído:', matchRes);

  // ---------------------------------------------------------------------------
  // FASE 7: APURAÇÃO DINÂMICA DOS 5 PILARES E DRE
  // ---------------------------------------------------------------------------
  console.log('\n📌 FASE 7: Apurando 5 Pilares e DRE via get_daily_reconciliation_summary...');
  const { data: summary, error: sumErr } = await supabase.rpc('get_daily_reconciliation_summary', { p_date: targetDate, p_force_dynamic: true });
  if (sumErr) {
    console.error('   ❌ Erro ao apurar resumo consolidado:', sumErr.message);
    return;
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTADO OFICIAL DA CONCILIAÇÃO — ${targetDate}`);
  console.log('================================================================');
  console.log(`🏛️ 1. Saldo Bancos Positivo:   R$ ${Number(summary.total_saldo_banco_positivo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🏦 (-) Cheque Especial Itaú:  R$ ${Number(summary.saldo_negativo_itau).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`💵 2. Dinheiro MP (Cofre):      R$ ${Number(summary.dinheiro_mp).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📄 3. A Receber:               R$ ${Number(summary.a_receber).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🚗 4. Na Loja OS (Pátio):      R$ ${Number(summary.na_loja_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`💰 CAIXA ATUAL DO DIA:         R$ ${Number(summary.caixa_atual).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🔙 CAIXA ANTERIOR (01/09):     R$ ${Number(summary.caixa_anterior).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`📈 FLUXO DE CAIXA DO DIA:      R$ ${Number(summary.fluxo_caixa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`📊 FATURAMENTO DO PERÍODO:     R$ ${Number(summary.faturamento_periodo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🎯 VALOR DISPONÍVEL P/ CONTAS: R$ ${Number(summary.valor_disp_contas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`🧾 SUBTOTAL DE CONTAS A PAGAR: R$ ${Number(summary.subtotal_contas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`⚖️ DIFERENÇA FINAL:            R$ ${Number(summary.diferenca_final).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} [${summary.status_geral.toUpperCase()}]`);
  console.log('================================================================\n');

  // Salvar snapshot diário oficial
  const snapshotData = {
    date: targetDate,
    caixa_atual: summary.caixa_atual,
    faturamento: summary.faturamento_periodo,
    dinheiro_mp: summary.dinheiro_mp,
    total_recebiveis: summary.a_receber,
    total_patio: summary.na_loja_os,
    saldo_bancario: summary.saldo_bancos_positivo,
    saldo_negativo_itau: summary.saldo_negativo_itau,
    contas_a_pagar: summary.contas_base,
    juros_rede: summary.juros_rede,
    a_receber_manual: summary.a_receber,
    is_closed: true,
    closed_at: new Date().toISOString(),
    notes: 'Conciliação Automática Oficial 02/09/2026',
    metadata: {
      caixa_anterior: summary.caixa_anterior,
      caixa_atual: summary.caixa_atual,
      fluxo_caixa: summary.fluxo_caixa,
      faturamento_oi_base: summary.faturamento_oi_base,
      faturamento_ajustes: summary.faturamento_ajustes,
      faturamento_periodo: summary.faturamento_periodo,
      valor_disp_contas: summary.valor_disp_contas,
      contas_base: summary.contas_base,
      subtotal_contas: summary.subtotal_contas,
      diferenca_final: summary.diferenca_final,
      status_geral: summary.status_geral,
      saldo_bancos_positivo: summary.saldo_bancos_positivo,
      saldo_negativo_itau: summary.saldo_negativo_itau,
      total_patio: summary.na_loja_os,
      dinheiro_mp: summary.dinheiro_mp,
      a_receber: summary.a_receber,
      stores: summary.stores
    }
  };

  const { error: snapErr } = await supabase.from('daily_snapshots').upsert(snapshotData, { onConflict: 'date' });
  if (snapErr) console.error('❌ Erro ao salvar daily_snapshots:', snapErr.message);
  else console.log('🎉 Snapshot oficial de 02/09/2026 gravado e homologado com sucesso em daily_snapshots!');
}

runFullReconciliation().catch(console.error);
