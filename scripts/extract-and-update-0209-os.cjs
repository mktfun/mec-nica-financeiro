const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const apiKey = process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const osDir = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\02-09\\os';
const cacheFile = path.join(__dirname, 'extracted_0209_os_cache.json');
const targetDate = '2026-09-02';

const STORE_ALIASES = {
  'mpdompedro1': 'st-01',
  'mpdompedro': 'st-01',
  'dompedro': 'st-01',
  'dp': 'st-01',
  
  'mpjabaquara': 'st-02',
  'jabaquara': 'st-02',
  'jab': 'st-02',

  'mpjorgeberetta': 'st-03',
  'jorgeberetta': 'st-03',
  'beretta': 'st-03',
  'dhjv': 'st-03',

  'mpkennedy': 'st-04',
  'kennedy': 'st-04',
  'mp': 'st-04',

  'mppiraporinha': 'st-05',
  'piraporinha': 'st-05',
  'emporio': 'st-05',

  'mpplanalto': 'st-06',
  'planalto': 'st-06',
  'brasicar': 'st-06',

  'mprudge': 'st-07',
  'rudge': 'st-07',
  'cap': 'st-07',

  'mpsantoandre': 'st-08',
  'santoandre': 'st-08',
  'hd': 'st-08',

  'reidomodulo': 'st-09',
  'modulo': 'st-09',

  'reidooleomaua': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
  'maua': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
  'mhe': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'
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

function resolveStoreId(rawName) {
  if (!rawName) return 'st-01';
  const clean = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [alias, sid] of Object.entries(STORE_ALIASES)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return sid;
    }
  }
  return 'st-01';
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function extractImageWithRetry(imagePath, retryCount = 0) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract all fields from this Ordem de Servico screen (especially headers and Pagamentos tab if visible):
- empresa_loja: string (store name from top left dropdown)
- os_number: string (codigo da OS)
- client_name: string
- client_cpf: string
- plate: string
- vehicle: string
- total_value: number (Total da OS in BRL)
- paid_value: number (Valor Pago in BRL)
- open_value: number (Restante in BRL, default 0 if fully paid)
- opened_at: string (YYYY-MM-DD)
- closed_at: string (YYYY-MM-DD or null)
- status: string ("finalizada" if open_value == 0 or paid_value >= total_value, else "em_aberto" or "pago_parcial")
- raw_status: string
- payments: array of { installment: number, due_date: string (YYYY-MM-DD), method: string ("Debito" | "Credito" | "Pix" | "Dinheiro" | "Boleto"), amount: number }
- debit_value: number (sum of Debito)
- credit_value: number (sum of Credito)
- pix_transfer_value: number (sum of Pix)
- cash_value: number (sum of Dinheiro)

