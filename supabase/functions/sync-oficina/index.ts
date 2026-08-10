import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'npm:@supabase/supabase-js@2.44.2'

const BOT_URL = Deno.env.get('BOT_URL') || 'https://bot.tork.services';
const BOT_API_KEY = Deno.env.get('BOT_API_KEY') || '';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { loja } = await req.json();
    if (!loja) throw new Error("Parâmetro 'loja' é obrigatório.");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Sincronizar Contas a Pagar
    const urlContas = `${BOT_URL}/api/contas-pagar?loja=${encodeURIComponent(loja)}`;
    const resContas = await fetch(urlContas, { headers: { 'x-api-key': BOT_API_KEY } });
    
    if (resContas.ok) {
      const jsonContas = await resContas.json();
      if (jsonContas.success && Array.isArray(jsonContas.data)) {
        const rows = jsonContas.data.map((c: any) => ({
          store_id: loja,
          id_interno: c.id_interno,
          fornecedor: c.fornecedor,
          valor_original: Number(c.valor_original) || 0,
          valor_em_aberto: Number(c.valor_em_aberto) || 0,
          vencimento: c.vencimento || null,
          status: c.status || 'AND',
          tipo: 'PAGAR',
          updated_at: new Date().toISOString()
        }));

        if (rows.length > 0) {
          await supabase.from('oficina_contas').upsert(rows, { onConflict: 'store_id, id_interno, tipo' });
        }
      }
    }

    // 2. Sincronizar OSs (Resumo) - Se existir endpoint
    // Placeholder para futuro endpoint /api/os-lista
    /*
    const urlOS = `${BOT_URL}/api/os-lista?loja=${encodeURIComponent(loja)}`;
    const resOS = await fetch(urlOS, { headers: { 'x-api-key': BOT_API_KEY } });
    ... upsert em oficina_os_cache
    */

    return new Response(
      JSON.stringify({ success: true, message: "Sincronização concluída com sucesso." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
