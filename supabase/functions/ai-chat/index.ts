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
        description: 'Consulta os detalhes COMPLETOS de uma Ordem de Serviço específica pelo seu número (Ex: 1763). Retorna cabeçalho, serviços, peças, pagamentos e valores totais.',
        parameters: z.object({
          osNumber: z.string().describe('O número da OS (ex: 1763)')
        }),
        execute: async ({ osNumber }) => {
          try {
            const url = \`\${settings?.bot_url}/api/os/detalhe/\${osNumber}\`;
            const response = await fetch(url, {
              headers: {
                'x-api-key': settings?.bot_api_key || ''
              }
            });
            if (!response.ok) throw new Error(\`Erro HTTP \${response.status}\`);
            const json = await response.json();
            
            // Log action
            await supabaseClient.from('mcp_logs').insert([{
              conversation_id: 'auto-mcp-log',
              action: 'consulta_os_detalhe_completo',
              params: { osNumber },
              result: json
            }]);
            
            return json;
          } catch (e: any) {
            return { error: e.message };
          }
        },
      }),
      consulta_os_movimento_periodo: tool({
        description: 'Consulta as movimentações e resumos de OS de uma loja em um determinado período.',
        parameters: z.object({
          loja: z.string().describe('ID da loja'),
          data_inicio: z.string().describe('Data de início YYYY-MM-DD'),
          data_fim: z.string().describe('Data de fim YYYY-MM-DD'),
          status: z.string().optional().describe('Status opcional da OS')
        }),
        execute: async () => 'Funcionalidade em desenvolvimento no MCP',
      }),
      consulta_contas_pagar_exposicao: tool({
        description: 'Consulta as contas a pagar que estão em exposição (próximas de vencer) ou num período.',
        parameters: z.object({
          loja: z.string().optional().describe('ID da loja'),
          vencimento_inicio: z.string().optional().describe('Data vencimento início'),
          vencimento_fim: z.string().optional().describe('Data vencimento fim')
        }),
        execute: async () => 'Funcionalidade em desenvolvimento no MCP',
      }),
      consulta_fluxo_caixa: tool({
        description: 'Consulta o fluxo de caixa de uma loja em um período.',
        parameters: z.object({
          loja: z.string().describe('ID da loja'),
          periodo: z.string().describe('Período de consulta')
        }),
        execute: async () => 'Funcionalidade em desenvolvimento no MCP',
      }),
      consulta_estoque_baixo: tool({
        description: 'Consulta produtos com estoque abaixo do limite em uma loja.',
        parameters: z.object({
          loja: z.string().describe('ID da loja'),
          limite_quantidade: z.number().describe('Quantidade limite')
        }),
        execute: async () => 'Funcionalidade em desenvolvimento no MCP',
      }),
      consulta_agenda_dia: tool({
        description: 'Consulta a agenda de serviços/agendamentos para um dia específico.',
        parameters: z.object({
          loja: z.string().describe('ID da loja'),
          data: z.string().describe('Data YYYY-MM-DD')
        }),
        execute: async () => 'Funcionalidade em desenvolvimento no MCP',
      })
    };

    const systemPrompt = `Você é o Agente de I.A. da Oficina Inteligente, o Conector Sistêmico oficial da rede.
O sistema Oficina Inteligente tem múltiplos módulos:
- OS (ordem de serviço)
- Financeiro (contas a pagar/receber, caixa, fluxo)
- Estoque/Produtos
- Agenda
- Configurações

IMPORTANTE: Você é um Agente operando na nuvem. NUNCA tente acessar endereços locais (como localhost, 127.0.0.1, portas internas) ou acessar arquivos de sistema do servidor. Todo acesso ao sistema legado Oficina Inteligente é feito estritamente através das Tools fornecidas, que se comunicam via HTTPS com a nossa API oficial de produção (bot.tork.services).

Você NÃO deve assumir que toda pergunta é sobre OS.
Sempre identifique se a intenção é sobre OS, financeiro, estoque, agenda ou config antes de escolher a ferramenta.
Quando o usuário pedir qualquer coisa sobre uma OS específica (ex: "Detalhes da OS 1763", "me mostra essa OS completa"), extraia o número e chame \`consulta_os_detalhe_completo\`.
Se a ferramenta retornar dados, apresente o quadro completo: loja, cliente, veículo, responsável, status, valor total, quanto já foi pago, percentual e a lista resumida de itens. Não responda com texto genérico se a ferramenta retornar dados.
SEMPRE que for necessário buscar dados do sistema, USE as tools disponíveis em vez de adivinhar. Formate os dados monetários em R$ (BRL).`;

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
