# Plano de Implementação: Spec 235

## Fase 1: Atualização da RPC no PostgreSQL
1. Atualizar a RPC `get_daily_reconciliation_summary` para calcular e retornar `saldo_banco_ofx`, `nao_entrou_valor`, `saldo_banco_total` e `status_compensacao` no objeto de cada loja.
2. Testar a RPC para a data `2026-08-17`.

## Fase 2: Tipagem e Hooks no Frontend
1. Atualizar `src/hooks/useBackendConciliacao.ts` para tipar os novos campos de cada loja.

## Fase 3: UI do Card de Cada Loja em `conciliacao.index.tsx`
1. Atualizar a coluna `Saldo Banco Itaú` de cada loja para exibir o Saldo Consolidado (`OFX + Maquininha Não Entrou`).
2. Adicionar as linhas subordinadas `OFX: R$ ...` e `+ Maq: + R$ ... (Não Entrou)` quando houver valor pendente.
3. Adicionar badge de status de compensação da maquininha (`ENTROU` / `NÃO ENTROU (+ R$ ...)`).

## Fase 4: Header da Página Individual da Loja em `conciliacao.$lojaId.tsx`
1. Adicionar o card de resumo de maquininha da loja com as métricas: Vendas Rede Líquido, Creditado no Banco e A Compensar.

## Fase 5: Validação e Compilação
1. Executar `npm run build` e validar código de saída 0.
2. Criar `walkthrough.md`.
3. Sincronizar com GitHub.
