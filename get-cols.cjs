require('dotenv').config();
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'cnwzsvowkfymtdiryhqc';

async function runSql() {
  const response = await fetch('https://api.supabase.com/v1/projects/' + projectRef + '/database/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'transactions'" })
  });
  console.log(await response.text());
}
runSql();
