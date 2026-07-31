# Proposal: Correção do Payload da IA de Conciliação Silenciosa (ai-reconciliation-payload-fix)

## Problema
No DevTools Inspector e nos logs de telemetria, o motor de inteligência artificial (`generateTripleMatchSuggestions`) registrava chamadas com resultado `{"matches": []}`.
Ao inspecionar o `Input JSON` enviado para a LLM, identificamos:
1. `ofx: []` e `rede: []` eram enviados como arrays **VAZIOS**.
2. Os objetos de OS em `os: [...]` continham `total_value: 0`, `pix_value: 0`, `credit_value: 0` e `client_name: "Cliente"`.

**Causa Raiz:**
1. Em `conciliacao.index.tsx`, a hook `useBackgroundAiReconciler` era invocada com `(firstStoreId, selectedDate, detalhes, [], [])`, onde `detalhes` é um resumo de lojas (não OSs) e os arrays de Rede e OFX eram passados como `[]` estáticos.
2. Em `conciliacao.$lojaId.tsx`, a hook era chamada com `reconData?.pixVsOfx?.osPix`, cujos objetos envelopam os dados em `raw_os` e possuem o campo de valor como `amount`. O parser em `llm-matcher.ts` não desempacotava `raw_os` nem lia `amount`, resultando em todos os valores zerados (`0.00`).
3. Com `total_value: 0`, `pix_value: 0`, `ofx: []` e `rede: []`, a LLM recebia um payload sem nenhuma informação útil e respondia corretamente com `matches: []`.

## Solução Proposta
1. **Normalização do Parser de Payload (`src/lib/llm-matcher.ts`):**
   - Atualizar a montagem do `payload.os` em `generateTripleMatchSuggestions` para ler com resiliência:
     - `total_value`: `o.total_value || o.amount || o.raw_os?.total_value || o.os_data?.total_value || 0`
     - `pix_value`: `o.pix_value || o.pix_transfer_value || o.raw_os?.pix_transfer_value || 0`
     - `credit_value`: `o.credit_value || o.credit_debit_value || o.raw_os?.credit_debit_value || 0`
     - `client_name`: `o.client_name || o.raw_os?.client_name || o.customer_name || 'Cliente'`
     - `opened_at`: `o.opened_at || o.created_at || o.raw_os?.opened_at || o.raw_os?.created_at`
2. **Correção do Hook de Background (`src/hooks/useBackgroundAiReconciler.ts`):**
   - Permitir que a hook `useBackgroundAiReconciler` consulte diretamente do Supabase os lançamentos pendentes reais da loja no dia quando arrays não forem fornecidos ou estiverem incompletos:
     - OSs pendentes (`status != 'ENTROU'`)
     - Transações Rede do dia sem match
     - Lançamentos OFX do dia sem match
3. **Ajuste na Rota Global (`src/routes/conciliacao.index.tsx`):**
   - Remover a chamada fake com arrays vazios `([], [])` ou passá-la de forma limpa por loja com os dados reais desempacotados.
4. **Aprimoramento do System Prompt (`src/lib/llm-matcher.ts`):**
   - Reforçar regras de pareamento direto de PIX (valor e nome de cliente similares) e pareamento de depósitos de adquirente por tolerância de MDR/taxas.

## Contratos de Dados
Nenhuma tabela nova criada. Utiliza schemas existentes:
- `patio_os`: `os_number`, `client_name`, `total_value`, `paid_value`, `pix_transfer_value`, `credit_debit_value`, `status`
- `transactions`: `id`, `store_id`, `target_date`, `source`, `amount`, `title`, `subtitle`, `occurred_at`
- `conciliation_matches`: `store_id`, `target_date`, `match_type`, `system_os_number`, `confidence_score`, `reasoning`

## API / Interface
- `generateTripleMatchSuggestions(settings, unmatchedOs, unmatchedRede, unmatchedOfx, storeId)`: Aceita formatos diretos e desempacotados.
- `useBackgroundAiReconciler(storeId, targetDate)`: Auto-carrega pendências do Supabase se não fornecidas via props.

## Features Existentes Impactadas
- `src/lib/llm-matcher.ts`: Montagem do JSON enviado para Gemini/OpenAI/Claude.
- `src/hooks/useBackgroundAiReconciler.ts`: Gatilho silencioso de IA.
- `src/routes/conciliacao.index.tsx` e `src/routes/conciliacao.$lojaId.tsx`: Invocação do reconciliador.

## Risco Principal
Overhead de requisições à LLM caso a trava de hash não funcione.
*Mitigação:* Manter `processedHashRef` por `storeId + targetDate + pendências` para evitar chamadas duplicadas no mesmo ciclo.
