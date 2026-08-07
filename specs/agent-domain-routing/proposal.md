# Proposal: Agent Domain Routing (agent-domain-routing)

## Problema
O agente de IA está utilizando uma Tool genérica e tentando buscar informações no bot headless (`bot.tork.services`) para todos os cenários. Ele ignora que o Supabase local (ConciliaMec) já possui dados sincronizados de OS, financeiro e conciliações. Isso gera lentidão, tráfego desnecessário e erros quando endpoints específicos (como o de detalhe de OS) são chamados indevidamente para resolver perguntas genéricas (como "quanto temos no caixa?").

## Solução Proposta
A Edge Function `ai-chat` deve ser refatorada para possuir **routing cognitivo** (Domain Routing). 
1. **System Prompt**: Ensinaremos a IA a usar o webapp (banco Supabase local) como **fonte primária**. O Oficina Inteligente (`bot.tork.services`) será **fonte secundária/fallback**, chamada apenas quando o dado local for insuficiente (ex: checklist, executor) ou a OS não existir.
2. **Tools Especializadas**: Substituiremos placeholders genéricos por Tools que de fato consultem o banco de dados do Supabase. 
   - Ferramentas para OS (resumo via banco).
   - Ferramentas para Finanças (contas e caixa via banco).
   - Ferramentas para Conciliação (resumo via banco).
3. **Tratamento de Erros da Edge Function**: As Tools devem capturar erros HTTP e do proxy, respondendo com mensagens claras ao Agente (ex: "OS 1044 não encontrada na API externa. Use apenas os dados locais.") em vez de estourar a function com 500 ou non-2xx status code.

## Contratos de Dados
O Agente consultará as seguintes tabelas já existentes no Supabase local:
- `patio_os`: para OS locais.
- `receivables`: para contas a receber/abertas.
- `transactions`: para saldos/caixa.
- `reconciliations`: para status de fechamento.

## API / Interface
Na Edge Function `ai-chat/index.ts`, serão criadas/ajustadas as Tools:
- `consulta_os_detalhe_completo` (já existe, acessa o bot, mas seu try/catch será reforçado para instruir o Agente sobre o erro).
- `consulta_resumo_os` (consulta `patio_os`).
- `consulta_saldo_contas` (consulta `transactions` / caixa).
- `consulta_conciliacao_periodo` (consulta `reconciliations`).
- `consulta_contas_em_aberto` (consulta `receivables`).

## Features Existentes Impactadas
- `supabase/functions/ai-chat/index.ts`: refatoração completa do conjunto de tools.

## Risco Principal
Como a Edge Function é rodada em ambiente Edge, o cliente do Supabase gerado com o Auth Token do usuário possui RLS ativado. O risco principal é a IA tentar fazer consultas complexas que esbarram em políticas de segurança (RLS), retornando arrays vazios silenciosamente. Para mitigar isso, as consultas do Agente devem ser estruturadas de forma robusta e testada (ex: `select('*')` simples com filtros por data, deixando a inteligência do LLM resumir).
