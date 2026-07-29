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
        description: 'Consulta os detalhes COMPLETOS de uma OS na API EXTERNA (Oficina). Use SOMENTE se a OS não for encontrada localmente ou se faltar dados profundos (checklist, histórico). Informe loja para direcionar a empresa correta.',
        parameters: z.object({
          osNumber: z.string().describe('O número da OS (ex: 1763)'),
          loja: z.string().optional().describe('Slug ou store_id da loja (ex: jab_jabaquara, st-02)')
        }),
        execute: async ({ osNumber, loja }) => {
          try {
            const lojaParam = loja ? `?loja=${encodeURIComponent(loja)}` : '';
            const url = `${settings?.bot_url}/api/os/detalhe/${osNumber}${lojaParam}`;
            const response = await fetch(url, {
              headers: { 'x-api-key': settings?.bot_api_key || '' }
            });
            if (!response.ok) return { error: `Erro na API externa: HTTP ${response.status}. Use apenas os dados locais.` };
            const json = await response.json();
            await supabaseClient.from('mcp_logs').insert([{
              conversation_id: 'auto-mcp-log',
              action: 'consulta_os_detalhe_completo',
              params: { osNumber, loja },
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
      }),

      // ── NOVAS TOOLS EXTERNAS (Oficina via Bot) ──────────────────────────────
      consulta_contas_pagar_oficina: tool({
        description: 'Busca Contas a Pagar diretamente no Oficina Inteligente (sistema externo via bot). Use quando o usuário perguntar sobre contas a pagar, fornecedores, parcelas ou vencimentos. EXIGE saber a loja — se não souber, pergunte antes.',
        parameters: z.object({
          loja: z.string().describe('Slug ou store_id da loja (ex: jab_jabaquara, brasicar_planalto)'),
          vencimento_inicio: z.string().optional().describe('Data de início do vencimento YYYY-MM-DD'),
          vencimento_fim: z.string().optional().describe('Data de fim do vencimento YYYY-MM-DD')
        }),
        execute: async ({ loja, vencimento_inicio, vencimento_fim }) => {
          try {
            let url = `${settings?.bot_url}/api/contas-pagar?loja=${encodeURIComponent(loja)}`;
            if (vencimento_inicio) url += `&vencimento_inicio=${vencimento_inicio}`;
            if (vencimento_fim) url += `&vencimento_fim=${vencimento_fim}`;
            const response = await fetch(url, { headers: { 'x-api-key': settings?.bot_api_key || '' } });
            if (!response.ok) return { error: `Erro ao buscar contas a pagar: HTTP ${response.status}` };
            return await response.json();
          } catch (e: any) {
            return { error: `Falha de conexão: ${e.message}` };
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
            let url = `${settings?.bot_url}/api/contas-receber?loja=${encodeURIComponent(loja)}`;
            if (vencimento_inicio) url += `&vencimento_inicio=${vencimento_inicio}`;
            if (vencimento_fim) url += `&vencimento_fim=${vencimento_fim}`;
            const response = await fetch(url, { headers: { 'x-api-key': settings?.bot_api_key || '' } });
            if (!response.ok) return { error: `Erro ao buscar contas a receber: HTTP ${response.status}` };
            return await response.json();
          } catch (e: any) {
            return { error: `Falha de conexão: ${e.message}` };
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
            const url = `${settings?.bot_url}/api/agenda?loja=${encodeURIComponent(loja)}&data_inicio=${data_inicio}&data_fim=${data_fim}`;
            const response = await fetch(url, { headers: { 'x-api-key': settings?.bot_api_key || '' } });
            if (!response.ok) return { error: `Erro ao buscar agenda: HTTP ${response.status}` };
            return await response.json();
          } catch (e: any) {
            return { error: `Falha de conexão: ${e.message}` };
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
            const url = `${settings?.bot_url}/api/config/${recurso}?loja=${encodeURIComponent(loja)}`;
            const response = await fetch(url, { headers: { 'x-api-key': settings?.bot_api_key || '' } });
            if (!response.ok) return { error: `Erro ao buscar config ${recurso}: HTTP ${response.status}` };
            return await response.json();
          } catch (e: any) {
            return { error: `Falha de conexão: ${e.message}` };
          }
        }
      })
    };

    const systemPrompt = `Você é o Agente de I.A. do ConciliaMec, o Conector Sistêmico oficial da rede de oficinas.
Você tem acesso a TODOS os módulos do sistema Oficina Inteligente: OS, Financeiro, Conciliação, Agenda e Configurações.

LOJAS DISPONÍVEIS (use o slug ao chamar ferramentas externas):
- Dom Pedro (DP) → dp_dom_pedro [st-01]
- Jabaquara (JAB) → jab_jabaquara [st-02]
- Jorge Beretta (DHJV) → dhjv_jorge_beretta [st-03]
- Kennedy (MP) → mp_kennedy [st-04]
- Maua (MHE) → mhe_maua [3a3dd7ce-...]
- Piraporinha (EMPORIO) → emporio_piraporinha [st-05]
- Planalto (BRASICAR) → brasicar_planalto [st-06]
- Rei do Módulo (MP) → mp_rei_modulo [st-09]
- Rudge Ramos (CAP) → cap_rudge_ramos [st-07]
- Santo André (HD) → hd_santo_andre [st-08]

REGRAS DE ROTEAMENTO COGNITIVO (MUITO IMPORTANTE):

1. IDENTIFICAÇÃO DE LOJA: Antes de usar qualquer ferramenta EXTERNA, identifique a loja da pergunta.
   - Se o usuário mencionar nome de loja ("Jabaquara", "Brasicar", "Kennedy") → mapeie para o slug correto.
   - Se não mencionar loja e a pergunta exigir uma → PERGUNTE: "Para qual loja deseja a informação?"
   - Se uma OS for informada, você pode consultar o banco local primeiro para descobrir a loja.

2. FONTE PRIMÁRIA (Banco Local ConciliaMec): Para listagens e resumos, use SEMPRE os dados locais antes:
   - OS (status, placa, valor) → consulta_resumo_os
   - Conciliações de caixa → consulta_conciliacao_periodo
   - Movimentações / transações → consulta_saldo_contas
   - Contas em aberto (receivables) → consulta_contas_em_aberto

3. FONTE SECUNDÁRIA (API Oficina via Bot Externo): Use somente quando o banco local não tiver o dado:
   - Detalhe profundo de OS (checklist, histórico) → consulta_os_detalhe_completo (pass loja)
   - Contas a pagar do Oficina → consulta_contas_pagar_oficina (EXIGE loja)
   - Contas a receber do Oficina → consulta_contas_receber_oficina (EXIGE loja)
   - Agenda / agendamentos → consulta_agenda_oficina (EXIGE loja + período)
   - Configurações (status OS, formas pagamento) → consulta_config_oficina (EXIGE loja)

4. TRATAMENTO DE ERROS:
   - Se ferramenta retornar {error} ou {erro_local} → explique ao usuário de forma clara e educada.
   - Se retornar {warning, parcial} → avise que os dados podem estar incompletos e mostre o que tem.
   - Se não houver dados → diga claramente que não encontrou, não invente dados.

5. FORMATAÇÃO:
   - Valores monetários: sempre em R$ (BRL) com 2 casas decimais.
   - Datas: formato brasileiro (dd/mm/aaaa).
   - Quando retornar listas, use tabelas ou listas com marcadores para facilitar a leitura.`;

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
