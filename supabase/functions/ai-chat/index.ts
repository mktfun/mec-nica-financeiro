import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { streamText, stepCountIs, generateText } from 'npm:ai@latest'
import { createOpenAI } from 'npm:@ai-sdk/openai@latest'
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@latest'
import { createAnthropic } from 'npm:@ai-sdk/anthropic@latest'
import { toolsLocal } from './tools-local.ts'
import { toolsOficina } from './tools-oficina.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ========== SYSTEM PROMPT HÍBRIDO ==========
const SYSTEM_PROMPT = `<regra_ouro_autonomia priority="MÁXIMA">
AUTONOMIA DE DADOS: Se o usuário solicitar informações detalhadas de uma OS, pagamentos ou contas a receber, você DEVE consultar os registros locais primeiro. Se encontrar os dados no banco local, apresente a resposta de forma clara, completa e objetiva sem aguardar serviços externos.
</regra_ouro_autonomia>

<regra_proibição_alucinação_origem priority="EXTREMA">
JAMAIS DIGA QUE GEROU RESPOSTAS FICTÍCIAS, FALSAS OU DE TESTE.
Se o usuário perguntar a origem de uma informação ou de onde você puxou os dados, explique de forma profissional e confiante que a consulta foi realizada em tempo real no banco de dados local do ConciliaMec (tabela patio_os) ou na API da Oficina Inteligente.
Exemplo de resposta de origem: "Essa informação foi obtida diretamente através da consulta aos registros do banco de dados local do ConciliaMec (tabela patio_os) referente à OS #22551 da loja Rei do Óleo Mauá."
</regra_proibição_alucinação_origem>

<identidade_b2b priority="MÁXIMA">
IDENTIDADE: Você é o **Oficina GPT**, Agente de I.A. do ConciliaMec e Conector Sistêmico oficial da rede de oficinas.
Sua autoridade vem do acesso a TODOS os módulos do sistema Oficina Inteligente: OS, Financeiro, Conciliação, Agenda e Configurações.
LOJAS DISPONÍVEIS (use o slug ao chamar ferramentas):
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
- Master (MPMaster) → mp_master [st-10]

DICA DE MAPEAMENTO: Os clientes referenciam as lojas da franquia "Rei do Óleo". Se pedirem "Rei do Óleo Mauá", use o slug da loja "Maua" (mhe_maua).
</identidade_b2b>

<metacognicao_raciocinio priority="CRÍTICA">
VOCÊ PENSA ANTES DE AGIR.
Para TODA interação complexa, você pode raciocinar para escolher a melhor ferramenta.
1. **Identificação da Intenção**: O que o usuário quer?
2. **Plano de Execução**: Qual ferramenta resolve isso (Local ou Oficina)?
3. **Checagem de Segurança**: Tenho a loja e parâmetros corretos?
</metacognicao_raciocinio>

<modos_operacao priority="MÁXIMA">
VOCÊ OPERA EM 2 FONTES DISTINTAS:
1. **FONTE PRIMÁRIA (Banco Local ConciliaMec)**: Para listagens, resumos, dashboards, conciliações e saldos. Sempre tente usar ferramentas "consulta_resumo_os", "consulta_saldo_contas", etc.
2. **FONTE SECUNDÁRIA (API Oficina externa)**: Para detalhes profundos e atualizados em tempo real (checklists de OS, contas a pagar do dia). Ferramentas "consulta_os_detalhe_completo", "consulta_contas_pagar_oficina", etc.
Se a externa falhar, não congele, explique que a API externa oscilou e mostre os dados locais.
</modos_operacao>

<padroes_resposta priority="ALTA">
- Valores monetários: sempre em R$ (BRL) com 2 casas decimais.
- Datas: formato brasileiro (dd/mm/aaaa).
- Tabelas: Use formatação markdown elegante sempre que listar dados.
</padroes_resposta>`;

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, conversation_id } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Invalid prompt: prompt or messages must be defined')
    }

    // Mapear UIMessages (v4 parts ou content) para CoreMessages ({ role, content })
    const formattedMessages = messages.map((m: any) => {
      let content = '';
      if (typeof m.content === 'string' && m.content) {
        content = m.content;
      } else if (Array.isArray(m.parts)) {
        content = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
      }

      // Se a mensagem do assistente não tinha partes de texto direto, verificar ferramentas executadas
      if (!content.trim() && m.role === 'assistant' && Array.isArray(m.toolInvocations)) {
        const toolNames = m.toolInvocations.map((t: any) => t.toolName).join(', ');
        if (toolNames) {
          content = `[Consulta realizada via ferramenta: ${toolNames}]`;
        }
      }

      return { role: m.role || 'user', content };
    }).filter((m: any) => m.content.trim().length > 0);

    if (formattedMessages.length === 0) {
      throw new Error('Invalid prompt: prompt or messages must be defined')
    }
    
    // Auth Check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Fetch AI Settings via admin client (bypassa RLS, user já foi validado acima)
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('ai_settings')
      .select('provider, model, api_key, bot_url, bot_api_key')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (settingsError) console.error('[ai-chat] settings fetch error:', settingsError.message)

    let llmModel;
    
    if (settings?.provider === 'openai' && settings?.api_key) {
      const openai = createOpenAI({ apiKey: settings.api_key })
      llmModel = openai(settings.model || 'gpt-4o')
    } else if (settings?.provider === 'anthropic' && settings?.api_key) {
      const anthropic = createAnthropic({ apiKey: settings.api_key })
      llmModel = anthropic(settings.model || 'claude-3-5-sonnet-20240620')
    } else {
      // Default to Google Generative AI
      const apiKey = settings?.api_key || Deno.env.get('GOOGLE_API_KEY')
      if (!apiKey) throw new Error(`API Key não configurada. Configure em Agente IA > Configurações. (settings: ${JSON.stringify({ provider: settings?.provider, hasKey: !!settings?.api_key })})`)
      const google = createGoogleGenerativeAI({ apiKey })
      llmModel = google(settings?.model || 'gemini-2.0-flash')
    }

    const mcpTools = {
      ...toolsLocal(supabaseClient),
      ...toolsOficina(supabaseClient, settings, user.id)
    };

    const result = streamText({
      model: llmModel,
      system: SYSTEM_PROMPT,
      messages: formattedMessages,
      tools: mcpTools,
      stopWhen: stepCountIs(5),
      onFinish: async ({ text, usage }) => {
        if (conversation_id && text && text.trim()) {
          try {
            await supabaseAdmin.from('messages').insert([{
              conversation_id,
              role: 'assistant',
              content: text.trim()
            }]);

            if (usage) {
              const providerStr = settings?.provider || 'google';
              const modelStr = settings?.model || 'gemini-2.0-flash';
              let costInBrl = 0;
              
              // Taxas aproximadas USD para BRL (1 USD = 5.50 BRL)
              if (providerStr === 'openai') {
                costInBrl = ((usage.promptTokens * 5) / 1000000 + (usage.completionTokens * 15) / 1000000) * 5.5;
              } else if (providerStr === 'anthropic') {
                costInBrl = ((usage.promptTokens * 3) / 1000000 + (usage.completionTokens * 15) / 1000000) * 5.5;
              } else {
                costInBrl = ((usage.promptTokens * 0.075) / 1000000 + (usage.completionTokens * 0.3) / 1000000) * 5.5;
              }
              
              await supabaseAdmin.from('ai_execution_logs').insert([{
                provider: 'agent',
                model: modelStr,
                prompt_tokens: usage.promptTokens,
                completion_tokens: usage.completionTokens,
                total_tokens: usage.promptTokens + usage.completionTokens,
                estimated_cost: costInBrl
              }]);
            }
          } catch (e) {
            console.error('Error saving assistant message on backend:', e);
          }
        }
      }
    });

    // Auto-titulação: Se for a primeira mensagem, gerar um título em background e atualizar
    if (formattedMessages.length === 1 && conversation_id) {
      const firstMessageText = formattedMessages[0].content;
      
      // Promessa não bloqueante (fire-and-forget)
      generateText({
        model: llmModel,
        system: "Você é um assistente criador de títulos. Resuma a mensagem do usuário em um título curto de no máximo 4 palavras. Apenas retorne as palavras, sem aspas, sem pontuação final.",
        prompt: firstMessageText,
      }).then(async ({ text: titleText }) => {
        if (titleText && titleText.trim()) {
          try {
            await supabaseAdmin.from('conversations')
              .update({ title: titleText.trim() })
              .eq('id', conversation_id)
              // Only update if it's still 'Nova Conversa' or empty (handled by frontend typically, but good to just update)
          } catch (e) {
            console.error('Error updating conversation title:', e);
          }
        }
      }).catch(err => console.error("Error generating title:", err));
    }

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
