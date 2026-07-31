import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'
import { streamText } from 'npm:ai@3'
import { createOpenAI } from 'npm:@ai-sdk/openai@0'
import { createGoogleGenerativeAI } from 'npm:@ai-sdk/google@0'
import { createAnthropic } from 'npm:@ai-sdk/anthropic@0'
import { toolsLocal } from './tools-local.ts'
import { toolsOficina } from './tools-oficina.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ========== SYSTEM PROMPT HÍBRIDO ==========
const SYSTEM_PROMPT = `<regra_ouro_autonomia priority="MÁXIMA">
AUTONOMIA DE DADOS: Se o usuário solicitar informações detalhadas de uma OS, pagamentos ou contas a receber e você não tiver os parâmetros necessários (como o ID da loja), você DEVE PERGUNTAR antes de agir cegamente ou usar o banco local para listar e depois perguntar a loja.
</regra_ouro_autonomia>

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

DICA DE MAPEAMENTO: Os clientes referenciam as lojas da franquia "Rei do Óleo". Se pedirem "Rei do Óleo Mauá", use o slug da loja "Maua" (mhe_maua). NÃO tente chutar "Rei do Módulo".
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
      // Default to Google Generative AI
      const apiKey = settings?.api_key || Deno.env.get('GOOGLE_API_KEY')
      if (!apiKey) throw new Error('API Key não configurada para o provedor selecionado.')
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
      messages,
      tools: mcpTools,
      maxSteps: 5,
    });

    return result.toDataStreamResponse({ headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
