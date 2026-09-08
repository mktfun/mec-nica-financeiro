const fs = require('fs');
const path = require('path');
require('dotenv').config();

const apiKey = process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY;
const filePath = 'C:\\Users\\admin\\Desktop\\conciliacao\\09-26\\02-09\\os\\Captura de tela 2026-09-02 160833.png';

async function testSingle() {
  const imageBuffer = fs.readFileSync(filePath);
  const base64 = imageBuffer.toString('base64');
  const dataUri = `data:image/png;base64,${base64}`;

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
              text: `Extract all fields from this Ordem de Servico screen:
- empresa_loja: string
- os_number: string
- client_name: string
- client_cpf: string
- plate: string
- vehicle: string
- total_value: number
- paid_value: number
- open_value: number
- opened_at: string
- closed_at: string
- status: string
- raw_status: string
- payments: array of { installment: number, due_date: string, method: string, amount: number }
- debit_value: number
- credit_value: number
- pix_transfer_value: number
- cash_value: number

Return JSON: { "service_order": { ... } }`
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

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

testSingle().catch(console.error);
