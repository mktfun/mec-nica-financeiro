require('dotenv').config();

const apiKey = process.env.MISTRAL_API_KEY || process.env.VITE_MISTRAL_API_KEY;

async function testMistral() {
  console.log('Testando Mistral API com chave:', apiKey ? apiKey.substring(0, 6) + '...' : 'NONE');
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 10
      })
    });
    console.log('Status HTTP:', res.status, res.statusText);
    const body = await res.text();
    console.log('Corpo da Resposta:', body);
  } catch (err) {
    console.error('Erro de rede:', err);
  }
}

testMistral();
