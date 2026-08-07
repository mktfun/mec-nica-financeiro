# Proposal: CorreçÁo de Match Aba 2 (REDE vs OFX) e Faturamento de OS na Aba 1 (conciliacao-fixes)

## Problema
1. **Aba 2 (REDE ↔ OFX):** Ao conciliar o líquido da maquininha da loja Jabaquara (R$ 537,17 + R$ 561,72 = R$ 1.098,89), o sistema pegava TODAS as entradas do extrato bancário (R$ 5.304,69, incluindo PIXs e depósitos diversos) e exibia um falso aviso de **"SOBRA R$ 4.205,80"**, ignorando que existia no extrato bancário um crédito exato de adquirente de **R$ 1.098,89** (`RECEBIMENTO REDE MAST...`).
2. **Aba 1 (OS ↔ REDE):** O faturamento da OS e o Delta apareciam como `-` mesmo quando a transaçÁo estava vinculada à OS (ex: `OS 341`), devido a um mismatch de comparaçÁo de tipos (String `"341"` vs Number `341` ou prefixos de loja `"st-04_341"`).

## SoluçÁo Proposta
1. **Inteligência de Match de Adquirente no OFX (Aba 2):**
   - Filtrar os lançamentos do OFX separando entradas de adquirente (contendo `REDE`, `REDECARD`, `MAST`, `VISA`, `ELO`, `PAGAMENTO S.A.`, etc.) de outros créditos (como PIX e transferências avulsas).
   - Realizar o match automático do total líquido da maquininha da loja (ex: R$ 1.098,89) contra a linha correspondente do OFX (R$ 1.098,89).
   - Exibir o status **PAREADO (Divergência: R$ 0,00)** quando o líquido da maquininha bater com o depósito do banco, isolando lançamentos nÁo correlacionados em uma lista de "Outras Entradas no Banco".
2. **NormalizaçÁo de OS e Faturamento (Aba 1):**
   - Normalizar a chave de pareamento em `useConciliacao.ts` para converter `os_number` para string e remover prefixos de loja (`String(o.os_number) === String(osNumber).replace(/^[^-]+_/, '')`).
   - Carregar `os_total` com o valor faturado da OS (`paid_value` / `total_value`) e calcular o delta correto (`osFaturamento - redeBruto`).

## Contratos de Dados
- Tabela `patio_os`: leitura de `os_number`, `paid_value`, `total_value`, `credit_value`, `debit_value`.
- Tabela `transactions`: leitura de `source` (`rede`, `maquininha`, `ofx`), `amount`, `title`, `counterpart_name`, `target_date`, `store_id`.
- Tabela `conciliation_matches`: leitura de `system_os_number`, `rede_transaction_id`, `ofx_transaction_id`.

## Features Existentes Impactadas
- `src/hooks/useConciliacao.ts` (`useReconciliationViews`)
- `src/components/conciliacao/RedeVsOfxTable.tsx`
- `src/components/conciliacao/OsVsRedeTable.tsx`

## Risco Principal
Garantir que ao isolar créditos de adquirente na Aba 2, nenhum PIX que seja comprovadamente pagamento de OS seja descartado da conciliaçÁo global (os PIXs continuarÁo visíveis no painel de PIX e em "Outros Lançamentos").
