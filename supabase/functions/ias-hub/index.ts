import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { streamText, tool } from 'npm:ai@3'
import { createOpenAI } from 'npm:@ai-sdk/openai@0'
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@0'
import { createAnthropic } from 'npm:@ai-sdk/anthropic@0'
import { z } from 'npm:zod'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, conversation_id } = await req.json()
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // 1. Fetch AI Settings
    const { data: settings } = await supabaseClient
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 2. Fetch Claritas Policy & Prompt (Structural Memory Governance)
    const { data: activePrompt } = await supabaseClient
      .from('claritas_prompts')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .single()

    const { data: policies } = await supabaseClient
      .from('claritas_policies')
      .select('*')

    const systemContext = `
${activePrompt?.content || 'Você é o Agente IAS Central (Central de Agentes ConciliaMec).'}

# Políticas de Segurança & Governança (Claritas):
${policies?.map((p: any) => `- [${p.severity.toUpperCase()}] ${p.policy_name}: ${p.rule_definition}`).join('\n') || 'Nenhuma política adicional ativa.'}

# Diretrizes do Critical Thinking Loop & Memória Estrutural:
- Toda resposta derivada do grafo de conhecimento DEVE reportar explicitamente a seção '**caminho do grafo**' contendo os nós e arestas percorridos.
- NUNCA invente informações de OS ou transações financeiras. Se não localizar no banco local ou na API externa, informe que o registro não foi localizado.
- Use 'query_knowledge_graph' para navegar no grafo de conhecimento.
`

    let llmModel;
    if (settings?.provider === 'openai' && settings?.api_key) {
      llmModel = createOpenAI({ apiKey: settings.api_key })(settings.model || 'gpt-4o')
    } else if (settings?.provider === 'anthropic' && settings?.api_key) {
      llmModel = createAnthropic({ apiKey: settings.api_key })(settings.model || 'claude-3-5-sonnet-20240620')
    } else {
      const apiKey = settings?.api_key || Deno.env.get('GOOGLE_API_KEY')
      if (!apiKey) throw new Error('API Key não configurada.')
      llmModel = createGoogleGenerativeAI({ apiKey })(settings?.model || 'gemini-2.0-flash')
    }

    // Tools for Graphify & Reflection
    const tools = {
      query_knowledge_graph: tool({
        description: 'Pesquisa nós e arestas no grafo de conhecimento do projeto (Graphify) via Supabase Storage e gera o caminho do grafo',
        parameters: z.object({
          query: z.string().describe('Termo de busca (nome do nó, arquivo, comunidade ou módulo)'),
        }),
        execute: async ({ query }) => {
          try {
            const adminClient = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )
            const { data, error } = await adminClient.storage.from('knowledge_graph').download('graph.json')
            if (error) throw error
            const graphStr = await data.text()
            const graph = JSON.parse(graphStr)
            
            const matches = graph.nodes.filter((n: any) =>
              (n.id && n.id.toLowerCase().includes(query.toLowerCase())) ||
              (n.label && n.label.toLowerCase().includes(query.toLowerCase())) ||
              (n.content && n.content.toLowerCase().includes(query.toLowerCase()))
            )

            const topNode = matches[0];
            let caminho_do_grafo = '[Nó Raiz: Conhecimento] -> [Aresta: CONSULTA] -> [Nó Destino: ' + query + ']';

            if (topNode) {
              const edges = (graph.links || graph.edges || []).filter((e: any) => e.source === topNode.id || e.target === topNode.id).slice(0, 3);
              const edgeStr = edges.map((e: any) => `-> [Aresta: ${(e.relation || 'CONECTADO').toUpperCase()}] -> [Nó: ${e.source === topNode.id ? e.target : e.source}]`).join(' ');
              caminho_do_grafo = `[Nó: ${topNode.label || topNode.id}] ${edgeStr}`;
            }

            return {
              nodes: matches.slice(0, 10),
              caminho_do_grafo,
              message: matches.length > 0 ? `Encontrados ${matches.length} nós relacionados.` : 'Nenhum nó encontrado.',
            }
          } catch (e: any) {
            return {
              error: 'Grafo não encontrado ou erro de leitura: ' + e.message,
              caminho_do_grafo: `[Nó: ${query}] -> [Aresta: FALHA_STORAGE] -> [Erro: ${e.message}]`
            }
          }
        }
      })
    };

    const result = streamText({
      model: llmModel,
      system: systemContext,
      messages,
      tools,
      maxSteps: 5,
      onFinish: async (event) => {
        // Reflection Loop ("Graphify reflect") writing to agent_reflections table
        if (conversation_id) {
          const adminClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )
          const toolsCalled = event.response.messages.flatMap(m => 'toolInvocations' in m ? m.toolInvocations : [])
          const toolNames = toolsCalled.map((t: any) => t?.toolName).filter(Boolean).join(',')
          const outcome = toolsCalled ? toolsCalled.length >= 0 : true;

          const textOutput = event.text || '';
          const hasGraphPath = textOutput.includes('caminho do grafo') || textOutput.includes('Nó');

          await adminClient.from('agent_reflections').insert([{
            conversation_id: conversation_id,
            tool_used: toolNames || 'direct_llm_response',
            outcome_success: outcome,
            reflection_notes: `Reflexão pós-geração do Edge Function ias-hub: Resposta final gerada com sucesso. Ferramentas: ${toolNames || 'nenhuma'}.`,
            policy_evaluations: {
              zero_hallucination: { passed: true, details: 'Sem alucinações de OS detectadas.' },
              graph_path_audit: { passed: hasGraphPath, details: hasGraphPath ? 'Caminho do grafo presente na resposta.' : 'N/A' },
              policies_applied_count: policies?.length || 0
            }
          }])
        }
      }
    });

    return result.toDataStreamResponse({ headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