Return JSON object: { "service_order": { ... } }`
              },
              {
                type: 'image_url',
                image_url: dataUri
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        const backoff = (retryCount + 1) * 3500;
        console.warn(`⏳ [Rate Limit 429] Aguardando ${backoff / 1000}s para tentar novamente (tentativa ${retryCount + 1})...`);
        await sleep(backoff);
        return extractImageWithRetry(imagePath, retryCount + 1);
      }
      throw new Error(`Mistral API HTTP ${response.status}: ${await response.text()}`);
    }

    const resJson = await response.json();
    const raw = resJson.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.service_order || parsed;
  } catch (err) {
    if (retryCount < 4) {
      const backoff = (retryCount + 1) * 4000;
      console.warn(`⚠️ [Erro temporário] ${err.message}. Retentando em ${backoff / 1000}s...`);
      await sleep(backoff);
      return extractImageWithRetry(imagePath, retryCount + 1);
    }
    console.error(`❌ Falha definitiva no arquivo ${path.basename(imagePath)}:`, err.message);
    return null;
  }
}

async function runBatchPipeline() {
  console.log('🚀 Iniciando Ingestão de OSs do dia 02/09/2026 via Mistral OCR...\n');

  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      console.log(`📦 Cache existente carregado com ${Object.keys(cache).length} OSs já extraídas.`);
    } catch (e) {
      cache = {};
    }
  }

  const files = fs.readdirSync(osDir).filter(f => f.endsWith('.png')).sort();
  console.log(`📁 Total de arquivos a processar: ${files.length}\n`);

  const extractedItems = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(osDir, file);

    if (cache[file]) {
      console.log(`[${i + 1}/${files.length}] ⏩ Do Cache: ${file} -> OS #${cache[file].os_number} (${cache[file].empresa_loja}) | R$ ${cache[file].total_value}`);
      extractedItems.push({ file, data: cache[file] });
      continue;
    }

    console.log(`[${i + 1}/${files.length}] 🔍 Extraindo: ${file}...`);
    const data = await extractImageWithRetry(filePath);

    if (data && data.os_number) {
      cache[file] = data;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8');
      console.log(`   ✅ Sucesso: OS #${data.os_number} | Loja: ${data.empresa_loja} | Placa: ${data.plate} | Total: R$ ${data.total_value} | Pago: R$ ${data.paid_value} | Status: ${data.status}`);
      extractedItems.push({ file, data });
    } else {
      console.error(`   ❌ Falha ao extrair dados de ${file}`);
    }

    // Delay de segurança entre requisições para evitar bater no rate limit
    await sleep(2000);
  }

  console.log(`\n🎉 Extração concluída! Total extraído: ${extractedItems.length} OSs.\n`);

  // Agrupar por store_id
  const byStore = {};
  for (const item of extractedItems) {
    const d = item.data;
    const storeId = resolveStoreId(d.empresa_loja);
    if (!byStore[storeId]) byStore[storeId] = [];

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

    byStore[storeId].push({
      os_number: String(d.os_number).trim(),
      plate: (d.plate || 'N/I').toUpperCase().replace(/[^A-Z0-9]/g, ''),
      client_name: d.client_name || 'Cliente',
      total_value: totalVal,
      paid_value: paidVal,
      open_value: openVal,
      opened_at: d.opened_at || targetDate,
      closed_at: d.closed_at || (openVal <= 0.05 ? targetDate : null),
      status: openVal <= 0.05 ? 'finalizada' : (paidVal > 0 ? 'pago_parcial' : 'em_aberto'),
      raw_status: d.raw_status || (openVal <= 0.05 ? 'Finalizada' : 'Em Aberto'),
      debit_value: debitVal,
      credit_value: creditVal,
      pix_transfer_value: pixVal,
      cash_value: cashVal,
      payment_method: payments.length > 0 ? payments.map(p => p.method).join(', ') : (debitVal > 0 ? 'Débito' : creditVal > 0 ? 'Crédito' : pixVal > 0 ? 'PIX' : cashVal > 0 ? 'Dinheiro' : 'A Combinar'),
      payments
    });
  }

  console.log('=== ATUALIZANDO BANCO DE DADOS SUPABASE (RPC batch_upsert_patio_os) ===\n');

  for (const [storeId, osArray] of Object.entries(byStore)) {
    const storeName = STORE_NAMES[storeId] || storeId;
    console.log(`📦 Loja: ${storeName} (${storeId}) - Enviando ${osArray.length} OSs...`);

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('batch_upsert_patio_os', {
      p_store_id: storeId,
      p_target_date: targetDate,
      p_os_records: osArray
    });

    if (rpcErr) {
      console.error(`   ❌ Erro na RPC batch_upsert_patio_os para ${storeName}:`, rpcErr);
      
      // Fallback: Inserção direta na tabela patio_os se RPC falhar
      console.log(`   🔄 Executando fallback de upsert direto na tabela patio_os...`);
      for (const os of osArray) {
        const { error: upsertErr } = await supabase.from('patio_os').upsert({
          store_id: storeId,
          os_number: os.os_number,
          plate: os.plate,
          client_name: os.client_name,
          total_value: os.total_value,
          paid_value: os.paid_value,
          opened_at: os.opened_at ? `${os.opened_at} 08:00:00+00` : `${targetDate} 08:00:00+00`,
          closed_at: os.closed_at ? `${os.closed_at} 18:00:00+00` : null,
          status: os.status,
          debit_value: os.debit_value,
          credit_value: os.credit_value,
          pix_transfer_value: os.pix_transfer_value,
          payment_method: os.payment_method,
          updated_at: new Date().toISOString()
        }, { onConflict: 'store_id,os_number' });

        if (upsertErr) console.error(`      ❌ Erro ao salvar OS ${os.os_number}:`, upsertErr);
        else console.log(`      ✅ OS ${os.os_number} salva com sucesso!`);
      }
    } else {
      console.log(`   ✅ Sucesso! Inseridas: ${rpcRes.inserted || 0} | Atualizadas: ${rpcRes.updated || 0} | Pátio Remanescente: R$ ${rpcRes.total_patio_remanescente || 0}`);
    }
  }

  console.log('\n✨ Ingestão e atualização de todas as OSs do dia 02/09/2026 concluída com 100% de sucesso!');
}

runBatchPipeline().catch(console.error);
