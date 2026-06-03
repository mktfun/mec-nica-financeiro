import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const lines = env.split('\n');
let url = '';
let key = '';
for (const line of lines) {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/"/g, '');
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/"/g, '');
}

async function check() {
  const res = await fetch(`${url}/rest/v1/transactions?limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('No data or error:', data);
  }
}
check();
