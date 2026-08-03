import { z } from 'npm:zod@3'
import { tool } from 'npm:ai@latest'

const logMcpExecution = async (supabaseClient: any, action: string, params: any, result: any, userId?: string) => {
  try {
    await supabaseClient.from('mcp_logs').insert([{
      conversation_id: userId || 'auto-mcp-log',
      action,
      params,
      result
    }]);
  } catch (err) {
    console.error('Failed to log MCP execution:', err);
  }
};

export const toolsOficina = (supabaseClient: any, settings: any, userId: string) => {
  const BOT_URL = settings?.bot_url || Deno.env?.get?.('BOT_URL') || 'https://bot.tork.services';
  const BOT_API_KEY = settings?.bot_api_key || Deno.env?.get?.('BOT_API_KEY') || '';

  return {
    consulta_os_detalhe_completo: tool({
      description: 'Consulta os detalhes COMPLETOS de uma OS na API EXTERNA (Oficina) ou no Cache Local. Informe loja para direcionar a empresa correta. ALERTA: Retorna peças, checklist, valores.',
      parameters: z.object({
        osNumber: z.string().describe('O número da OS (ex: 1763)'),
        loja: z.string().describe('Slug ou store_id da loja (ex: jab_jabaquara, st-02)')
      }),
      execute: async ({ osNumber, loja }) => {
        try {
          // 1. Tenta ler do cache
          const { data: cached } = await supabaseClient
            .from('oficina_os_cache')
            .select('*')
            .eq('store_id', loja)
            .eq('os_number', osNumber)
            .single();

          if (cached && cached.status_cache === 'FINALIZADO') {
            await logMcpExecution(supabaseClient, 'consulta_os_detalhe_completo', { osNumber, loja, source: 'cache' }, cached.payload_completo, userId);
            return cached.payload_completo;
          }

          // 2. Se não tem ou não está finalizada, busca no bot (Timeout 45s)
          const url = `${BOT_URL}/api/os/detalhe/${osNumber}?loja=${encodeURIComponent(loja)}`;
          const response = await fetch(url, {
            headers: { 'x-api-key': BOT_API_KEY },
            signal: AbortSignal.timeout(45000)
          });
          
          if (!response.ok) return { aviso: `API externa retornou HTTP ${response.status}. Utilize os dados do banco local.` };
          const json = await response.json();
          
          // 3. Salva no cache
          if (json.success && json.data) {
             const statusStr = (json.data.status || '').toUpperCase();
             await supabaseClient.from('oficina_os_cache').upsert({
               store_id: loja,
               os_number: osNumber,
               status_cache: statusStr,
               payload_completo: json,
               updated_at: new Date().toISOString()
             }, { onConflict: 'store_id, os_number' });
          }

          await logMcpExecution(supabaseClient, 'consulta_os_detalhe_completo', { osNumber, loja, source: 'bot' }, json, userId);
          return json;
        } catch (e: any) {
          return { aviso: `API externa indisponível ou timed out (${e.message}). Tente novamente mais tarde.` };
        }
      },
    }),
    consulta_contas_pagar_oficina: tool({
      description: 'Busca Contas a Pagar lendo do banco de dados sincronizado local (rápido). Use quando o usuário perguntar sobre contas a pagar, fornecedores, parcelas. EXIGE saber a loja.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja (ex: jab_jabaquara, brasicar_planalto)')
      }),
      execute: async ({ loja }) => {
        try {
          const { data, error } = await supabaseClient
            .from('oficina_contas')
            .select('*')
            .eq('store_id', loja)
            .eq('tipo', 'PAGAR')
            .neq('status', 'PAG'); // Oculta pagas

          if (error) throw error;
          
          const result = { success: true, data: data };
          await logMcpExecution(supabaseClient, 'consulta_contas_pagar_oficina', { loja, source: 'db' }, result, userId);
          return result;
        } catch (e: any) {
          return { aviso: `Erro ao consultar banco de dados (${e.message}).` };
        }
      }
    }),
    consulta_contas_receber_oficina: tool({
      description: 'Busca Contas a Receber lendo do banco sincronizado local.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja')
      }),
      execute: async ({ loja }) => {
        try {
          const { data, error } = await supabaseClient
            .from('oficina_contas')
            .select('*')
            .eq('store_id', loja)
            .eq('tipo', 'RECEBER');
          
          if (error) throw error;
          const result = { success: true, data: data };
          await logMcpExecution(supabaseClient, 'consulta_contas_receber_oficina', { loja, source: 'db' }, result, userId);
          return result;
        } catch (e: any) {
          return { aviso: `Erro ao consultar banco de dados (${e.message}).` };
        }
      }
    }),
    consulta_agenda_oficina: tool({
      description: 'Busca a agenda de serviços no Oficina Inteligente via Bot. EXIGE loja e período.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja'),
        data_inicio: z.string().describe('Data de início YYYY-MM-DD'),
        data_fim: z.string().describe('Data de fim YYYY-MM-DD')
      }),
      execute: async ({ loja, data_inicio, data_fim }) => {
        try {
          const url = `${BOT_URL}/api/agenda?loja=${encodeURIComponent(loja)}&data_inicio=${data_inicio}&data_fim=${data_fim}`;
          const response = await fetch(url, { headers: { 'x-api-key': BOT_API_KEY }, signal: AbortSignal.timeout(45000) });
          if (!response.ok) return { error: `Erro na API externa (HTTP ${response.status}). Falha ao buscar agenda.` };
          const json = await response.json();
          await logMcpExecution(supabaseClient, 'consulta_agenda_oficina', { loja, data_inicio, data_fim }, json, userId);
          return json;
        } catch (e: any) {
          return { error: `Falha de conexão com a API externa: ${e.message}` };
        }
      }
    }),
    consulta_config_oficina: tool({
      description: 'Busca configurações do sistema Oficina via Bot.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja'),
        recurso: z.enum(['status-os', 'formas-pagamento']).describe('Qual configuração buscar')
      }),
      execute: async ({ loja, recurso }) => {
        try {
          const url = `${BOT_URL}/api/config/${recurso}?loja=${encodeURIComponent(loja)}`;
          const response = await fetch(url, { headers: { 'x-api-key': BOT_API_KEY }, signal: AbortSignal.timeout(45000) });
          if (!response.ok) return { error: `Erro na API externa (HTTP ${response.status}). Falha ao buscar configuração ${recurso}.` };
          const json = await response.json();
          await logMcpExecution(supabaseClient, 'consulta_config_oficina', { loja, recurso }, json, userId);
          return json;
        } catch (e: any) {
          return { error: `Falha de conexão com a API externa: ${e.message}` };
        }
      }
    })
  };
};
