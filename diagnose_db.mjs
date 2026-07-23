import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://cnwzsvowkfymtdiryhqc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNud3pzdm93a2Z5bXRkaXJ5aHFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA1MzcwOCwiZXhwIjoyMDk1NjI5NzA4fQ.IIkBHI70sazbBgrg22ddFujEYJKX8PYWGn3kHbou7Ps";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
  console.log("--- DIAGNOSTICO DE IMPORTACAO ---");
  
  // 1. Check OSs
  const { data: osData } = await supabase.from('patio_os').select('id, os_number, store_id, closed_at, opened_at, paid_value').order('created_at', { ascending: false }).limit(20);
  console.log("Ultimas 20 OSs:");
  console.log(osData);

  // 2. Check Recebiveis (Rede)
  const { data: recData } = await supabase.from('recebiveis').select('id, type, value, date, store_id').order('created_at', { ascending: false }).limit(20);
  console.log("Ultimos 20 Recebiveis (Rede):");
  console.log(recData);

  // 3. Check OFX
  const { data: ofxData } = await supabase.from('ofx_transactions').select('id, amount, date, description, store_id').order('created_at', { ascending: false }).limit(20);
  console.log("Ultimas 20 Transacoes OFX:");
  console.log(ofxData);
}

diagnose().catch(console.error);
