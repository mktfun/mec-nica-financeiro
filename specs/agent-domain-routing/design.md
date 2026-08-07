# Design: Agent Domain Routing (agent-domain-routing)

## Arquitetura Técnica
A Edge Function `ai-chat` atuará como um "Router Cognitivo", instruído através do seu `system prompt` a utilizar a Tool apropriada, priorizando o `supabaseClient` já instanciado no Edge runtime, com as credenciais (via `Authorization` header) repassadas do client para ler o banco local.

```text
Agente VLM
  |--> Decide qual Tool usar (Regra: Banco local > MCP Externo)
  |
  |--> Tool: consulta_resumo_os -> executa `supabase.from('patio_os').select(...)`
  |--> Tool: consulta_saldo_contas -> executa `supabase.from('transactions').select(...)`
  |--> Tool: consulta_conciliacao_periodo -> executa `supabase.from('reconciliations').select(...)`
  |--> Tool: consulta_contas_em_aberto -> executa `supabase.from('receivables').select(...)`
  |
  |--> Tool: consulta_os_detalhe_completo (Fallback) -> Chama o bot.tork.services via fetch().
```

## Interfaces TypeScript
Na Edge Function, cada ferramenta usará um `zod` object com parâmetros simplificados para a IA preencher.
Por exemplo, para o banco local:
```typescript
consulta_resumo_os: tool({
  description: 'Consulta o banco de dados LOCAL para listar Ordens de Serviço (OS). Use esta ferramenta ANTES de chamar APIs externas. Útil para verificar status rápido, placa, e valor de OS.',
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
     if (!data || data.length === 0) return { aviso: 'OS nÁo encontrada no banco local.' };
     return data;
  }
})
```

E no System Prompt:
```text
Para qualquer pergunta sobre o sistema:
1. Fonte Primária: Consulte SEMPRE primeiro o banco do ConciliaMec usando as tools locais (consulta_resumo_os, consulta_saldo_contas, consulta_conciliacao_periodo, consulta_contas_em_aberto).
2. Fonte Secundária (Oficina Inteligente via Bot): Só use o conector (consulta_os_detalhe_completo) se:
   - a OS nÁo existir no banco local;
   - ou faltar dados críticos como custo, executor, checklist, histórico de ediçÁo.
3. Tratamento de Erros: Se as ferramentas retornarem mensagem de erro ou falha HTTP, explique ao usuário o que falhou sem devolver uma mensagem genérica de erro (Ex: "A conexÁo com a Oficina externa falhou: {mensagem de erro}").
```

## Componentes / Hooks / Funções
- **`supabase/functions/ai-chat/index.ts`**: AlteraçÁo do System Prompt e inclusÁo de novas definitions de Tools para substituir os placeholders. As requisições diretas de ferramentas (que nÁo invocam MCP externo) farÁo queries no objeto `supabaseClient` instanciado com o JWT do usuário logado, herdando o RLS perfeitamente.

## Infra / Deploy
- Nenhuma alteraçÁo topológica na VPS ou Cloudflare.
- O deploy será apenas para a Edge Function via Supabase CLI.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1: Consulta Financeira**: Pergunta "quantas OS temos?" ou "quanto temos em contas?". A IA deve invocar as ferramentas `consulta_resumo_os` ou `consulta_saldo_contas`, nÁo recebendo 404 de MCP, e ler o JSON retornado do Supabase.
- **Cenário 2: Consulta Fallback OS**: Pergunta "detalhes completos do checklist da OS 1044". A IA primeiro checa `consulta_resumo_os`. Nota que faltam detalhes do checklist. EntÁo decide invocar `consulta_os_detalhe_completo`. O `bot.tork.services` é acionado de forma isolada.
- **Cenário 3: Erro Explicado**: A API remota cai. A Tool `consulta_os_detalhe_completo` sofre Catch. O JSON retornado para a IA é `{ error: "Serviço indisponível" }`. A IA formula uma frase pedindo desculpas no idioma do usuário, ao invés de cuspir um `non-2xx status code` nativo da UI.
