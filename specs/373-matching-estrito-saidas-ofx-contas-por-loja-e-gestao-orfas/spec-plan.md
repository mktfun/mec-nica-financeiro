# Spec Plan: Matching Estrito de Saídas OFX x Contas a Pagar (Loja a Loja) & Isolamento de Órfãs (373)

## Tasks

- [x] 1. [DB] Criar migration `20260905000033_strict_store_by_store_auto_match_saidas.sql` com reformulação estrita da RPC `auto_match_saidas`:
  - Camada 1: Código de Barras / FITID exato na mesma filial.
  - Camada 2: Valor Exato ($\le \text{R\$} 0,05$) com restrição estrita `o.store_id = bill_rec.store_id`.
  - Camada 3: Valor Exato + Similaridade de Token de Fornecedor na mesma filial.
  - Camada 4: Contas da Matriz (`store_id IS NULL` ou `'master'`) batendo com débitos corporativos/filiais.
  - Expurgo de qualquer matching cruzado cego entre lojas distintas.
  - Retorno analítico com contadores de vinculados, contas pendentes e débitos órfãos.

- [x] 2. [BACKEND/INGESTION] Integrar chamada compulsória de `auto_match_saidas` no pipeline de ingestão:
  - No hook `src/hooks/useContasAPagarImport.ts`: disparar `auto_match_saidas` logo após o salvamento dos lotes no banco de dados.
  - No wizard `src/components/importacoes/CentralImportWizard.tsx`: invocar `auto_match_saidas` no fechamento do lote para persistir os vínculos no PostgreSQL antes da exibição dos resultados.

- [x] 3. [FRONTEND] Ajustar a visualização e gestão de saídas na Fase 4 (`Fase4ContasVsSaidasReview.tsx`):
  - Exibir contadores claros de batimento: Contas Casadas com Débitos da Loja vs Débitos Órfãos Reais.
  - Garantir fluxo ágil de justificativa das saídas órfãs (vínculo manual a conta, despesa extra da loja ou holding não operacional).

- [x] 4. [FRONTEND] Saneamento no `StoreExtratoBancarioView.tsx`:
  - Assegurar que o batimento em memória e o botão de persistência reflitam estritamente a relação conta a conta da mesma loja (`storeId`).

- [x] 5. [TEST/VERIFY] Executar bateria de validações:
  - Verificar se nenhum débito é auto-categorizado no escuro.
  - Testar importação conjunta de OFX e Contas e auditar se `matched_bill_id` e `matched_ofx_id` são persistidos atômicos no PostgreSQL.
  - Validar que saídas órfãs reais aparecem isoladas na interface sem cruzamento indevido de filiais.
