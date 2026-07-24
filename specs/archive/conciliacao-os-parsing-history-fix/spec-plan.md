# Spec Plan: Ajuste no Importador e Motor de Conciliação Módulo 2 — OS Bruta, Status Finalizado, Busca Histórica e Trava Anti-Duplicação (conciliacao-os-parsing-history-fix)

## Tasks

- [x] [FRONTEND] Aprimorar Parser de Pagamentos de OS em `src/hooks/useOsImportProcessor.ts`:
  - [x] Implementar regex robusto para extração de `parsed_credit`, `parsed_debit` e `parsed_pix_transfer` a partir da coluna `Pagamentos` (`Credito: XXX; PIX: YYY`).
  - [x] Garantir preservação de `total_value` (valor bruto da OS) e `paid_value` (valor quitado) no objeto `osArray`.
- [x] [FRONTEND] Atualizar Motor de Conciliação em `src/hooks/useConciliacao.ts`:
  - [x] Garantir busca abrangente de `patio_os` por `store_id` sem filtros de `opened_at` rígido.
  - [x] Implementar a **Trava Anti-Duplicação**: excluir do pool de matching OSs que já possuem status `'ENTROU'` ou registro prévio em `conciliation_matches`.
  - [x] Usar `credit_debit_value` (ou `total_value`) para o cruzamento $OS \leftrightarrow Maquininha$ em vez do saldo pendente em aberto zerado.
- [x] [FRONTEND] Atualizar Visualização em `src/components/conciliacao/OsVsRedeTable.tsx`:
  - [x] Exibir o valor bruto da OS e destacar quando a OS foi finalizada em data anterior (ex: dia 21).
- [x] [FRONTEND] Atualizar `src/components/conciliacao/OsDetailModal.tsx`:
  - [x] Exibir detalhamento claro entre Valor Bruto Total, Parcela em Cartão e Parcela em PIX.
- [x] [TEST] Verificar compilação limpa com `npm run build` — ✅ 0 erros (43.30s Client + 6.51s SSR).
