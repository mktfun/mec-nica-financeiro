import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
  console.log('Environment AI keys:');
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'EXISTS' : 'NONE');
  console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'EXISTS' : 'NONE');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'EXISTS' : 'NONE');
  console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'EXISTS' : 'NONE');

  const { data: settings, error } = await supabase.from('ai_settings').select('*');
  console.log('\nai_settings table rows count:', settings ? settings.length : 0);
  if (error) console.error('Error fetching ai_settings:', error);
  else console.log('ai_settings content:', JSON.stringify(settings, null, 2));
}

checkConfig().catch(console.error);
