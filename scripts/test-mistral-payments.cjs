const fs = require('fs');

async function testPaymentsOcr() {
  const imgPath = 'C:/Users/admin/.gemini/antigravity/brain/f121c45f-bbee-4df6-95ae-a4e20b3c90d9/.user_uploaded/media_1788351234756.png';
  const imgBase64 = fs.readFileSync(imgPath).toString('base64');

  console.log('Enviando print da aba Pagamentos para Mistral Vision...');
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer THzNUzZaUm490FThCycu6H46IW6CsCLQ',
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
              text: `Extract all data from this Ordem de Servico screen (especially the Pagamentos tab):
- empresa_loja: string
- os_number: string
- client_name: string
- client_cpf: string
- plate: string
- vehicle: string
- total_value: number
- paid_value: number
- open_value: number (Restante)
- opened_at: string (YYYY-MM-DD)
- closed_at: string (YYYY-MM-DD or null)
- status: string ("finalizada" if open_value == 0 or paid_value >= total_value, else "em_aberto" or "pago_parcial")
- payments: array of objects { installment: number, due_date: string (YYYY-MM-DD), method: string ("Debito" | "Credito" | "Pix" | "Dinheiro" | "Boleto"), amount: number }
- debit_value: number (sum of Debito)
- credit_value: number (sum of Credito)
- pix_transfer_value: number (sum of Pix)
- cash_value: number (sum of Dinheiro)

Return JSON with key "service_order".`
            },
            {
              type: 'image_url',
              image_url: `data:image/png;base64,${imgBase64}`
            }
          ]
        }
      ]
    })
  });

  const json = await response.json();
  console.log('Status HTTP:', response.status);
  if (json.choices && json.choices[0]) {
    console.log('Resultado Extraído do Mistral:\n', json.choices[0].message.content);
  } else {
    console.log('Erro:', json);
  }
}

testPaymentsOcr().catch(console.error);
