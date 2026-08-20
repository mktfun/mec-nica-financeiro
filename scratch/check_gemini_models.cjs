const apiKey = process.env.GEMINI_API_KEY || '';

async function listModels() {
  if (!apiKey) {
    console.log('Nenhuma GEMINI_API_KEY fornecida no ambiente.');
    return;
  }
  console.log('Testing Gemini API key...');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data.error) {
      console.error('API Error:', data.error);
    } else {
      console.log('Available Models:');
      data.models?.filter(m => m.name.includes('gemini') || m.name.includes('flash')).forEach(m => {
        console.log(`- ${m.name} | ${m.displayName} | inputTokenLimit: ${m.inputTokenLimit}`);
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

listModels();
