# Proposal: Correção de Regressão no Fechamento por Filial e Tela de Detalhes (330)

## Problema
Após o commit `ccae9e1` (Spec 279), a agregação por filiais via CTEs na RPC `get_daily_reconciliation_summary` quebrou. Lojas apresentam valores zerados para Maquininha e Previsto. A Diferença está enviesada (focada apenas em conciliação de cartões em vez de refletir o fluxo de caixa da loja). A tela de detalhes da loja não exibe todas as transações, e falhas de JOIN no banco estão sendo mascaradas por fallbacks silenciosos para zero no Frontend.

## Solução Proposta (Foco em Reuso e Correção)
- **Restaurar a Fidelidade da RPC [MODIFY]:** Corrigir os JOINs das CTEs em `get_daily_reconciliation_summary` para lidar adequadamente com a mescla de UUIDs (ex: Mauá) e IDs curtos (`st-01`), garantindo que se não houver dados, o retorno seja explícito (null/erro) em vez de `COALESCE(..., 0)` mascarador.
- **Redefinição da Diferença [MODIFY]:** A coluna `Diferença` por filial deve compor todos os fluxos da conta (Entradas OFX, Cartões, PIX, Saídas), batendo com a diferença consolidada, em vez de ser apenas `(OFX Maquininhas - Rede Líquido)`.
- **Visibilidade de Extrato (Frontend) [MODIFY]:** Remover filtros restritivos no frontend da tela `/conciliacao/:lojaId` que ocultavam TEDs, despesas e lançamentos não classificados, exibindo o extrato completo da conta da loja.
- **Remoção de Fallbacks Silenciosos [MODIFY]:** Alterar `StoreCardModulo1.tsx` e hooks para exibir alertas visuais (Loading/Error/Unlinked) em vez de R$ 0,00 quando o dado estiver ausente.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes:** A RPC `get_daily_reconciliation_summary` será adaptada. O erro reside na restrição exagerada do `LEFT JOIN` com a CTE `stores`.
- **Componentes / Hooks Existentes:** `src/routes/conciliacao.$lojaId.tsx` será ajustado para consumir todas as transações via hook `useTransactionsPorDataELoja`, removendo filtros arbitrários.

## Contratos de Dados & SQL (Supabase)
- Alteração na RPC `get_daily_reconciliation_summary` para recalcular `diferenca_loja` alinhada ao macro (Faturamento - Variação - Contas) e expor métricas individuais sem conversão silenciosa.

## API & Componentes (Frontend)
- `ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx`: Modificados para lidar com `null` e exibir badges de "Falha de Vínculo" ou "Dado Ausente".
