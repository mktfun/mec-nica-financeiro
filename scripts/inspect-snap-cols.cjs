const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectSnapColumns() {
  const { data: cols, error } = await supabase.from('daily_snapshots').select('*').limit(1);
  console.log('Sample snapshot row:', cols);
  if (error) console.error('Error:', error);
}

inspectSnapColumns();
