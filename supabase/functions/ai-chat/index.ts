import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { generateText, tool } from 'npm:ai@3'
import { createOpenAI } from 'npm:@ai-sdk/openai@0'
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@0'
import { createAnthropic } from 'npm:@ai-sdk/anthropic@0'
import { z } from 'npm:zod@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()
    
    // Auth Check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Fetch AI Settings
    const { data: settings } = await supabaseClient
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let llmModel;
    
    if (settings?.provider === 'openai' && settings?.api_key) {
      const openai = createOpenAI({ apiKey: settings.api_key })
      llmModel = openai(settings.model || 'gpt-4o')
    } else if (settings?.provider === 'anthropic' && settings?.api_key) {
      const anthropic = createAnthropic({ apiKey: settings.api_key })
      llmModel = anthropic(settings.model || 'claude-3-5-sonnet-20240620')
    } else {
      // Default to Google Generative AI (Requires either user key or env default)
      const apiKey = settings?.api_key || Deno.env.get('GOOGLE_API_KEY')
      if (!apiKey) throw new Error('API Key não configurada para o provedor selecionado.')
      const google = createGoogleGenerativeAI({ apiKey })
      llmModel = google(settings?.model || 'gemini-2.0-flash')
    }

    // MCP Proxy invocation helper
    const invokeMCP = async (action: string, params: any) => {
        const { data, error } = await supabaseClient.functions.invoke('mcp-proxy', {
            body: { 
              action, 
              params,
              config: {
                mcpUrl: settings?.bot_url,
                apiKey: settings?.bot_api_key
              }
            }
        })
        if (error) throw new Error(`MCP Error: ${error.message}`)
        
        // Log the action so UI can read it
        // We do it asynchronously to not block
        supabaseClient.from('mcp_logs').insert([{
            conversation_id: 'auto-mcp-log', // the UI handles this better on the client usually, but this is server side
            action,
            params,
            result: data,
        }]).then()

        return data;
    }

    const mcpTools = {
      consulta_os_detalhe_completo: tool({
        description: 'Consulta os detalhes COMPLETOS de uma Ordem de Serviço na API EXTERNA (Oficina Inteligente). Use SOMENTE se a OS não for encontrada localmente ou se faltar dados profundos (checklist, histórico).',
        parameters: z.object({
          osNumber: z.string().describe('O número da OS (ex: 1763)')
        }),
        execute: async ({ osNumber }) => {
          try {
            const url = `${settings?.bot_url}/api/os/detalhe/${osNumber}`;
            const response = await fetch(url, {
              headers: {
                'x-api-key': settings?.bot_api_key || ''
              }
            });
            if (!response.ok) return { error: `Erro na API externa: HTTP ${response.status}. Use apenas os dados locais.` };
            const json = await response.json();
            
            await supabaseClient.from('mcp_logs').insert([{
              conversation_id: 'auto-mcp-log',
              action: 'consulta_os_detalhe_completo',
              params: { osNumber },
              result: json
            }]);
            
            return json;
          } catch (e: any) {
            return { error: `Falha de conexão com a API externa: ${e.message}. Use apenas os dados locais.` };
          }
        },
      }),
      consulta_resumo_os: tool({
        description: 'Consulta o banco de dados LOCAL para listar Ordens de Serviço (OS). Use esta ferramenta ANTES de chamar APIs externas. Retorna status, placa, loja e valores.',
        parameters: z.object({
          osNumber: z.string().optional().describe('Número específico da OS'),
          loja: z.string().optional().describe('ID da loja (ex: mp_jabaquara)'),
          limit: z.number().default(10).describe('Quantidade de OS a retornar')
        }),
        execute: async ({ osNumber, loja, limit }) => {
           let query = supabaseClient.from('patio_os').select('*');
           if (osNumber) query = query.eq('os_number', osNumber);
           if (loja) query = query.eq('store_id', loja);
           const { data, error } = await query.limit(limit);
           if (error) return { erro_local: error.message };
           if (!data || data.length === 0) return { aviso: 'OS não encontrada no banco local.' };
           return data;
        }
      }),
      consulta_saldo_contas: tool({
        description: 'Consulta o fluxo de caixa, transações e saldo no banco LOCAL (ConciliaMec).',
        parameters: z.object({
          loja: z.string().optional().describe('ID da loja'),
          limit: z.number().default(50).describe('Quantidade de registros')
        }),
        execute: async ({ loja, limit }) => {
           let query = supabaseClient.from('transactions').select('*');
           if (loja) query = query.eq('store_id', loja);
           const { data, error } = await query.limit(limit);
           if (error) return { erro_local: error.message };
           return data;
        }
      }),
      consulta_conciliacao_periodo: tool({
        description: 'Consulta resumos de conciliações (fechamento de caixa) no banco LOCAL.',
        parameters: z.object({
          loja: z.string().optional().describe('ID da loja'),
          data_inicio: z.string().optional().describe('Data de início YYYY-MM-DD'),
          limit: z.number().default(30).describe('Quantidade de registros')
        }),
        execute: async ({ loja, data_inicio, limit }) => {
           let query = supabaseClient.from('reconciliations').select('*');
           if (loja) query = query.eq('store_id', loja);
           if (data_inicio) query = query.gte('date', data_inicio);
           const { data, error } = await query.limit(limit);
           if (error) return { erro_local: error.message };
           return data;
        }
      }),
      consulta_contas_em_aberto: tool({
        description: 'Consulta contas a pagar/receber (receivables) que estão em aberto no banco LOCAL.',
        parameters: z.object({
          loja: z.string().optional().describe('ID da loja'),
          limit: z.number().default(30).describe('Quantidade de registros')
        }),
        execute: async ({ loja, limit }) => {
           let query = supabaseClient.from('receivables').select('*').eq('status', 'PENDING');
           if (loja) query = query.eq('store_id', loja);
           const { data, error } = await query.limit(limit);
           if (error) return { erro_local: error.message };
           return data;
        }
      })
    };

    const systemPrompt = `Você é o Agente de I.A. da Oficina Inteligente, o Conector Sistêmico oficial da rede.
O sistema Oficina Inteligente tem múltiplos módulos (OS, Financeiro, Conciliação, Estoque).

REGRAS DE ROTEAMENTO COGNITIVO (MUITO IMPORTANTE):
1. Fonte Primária (Banco Local): O sistema ConciliaMec já importa dados da Oficina diariamente. Para perguntas como "quantas OS temos?", "quanto temos no caixa?", "resumo de conciliações", ou listar contas em aberto, USE SEMPRE AS TOOLS LOCAIS (consulta_resumo_os, consulta_saldo_contas, consulta_conciliacao_periodo, consulta_contas_em_aberto).
2. Fonte Secundária (API Externa Oficina via Bot): SÓ USE a tool \`consulta_os_detalhe_completo\` se:
   - O usuário pedir especificamente detalhes profundos de uma OS (ex: checklist, mecânico executor) E ESSES DADOS NÃO EXISTIREM NO RESUMO LOCAL.
   - O usuário afirmar que a OS não consta no banco local.

TRATAMENTO DE ERROS:
- Se qualquer ferramenta retornar um JSON contendo uma chave \`error\` ou \`erro_local\`, leia a mensagem de erro.
- EXPLIQUE ao usuário de forma educada o que falhou (ex: "A OS não foi encontrada na Oficina" ou "O serviço de conexão externa está offline"). NUNCA devolva apenas um "Ocorreu um erro genérico" ou "non-2xx status code".
- Formate os dados monetários em R$ (BRL). Se a ferramenta retornar dados, apresente os valores ao usuário de forma limpa.`;

    const { text, toolCalls, toolResults } = await generateText({
      model: llmModel,
      system: systemPrompt,
      messages,
      tools: mcpTools,
      maxSteps: 5, // allows the agent to call tool and loop back
    });

    return new Response(
      JSON.stringify({ text, toolCalls, toolResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
