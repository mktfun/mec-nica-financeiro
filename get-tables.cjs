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
    body: JSON.stringify({ query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'" })
  });
  console.log(await response.text());
}
runSql();
