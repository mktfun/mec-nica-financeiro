const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const apiKey = process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const osDir = 'C:\\Users\\admin\\Desktop\\os';
const cacheFile = path.join(__dirname, 'extracted_0309_os_cache.json');
const targetDate = '2026-09-03';

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
            role: 'system',
            content: `Você é um extrator especialista de dados do ERP Oficina Inteligente.
Extraia os seguintes campos da imagem da Ordem de Serviço (aba Pagamentos / Cabeçalho):
{
  "store_raw": "Nome da loja no cabeçalho ou título da janela (ex: MP Jabaquara, MP Rudge, Rei do Oleo Maua, Dom Pedro)",
  "os_number": "Número da OS (ex: 403, 22595, etc.)",
  "client_name": "Nome do cliente",
  "plate": "Placa do veículo",
  "vehicle": "Modelo do veículo",
  "total_value": 0.00,
  "paid_value": 0.00,
  "open_value": 0.00,
  "credit_value": 0.00,
  "debit_value": 0.00,
  "pix_transfer_value": 0.00,
  "cash_value": 0.00,
  "payments": [
    {
      "method": "Cartão de Crédito / Débito / PIX / Dinheiro / Boleto",
      "amount": 0.00,
      "date": "YYYY-MM-DD",
      "status": "pago ou pendente"
    }
  ],
  "opened_at": "YYYY-MM-DD",
  "closed_at": "YYYY-MM-DD ou null"
}
Retorne estritamente o JSON.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados desta Ordem de Serviço com máxima precisão contábil.' },
              { type: 'image_url', image_url: dataUri }
            ]
          }
        ],
        temperature: 0.1
      })
    });

    if (response.status === 429) {
      const waitTime = Math.min(30000, 3000 * Math.pow(2, retryCount) + Math.random() * 1000);
      console.warn(`⏳ [Rate Limit 429] Aguardando ${(waitTime / 1000).toFixed(1)}s antes de tentar novamente...`);
      await sleep(waitTime);
      return extractImageWithRetry(imagePath, retryCount + 1);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Mistral API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    if (retryCount < 5) {
      console.warn(`⚠️ Erro ao processar ${path.basename(imagePath)} (tentativa ${retryCount + 1}): ${err.message}`);
      await sleep(2500);
      return extractImageWithRetry(imagePath, retryCount + 1);
    }
    throw err;
  }
}

async function processAllOsImages() {
  console.log('================================================================');
  console.log('🔍 EXTRAÇÃO DAS 25 IMAGENS DE OS VIA MISTRAL VISION');
  console.log('================================================================\n');

  let cache = {};
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      console.log(`📦 Cache existente carregado com ${Object.keys(cache).length} imagens.`);
    } catch (_) {}
  }

  const files = fs.readdirSync(osDir).filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg'));
  console.log(`📸 Encontradas ${files.length} imagens em ${osDir}.\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(osDir, file);

    if (cache[file]) {
      console.log(`[${i + 1}/${files.length}] ⏭️  ${file} (Do cache: OS #${cache[file].os_number} - ${cache[file].store_raw})`);
      continue;
    }

    console.log(`[${i + 1}/${files.length}] 🤖 Processando ${file}...`);
    try {
      const extracted = await extractImageWithRetry(fullPath);
      cache[file] = extracted;
      fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));

      console.log(`   ✅ Extraído: OS #${extracted.os_number} | Loja: ${extracted.store_raw} | Cliente: ${extracted.client_name} | Total: R$ ${extracted.total_value} | Pago: R$ ${extracted.paid_value}`);
      
      // Delay defensivo de 1.5s entre chamadas para prevenir 429
      await sleep(1500);
    } catch (err) {
      console.error(`   ❌ Falha ao processar ${file}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log('🚀 ATUALIZANDO BANCO DE DADOS SUPABASE (patio_os)');
  console.log('================================================================\n');

  const dedupMap = new Map();

  for (const [file, d] of Object.entries(cache)) {
    const storeId = resolveStoreId(d.store_raw);
    const storeName = STORE_NAMES[storeId];

    let osNum = String(d.os_number || '').trim().replace(/[^0-9]/g, '');
    if (!osNum) continue;

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

    const isFinalizada = openVal <= 0.05 && totalVal > 0;
    const isParcial = paidVal > 0 && openVal > 0.05;
    const status = isFinalizada ? 'finalizada' : (isParcial ? 'pago_parcial' : 'em_aberto');

    const paymentMethodDesc = payments.length > 0
      ? payments.map(p => p.method).join(', ')
      : (debitVal > 0 ? 'Débito' : creditVal > 0 ? 'Crédito' : pixVal > 0 ? 'PIX' : cashVal > 0 ? 'Dinheiro' : 'A Combinar');

    dedupMap.set(key, {
      store_id: storeId,
      store_name: storeName,
      os_number: osNum,
      plate: (d.plate || 'S/PLACA').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PATIO',
      client_name: d.client_name || 'Cliente',
      total_value: totalVal,
      paid_value: paidVal,
      credit_value: creditVal,
      debit_value: debitVal,
      pix_transfer_value: pixVal,
      cash_value: cashVal,
      status: status,
      raw_status: isFinalizada ? 'Finalizada' : (isParcial ? 'Pago Parcial' : 'Em Aberto'),
      payment_method: paymentMethodDesc,
      opened_at: `${d.opened_at || targetDate} 08:00:00+00`,
      closed_at: isFinalizada ? `${targetDate} 18:00:00+00` : null,
      updated_at: new Date().toISOString()
    });
  }

  const osList = Array.from(dedupMap.values());
  console.log(`📝 Realizando upsert de ${osList.length} OSs únicas em patio_os...`);

  for (const os of osList) {
    const { error } = await supabase.from('patio_os').upsert(os, { onConflict: 'store_id,os_number' });
    if (error) {
      console.error(`❌ Erro ao salvar OS #${os.os_number} (${os.store_name}):`, error.message);
    } else {
      console.log(`✅ OS #${os.os_number} (${os.store_name}): R$ ${os.total_value} | Pago: R$ ${os.paid_value} [${os.status.toUpperCase()}]`);
    }
  }

  console.log('\n🎉 Todas as 25 imagens processadas e atualizadas com sucesso em patio_os!');
}

processAllOsImages().catch(console.error);
