# Tasks: RefatoraçÁo da ImportaçÁo e Novo Extrato Bancário (009)

## Fase 0 — Banco de Dados
- [ ] Limpar todas as tabelas afetadas (`patio_os`, `receivables`, `import_logs`, `reconciliations`, `transactions`).

## Fase 1 — Frontend (ImportaçÁo)
- [ ] Atualizar `ImportReportDialog.tsx`: remover dependência de data única (`targetDate`).
- [ ] Ajustar conversÁo de Datas em `ImportReportDialog` para processar a planilha do mês todo.
- [ ] Mapear as Formas de Pagamento: PIX (D+0), Débito (D+1), Crédito (D+1), Dinheiro/Em Conta (D+0).

## Fase 2 — Backend (Processamento)
- [ ] Atualizar `useImportProcessor.ts` para receber array unificado e agrupar por dia.
- [ ] `useImportProcessor.ts` deve iterar os dias inserindo em `reconciliations` (via UPSERT) e `import_logs`.
- [ ] `useImportProcessor.ts` deve gerar registros individuais em `transactions` para cada OS fechada, para alimentar o Extrato Bancário.

## Fase 3 — UI (Extrato Bancário)
- [ ] Criar novo hook em `useTransactions.ts` para buscar extrato com filtros (`useExtrato`).
- [ ] Refazer `historico.tsx` inteiro: filtros de período e loja.
- [ ] `historico.tsx`: exibir Entradas, Saídas e Saldo Final.
- [ ] `historico.tsx`: exibir as linhas estilo banco.

## Fase 4 — VerificaçÁo
- [ ] `npm run build`.
- [ ] Testar renderizaçÁo do histórico e compilaçÁo geral.
