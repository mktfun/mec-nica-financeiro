const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient('https://cnwzsvowkfymtdiryhqc.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps');

async function run() {
  const wb = XLSX.readFile('c:\\Users\\admin\\Desktop\\conciliacao\\CONCILIAÇÃO 1908.xlsx');
  const osSheet = wb.Sheets['OS'];
  const osJson = XLSX.utils.sheet_to_json(osSheet, { header: 1, raw: false });

  console.log('=== OS SHEET IN EXCEL 1908 ===');
  // Store totals in Excel
  const excelTotals = {
    'Planalto': 13369.70,
    'Piraporinha': 5764.90,
    'Mauá': 10218.74,
    'Kennedy': 2936.30,
    'Rudge Ramos': 8451.00,
    'Santo André': 18789.12,
    'Rei do Modulo': 15779.40,
    'Jorge Beretta': 11693.07,
    'Dom Pedro I': 3854.00,
    'Jabaquara': 9297.46
  };
  console.log('Excel total Na Loja OS: R$ 100.153,69');

  // DB patio_os for 19/08
  const { data: patio } = await sb.from('patio_os').select('*');
  const { data: stores } = await sb.from('stores').select('id, name');
  const storeMap = {};
  stores?.forEach(s => { storeMap[s.id] = s.name; });

  const dbByStore = {};
  patio?.forEach(p => {
    const isClosed = ['finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado'].includes((p.status||'').toLowerCase());
    const val = Number(p.total_value || 0) - Number(p.paid_value || 0);
    if (!isClosed && val > 0) {
      const sName = storeMap[p.store_id] || p.store_id;
      dbByStore[sName] = (dbByStore[sName] || 0) + val;
    }
  });

  console.log('\n=== COMPARISON BY STORE (DB vs Excel) ===');
  Object.keys(excelTotals).forEach(name => {
    const dbKey = Object.keys(dbByStore).find(k => k.toLowerCase().includes(name.toLowerCase().slice(0, 4)));
    const dbVal = dbKey ? dbByStore[dbKey] : 0;
    const exVal = excelTotals[name];
    const diff = dbVal - exVal;
    console.log(`${name.padEnd(15)} | Excel: ${exVal.toFixed(2).padStart(9)} | DB: ${dbVal.toFixed(2).padStart(9)} | Diff: ${diff.toFixed(2).padStart(9)}`);
  });
}

run().catch(console.error);
