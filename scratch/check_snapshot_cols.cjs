const { createClient } = require('@supabase/supabase-js');
const sb = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps');

async function run() {
  const { data, error } = await sb.from('daily_snapshots').select('*').limit(1);
  if (error) console.error(error);
  else {
    console.log('Valid columns on daily_snapshots:');
    console.log(Object.keys(data[0]));
  }
}
run();
