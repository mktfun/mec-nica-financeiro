# Proposal: Correção de Lógica e Mapeamento de Lojas da IA (chat-logic-fix)

## Problema
O agente de IA está apresentando respostas erradas ou lentas ao consultar o sistema Oficina Inteligente (via MCP):
1. Falha ao identificar as lojas quando o usuário usa o prefixo "Rei do Óleo" (ex: Rei do Óleo Mauá).
2. Retorna contas já pagas (status "PAG") quando o usuário solicita "contas a pagar", poluindo o chat com centenas de linhas inúteis.
3. Não faz fallback automático para a API externa quando não encontra uma OS no banco local (exige que o usuário mande procurar novamente).

## Solução Proposta
Refinar o **System Prompt** e as **Descriptions das Tools** do MCP na Edge Function `ai-chat`:
1. **Mapeamento Explícito "Rei do Óleo"**: Instruir o LLM que a maioria das lojas (Dom Pedro, Jabaquara, etc.) são franquias "Rei do Óleo" e podem ser chamadas assim pelo usuário.
2. **Filtro de Contas a Pagar**: Alterar a description da tool `consulta_contas_pagar_oficina` para forçar o LLM a filtrar contas em aberto e ignorar as contas 'PAG' a não ser que explicitamente requisitado.
3. **Fallback Automático**: Adicionar regra de metacognição instruindo o LLM a usar `consulta_os_detalhe_completo` imediatamente, sem pedir permissão, se `consulta_resumo_os` (local) não encontrar os dados.

## Contratos de Dados
- Modificações estritas nos prompts TypeScript do Edge Function, sem alterar tabelas locais.

## API / Interface
- `supabase/functions/ai-chat/index.ts`: Atualização da string `SYSTEM_PROMPT`.
- `supabase/functions/ai-chat/tools-oficina.ts`: Atualização da descrição da tool `consulta_contas_pagar_oficina`.

## Features Existentes Impactadas
- Edge Function `ai-chat` (cérebro do agente).

## Risco Principal
Como se trata de Prompt Engineering, o LLM pode ficar restritivo demais ao listar contas. Para mitigar, a instrução deve ser clara: "Filtre por padrão, mas mostre se o usuário pedir o histórico de contas pagas."
