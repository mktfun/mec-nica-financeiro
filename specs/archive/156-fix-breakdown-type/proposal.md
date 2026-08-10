# Proposal: Fix Breakdown Types and Regressions (156)

## Problema
Durante a implementação da lógica contábil de Pátio Cumulativo na RPC `get_conciliation_breakdown` (Spec 155), o retorno JSON foi "agrupado" em objetos (`ofx_in`, `na_loja`, etc.) para melhorar a hierarquia estrutural. Porém, o frontend (`BreakdownModal.tsx`) esperava o formato antigo _flat_ (com Arrays diretas na raiz, ex: `data.ofx_in.map`). Isso causou a quebra da tela "Raio X" (Modal de Detalhamento) com o erro `TypeError: ofx_in.map is not a function`.

## Solução Proposta
Ajustar o mapeamento no frontend em `src/components/conciliacao/BreakdownModal.tsx` e nas interfaces em `src/hooks/useConciliationBreakdown.ts` para que passem a aceitar as chaves agrupadas (`data.ofx_in.transactions` em vez de `data.ofx_in`, e `data.ofx_in.total` em vez de `data.ofx_in_total`). Alternativamente, restaurar o retorno da RPC para o formato _flat_ antigo na nuvem.
Como a tipagem estruturada (Nested Objects) provou ser mais coesa para o backend agrupar metadados, a escolha técnica mais sólida é **atualizar o frontend (React) para consumir a nova tipagem**.

## Contratos de Dados
- RPC `get_conciliation_breakdown` mantém seu contrato atual (Nested JSON).
- Interfaces TypeScript (`ConciliationBreakdownData`) receberão novos subtipos:
  - `ofx_in: { total: number, transactions: OfxTransactionDetail[] }`
  - `na_loja: { total: number, current_month: number, previous_month: number, transactions: any[] }`

## API / Interface
- `src/hooks/useConciliationBreakdown.ts`: Tipagens `ConciliationBreakdownData`.
- `src/components/conciliacao/BreakdownModal.tsx`: Atualização dos mapeamentos JSX (`.map` chains).

## Features Existentes Impactadas
- Tela Modal de Raio-X de Conciliação.

## Risco Principal
- **Probabilidade:** Baixa.
- **Impacto:** Reversível.
- **Mitigação:** Tipar estritamente o modelo de resposta para detectar mismatch de TypeScript antes do build e rodar VLM Visual QA para testar a renderização da tabela na UI.
