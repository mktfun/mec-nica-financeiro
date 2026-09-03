# Spec Plan: Workspace Conversacional de Conciliação Financeira com Arquitetura Hydra Especializada (360)

## Tasks

- [x] [BACKEND] Criar migration `20260903000026_reconciliation_conversations_and_tools.sql` estendendo `conversations` e `messages` com `target_date`, `status` e RLS
- [x] [BACKEND] Implementar RPCs `upsert_daily_revenue_adjustment` e wrapper `resolve_orphan_transaction` com recálculo instantâneo de Delta no PostgreSQL
- [x] [BACKEND] Criar módulo `tools-concilia.ts` na Edge Function `ai-chat` com o System Prompt estruturado em XML dos 6 Braços da Hydra
- [x] [FRONTEND] Implementar componente `InlineDecisionCard.tsx` com Dark UI corporativa Zinc-950, sem emojis, com impacto no Delta e atalhos de teclado (`1`, `2`, `Enter`, `Esc`)
- [x] [FRONTEND] Adaptar `src/components/chat/MessageList.tsx` para suporte a `ToolExecutionRecord` sóbrio e renderização de `InlineDecisionCard` nos balões esquerdos
- [x] [FRONTEND] Criar hook `useReconciliationChat.ts` orquestrando os 6 braços da Hydra, streaming do chat e sincronização com React Query dos 5 Pilares
- [x] [FRONTEND] Criar componente `ReconciliationChatWorkspace.tsx` com Scoreboard superior dos 5 Pilares, Live Delta Tracker, Semáforo das 10 Filiais e `PromptInput` integrado
- [x] [FRONTEND] Adaptar rota `src/routes/conciliacao.index.tsx` para alternância suave entre `Painel Clássico` e `Workspace Conversacional` com persistência em `localStorage`
- [x] [TEST] Executar Cenário 1: Diagnóstico de PIX órfão na Loja Santo André, apresentação de proposta no `InlineDecisionCard` e confirmação via teclado
- [x] [TEST] Executar Cenário 2: Regularização de tarifas e equalização contábil até `Δ = R$ 0,00`, liberando a homologação final do fechamento
