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
      description: 'Consulta os detalhes COMPLETOS de uma OS na API EXTERNA (Oficina). Use SOMENTE se a OS não for encontrada localmente ou se faltar dados profundos (checklist, histórico). Informe loja para direcionar a empresa correta. ALERTA DE ALUCINAÇÃO: Se o JSON retornar erro ou vazio, NUNCA INVENTE DADOS. Diga que não encontrou a OS. O JSON retornado é a única fonte da verdade.',
      parameters: z.object({
        osNumber: z.string().describe('O número da OS (ex: 1763)'),
        loja: z.string().optional().describe('Slug ou store_id da loja (ex: jab_jabaquara, st-02)')
      }),
      execute: async ({ osNumber, loja }) => {
        try {
          const lojaParam = loja ? `?loja=${encodeURIComponent(loja)}` : '';
          const url = `${BOT_URL}/api/os/detalhe/${osNumber}${lojaParam}`;
          const response = await fetch(url, {
            headers: { 'x-api-key': BOT_API_KEY }
          });
          if (!response.ok) return { error: `Erro na API externa (HTTP ${response.status}). Detalhes: A API do Oficina retornou status ${response.status} ao consultar OS. Informe o usuário.` };
          const json = await response.json();
          await logMcpExecution(supabaseClient, 'consulta_os_detalhe_completo', { osNumber, loja }, json, userId);
          return json;
        } catch (e: any) {
          return { error: `Falha de conexão com a API externa: ${e.message}. O servidor remoto pode estar inacessível.` };
        }
      },
    }),
    consulta_contas_pagar_oficina: tool({
      description: 'Busca Contas a Pagar diretamente no Oficina Inteligente (sistema externo via bot). Use quando o usuário perguntar sobre contas a pagar, fornecedores, parcelas ou vencimentos. EXIGE saber a loja — se não souber, pergunte antes. ATENÇÃO: A API externa retorna TODAS as contas. É OBRIGATÓRIO que você descarte e ignore qualquer conta no retorno JSON cujo status seja "PAG" (Pagas), mostrando apenas as pendentes, a menos que o usuário peça as pagas. ALERTA DE ALUCINAÇÃO: Se o JSON retornado vier vazio ou após filtrar as "PAG" não sobrar nada, NUNCA INVENTE contas. Diga categoricamente que não há contas a pagar pendentes para essa loja. O JSON retornado é a única fonte da verdade.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja (ex: jab_jabaquara, brasicar_planalto)'),
        vencimento_inicio: z.string().optional().describe('Data de início do vencimento YYYY-MM-DD'),
        vencimento_fim: z.string().optional().describe('Data de fim do vencimento YYYY-MM-DD')
      }),
      execute: async ({ loja, vencimento_inicio, vencimento_fim }) => {
        try {
          let url = `${BOT_URL}/api/contas-pagar?loja=${encodeURIComponent(loja)}`;
          if (vencimento_inicio) url += `&vencimento_inicio=${vencimento_inicio}`;
          if (vencimento_fim) url += `&vencimento_fim=${vencimento_fim}`;
          const response = await fetch(url, { headers: { 'x-api-key': BOT_API_KEY } });
          if (!response.ok) return { error: `Erro na API externa (HTTP ${response.status}). Falha ao buscar contas a pagar no Oficina Inteligente.` };
          const json = await response.json();
          await logMcpExecution(supabaseClient, 'consulta_contas_pagar_oficina', { loja, vencimento_inicio, vencimento_fim }, json, userId);
          return json;
        } catch (e: any) {
          return { error: `Falha de conexão com a API externa: ${e.message}` };
        }
      }
    }),
    consulta_contas_receber_oficina: tool({
      description: 'Busca Contas a Receber diretamente no Oficina Inteligente. Use quando o usuário perguntar sobre valores a receber, clientes devedores ou creditórios pendentes. EXIGE loja.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja'),
        vencimento_inicio: z.string().optional().describe('Data de início YYYY-MM-DD'),
        vencimento_fim: z.string().optional().describe('Data de fim YYYY-MM-DD')
      }),
      execute: async ({ loja, vencimento_inicio, vencimento_fim }) => {
        try {
          let url = `${BOT_URL}/api/contas-receber?loja=${encodeURIComponent(loja)}`;
          if (vencimento_inicio) url += `&vencimento_inicio=${vencimento_inicio}`;
          if (vencimento_fim) url += `&vencimento_fim=${vencimento_fim}`;
          const response = await fetch(url, { headers: { 'x-api-key': BOT_API_KEY } });
          if (!response.ok) return { error: `Erro na API externa (HTTP ${response.status}). Falha ao buscar contas a receber.` };
          const json = await response.json();
          await logMcpExecution(supabaseClient, 'consulta_contas_receber_oficina', { loja, vencimento_inicio, vencimento_fim }, json, userId);
          return json;
        } catch (e: any) {
          return { error: `Falha de conexão com a API externa: ${e.message}` };
        }
      }
    }),
    consulta_agenda_oficina: tool({
      description: 'Busca a agenda de serviços e agendamentos no Oficina Inteligente. Use quando o usuário perguntar sobre horários, agendamentos, escala do dia ou slots disponivéis. EXIGE loja e período.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja'),
        data_inicio: z.string().describe('Data de início YYYY-MM-DD'),
        data_fim: z.string().describe('Data de fim YYYY-MM-DD')
      }),
      execute: async ({ loja, data_inicio, data_fim }) => {
        try {
          const url = `${BOT_URL}/api/agenda?loja=${encodeURIComponent(loja)}&data_inicio=${data_inicio}&data_fim=${data_fim}`;
          const response = await fetch(url, { headers: { 'x-api-key': BOT_API_KEY } });
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
      description: 'Busca configurações do sistema Oficina (status de OS, formas de pagamento). Use quando o usuário perguntar quais status existem, quais formas de pagamento estão cadastradas etc.',
      parameters: z.object({
        loja: z.string().describe('Slug ou store_id da loja'),
        recurso: z.enum(['status-os', 'formas-pagamento']).describe('Qual configuração buscar')
      }),
      execute: async ({ loja, recurso }) => {
        try {
          const url = `${BOT_URL}/api/config/${recurso}?loja=${encodeURIComponent(loja)}`;
          const response = await fetch(url, { headers: { 'x-api-key': BOT_API_KEY } });
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
