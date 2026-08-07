# Proposal: Acionamento Automático em Background do Motor de IA & Registro de Logs (auto-background-ai-reconciler)

## Problema

- O usuário notou que ao importar os dados ou visualizar a conciliaçÁo, as métricas na tela de logs e telemetria da IA em `/agente` permaneciam todas zeradas.
- **Causa Raiz:** A funçÁo `generateTripleMatchSuggestions()` em `src/lib/llm-matcher.ts` foi criada e testada para telemetria, mas **nunca estava sendo invocada automaticamente** quando novas OSs ou extratos OFX eram importados ou visualizados na conciliaçÁo.

## SoluçÁo Proposta

1. **CriaçÁo do Hook de ExecuçÁo Assíncrona `useBackgroundAiReconciler`:**
   - Criar um hook React reutilizável (`src/hooks/useBackgroundAiReconciler.ts`) que monitora os lançamentos nÁo conciliados de uma loja/data.
   - Quando houver itens sem par (`unmatchedOs`, `unmatchedRede` ou `unmatchedOfx`) E a chave de API estiver configurada em `ai_settings`, o hook dispara silenciosamente em background o motor `generateTripleMatchSuggestions()`.

2. **InvocaçÁo em Ponto Duplo (ImportaçÁo & VisualizaçÁo):**
   - **Na VisualizaçÁo da ConciliaçÁo (`useConciliacaoStoreDetails`):** Disparar o reconciliador em background sempre que a conciliaçÁo por loja/data for carregada e contiver itens sem par.
   - **Na ImportaçÁo de Dados (`useSaveImportedReport`):** Disparar a IA silenciosa após a conclusÁo de uma importaçÁo de lotes.

3. **Auto-Match Silencioso & GravaçÁo de Telemetria:**
   - Para cada sugestÁo com confiança $\ge 90\%$, o motor insere automaticamente os pares na tabela `conciliation_matches` do Supabase.
   - Grava imutavelmente a chamada na tabela `ai_execution_logs` (com tokens de prompt/completion, custo em USD/BRL, tempo de execuçÁo ms, payload JSON de entrada, resposta JSON bruta e os passos de raciocínio).

4. **AtualizaçÁo Automática dos Logs em `/agente`:**
   - Invalidar as queries do React Query (`['ai_execution_logs']` e `['conciliacao_detalhes']`) após a execuçÁo em background para atualizar a Central de Telemetria instantaneamente.

## Contratos de Dados
- Tabela `ai_execution_logs` (gravaçÁo de telemetria)
- Tabela `conciliation_matches` (aplicaçÁo automática dos matches)

## Features Existentes Impactadas
- `src/lib/llm-matcher.ts` (funçÁo de chamada de IA)
- `src/hooks/useConciliacao.ts` (integraçÁo do acionamento silencioso)
- `src/routes/agente.tsx` (exibiçÁo imediata dos logs de telemetria)

## Risco Principal
Disparos repetidos da API de IA em um loop de render do React.
*MitigaçÁo:* Utilizar controle de estado local (`hasProcessedRef` / hash dos itens nÁo conciliados) para garantir que o motor só chame a IA uma única vez por lote nÁo conciliado.
