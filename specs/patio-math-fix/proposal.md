# Proposal: Corrigir Matemática de "Na Loja OS" (Restante na OS) (patio-math-fix)

## Problema
O usuário identificou que o valor financeiro das OSs contabilizado como "Na Loja OS" (ou Pátio) está errado. Na percepção dele, o sistema "deve estar fazendo o cálculo maluco na RPC", pois o total verdadeiro é a soma da coluna "Restante na OS" (o saldo em aberto da OS), e o painel está exibindo o "Total da OS" absoluto.

Ao investigar o código, verificou-se que a RPC do backend (`get_dashboard_metrics` na migration de correção de diferença) **já calcula o pátio corretamente** (`total_value - paid_value`), que é matematicamente o "Restante na OS". 

O real problema é um bug visual (Frontend-side): O hook principal de UI `useDashboardV2.ts`, que alimenta as métricas do card de Pátio, ignora o saldo pago e injeta uma soma bruta de `total_value` (13k no caso reportado, ao invés de zero). 

## Solução Proposta
1. Ajustar as variáveis do frontend (`useDashboardV2.ts`) que calculam o valor do pátio global para sempre exibirem a diferença real (`total_value - paid_value`), alinhando o front com a RPC do banco de dados.
2. Na RPC `calculate_daily_conciliation` (Fechamento por Loja), o "Na Loja OS" passará a contabilizar APENAS o saldo restante (`total_value - paid_value`) das OSs originadas no próprio arquivo do dia (`opened_at::date = p_date OR closed_at::date = p_date`), e não o acumulado global histórico do pátio.

## Contratos de Dados
- Backend (Global): A RPC `get_dashboard_metrics` permanece intacta (já processa o pátio global corretamente).
- Backend (Diário): A RPC `calculate_daily_conciliation` será alterada para somar o "Restante na OS" apenas do dia (`p_date`), desvinculando-a da tabela histórica global `reconciliations.na_loja_os`.
- Frontend: Passará a computar `Math.max(0, Number(os.total_value || 0) - Number(os.paid_value || 0))` globalmente.

## API / Interface
- `useDashboardV2.ts`: Ajustar `veiculosPatioValor` e `patioByStore[os.store_id].valor`.
- `useOsImportProcessor.ts`: Nenhuma alteração necessária, ele já lê as colunas corretamente, apenas o painel renderizava errado.

## Features Existentes Impactadas
- [x] Dashboards Diários
- [x] Tabelas Analíticas de Lojas
(Não impactará faturamento ou caixa global, apenas a exibição segregada de Pátio)

## Risco Principal
- **Baixo Risco**. Como a matemática verdadeira do banco de dados e da conciliação (`useConciliacao.ts` e `calculate_daily_conciliation`) já estavam corretas, corrigir a métrica cosmética do Dashboard (V2) unificará a visão do usuário sem quebrar o caixa.
