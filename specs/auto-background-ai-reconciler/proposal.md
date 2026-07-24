# Proposal: Acionamento Automático em Background do Motor de IA & Registro de Logs (auto-background-ai-reconciler)

## Problema

- O usuário notou que ao importar os dados ou visualizar a conciliação, as métricas na tela de logs e telemetria da IA em `/agente` permaneciam todas zeradas.
- **Causa Raiz:** A função `generateTripleMatchSuggestions()` em `src/lib/llm-matcher.ts` foi criada e testada para telemetria, mas **nunca estava sendo invocada automaticamente** quando novas OSs ou extratos OFX eram importados ou visualizados na conciliação.

## Solução Proposta

1. **Criação do Hook de Execução Assíncrona `useBackgroundAiReconciler`:**
   - Criar um hook React reutilizável (`src/hooks/useBackgroundAiReconciler.ts`) que monitora os lançamentos não conciliados de uma loja/data.
   - Quando houver itens sem par (`unmatchedOs`, `unmatchedRede` ou `unmatchedOfx`) E a chave de API estiver configurada em `ai_settings`, o hook dispara silenciosamente em background o motor `generateTripleMatchSuggestions()`.

2. **Invocação em Ponto Duplo (Importação & Visualização):**
   - **Na Visualização da Conciliação (`useConciliacaoStoreDetails`):** Disparar o reconciliador em background sempre que a conciliação por loja/data for carregada e contiver itens sem par.
   - **Na Importação de Dados (`useSaveImportedReport`):** Disparar a IA silenciosa após a conclusão de uma importação de lotes.

3. **Auto-Match Silencioso & Gravação de Telemetria:**
   - Para cada sugestão com confiança $\ge 90\%$, o motor insere automaticamente os pares na tabela `conciliation_matches` do Supabase.
   - Grava imutavelmente a chamada na tabela `ai_execution_logs` (com tokens de prompt/completion, custo em USD/BRL, tempo de execução ms, payload JSON de entrada, resposta JSON bruta e os passos de raciocínio).

4. **Atualização Automática dos Logs em `/agente`:**
   - Invalidar as queries do React Query (`['ai_execution_logs']` e `['conciliacao_detalhes']`) após a execução em background para atualizar a Central de Telemetria instantaneamente.

## Contratos de Dados
- Tabela `ai_execution_logs` (gravação de telemetria)
- Tabela `conciliation_matches` (aplicação automática dos matches)

## Features Existentes Impactadas
- `src/lib/llm-matcher.ts` (função de chamada de IA)
- `src/hooks/useConciliacao.ts` (integração do acionamento silencioso)
- `src/routes/agente.tsx` (exibição imediata dos logs de telemetria)

## Risco Principal
Disparos repetidos da API de IA em um loop de render do React.
*Mitigação:* Utilizar controle de estado local (`hasProcessedRef` / hash dos itens não conciliados) para garantir que o motor só chame a IA uma única vez por lote não conciliado.
