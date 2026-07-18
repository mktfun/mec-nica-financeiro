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
            body: { action, params }
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
      consulta_os_semana: tool({
        description: 'Consulta as Ordens de Serviço (OS) finalizadas na semana.',
        parameters: z.object({
          limit: z.number().optional().describe('Limite de resultados')
        }),
        execute: async ({ limit }) => {
          return invokeMCP('consulta_os_semana', { limit })
        },
      }),
      consulta_cmv_loja: tool({
        description: 'Consulta o CMV (Custo de Mercadoria Vendida) por loja.',
        parameters: z.object({
          lojaId: z.string().optional().describe('ID da loja')
        }),
        execute: async ({ lojaId }) => {
          return invokeMCP('consulta_cmv_loja', { lojaId })
        },
      }),
      consulta_contas_pagar: tool({
        description: 'Consulta as contas a pagar que estão em exposição (próximas de vencer).',
        parameters: z.object({}),
        execute: async () => {
          return invokeMCP('consulta_contas_pagar_exposicao', {})
        },
      })
    };

    const systemPrompt = `Você é o Agente de I.A. da Oficina Inteligente.
Sua missão é ajudar os mecânicos e gestores a analisar a saúde financeira e operacional da oficina.
Você tem acesso ao motor MCP que extrai dados em tempo real.
SEMPRE que for necessário buscar dados de sistema, USE as tools disponíveis em vez de adivinhar.
Seja conciso, direto, e formate os dados monetários em R$ (BRL).`;

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
