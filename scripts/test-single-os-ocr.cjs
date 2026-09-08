const fs = require('fs');
const path = require('path');
require('dotenv').config();

const apiKey = process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY;
const osDir = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\02-09\\os';

async function testSingleOcr() {
  const files = fs.readdirSync(osDir).filter(f => f.endsWith('.png'));
  console.log(`Encontrados ${files.length} arquivos PNG em ${osDir}`);

  if (files.length === 0) return;

  const testFile = files[0];
  const testPath = path.join(osDir, testFile);
  console.log(`Testando primeiro arquivo: ${testFile}`);

  const imageBuffer = fs.readFileSync(testPath);
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  const startTime = Date.now();
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
- os_number: string (codigo)
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

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`HTTP Status: ${response.status} em ${elapsed}s`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Erro na API (${response.status}):`, errText);
    } else {
      const json = await response.json();
      console.log('Resultado extraído:');
      console.log(json.choices?.[0]?.message?.content);
    }
  } catch (err) {
    console.error('Erro:', err);
  }
}

testSingleOcr();
