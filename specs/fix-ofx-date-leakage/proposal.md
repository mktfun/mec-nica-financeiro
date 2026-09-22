# 📋 SDD Proposal: Blindagem de Escopo de Data e Eliminação de Vazamento do OFX

## 1. Problema Diagnosticado

### A. Vazamento Fiduciário de Transações OFX dos Dias Anteriores (14, 15 e 16) no Dia Vigente (17)
O usuário relatou e enviou print comprovando que, ao abrir a conciliação da filial (ex: Piraporinha - EMPORIO):
- Aparecem 21 lançamentos bancários no extrato, sendo 10 de segunda-feira (14/09), 8 de terça-feira (15/09) e 4 de quarta-feira (16/09).
- Lançamentos não conciliados de dias passados (ex: boletos de ENEL R$ 462,78, HOMOTEK R$ 80,00, PRPK R$ 1.568,85) aparecem como "Pendentes" no dia 17/09 e entram no cômputo da conciliação do dia 17.
- Na conciliação diária da filial e no resumo geral, as diferenças de entradas e saídas explodem porque o dia 17 está herdando lançamentos bancários que ocorreram em 14/09 e 15/09.

### B. Causa-Raiz Técnica Comprovada no Banco e no Código
1. **Atribuição Corrompida de target_date no Wizard:**
   - Em `src/components/importacoes/CentralImportWizard.tsx` (linhas 1367-1378):
     O wizard calcula `effectiveOfxDate = tx.date`, mas na hora de montar o objeto força:
     `target_date: targetDate` (onde `targetDate` é a data do wizard, ex: 17/09/2026).
   - Todas as 126 transações do banco `ofx_transactions` foram carimbadas com `target_date` do dia da importação em vez de respeitar o `occurred_at` real da movimentação bancária:
     - 10 transações de 14/09 ficaram com `target_date = '2026-09-17'`!
     - 7 transações de 15/09 ficaram com `target_date = '2026-09-17'`!
     - 59 transações de 15/09 ficaram com `target_date = '2026-09-16'`!
2. **Escopo Padrão do Extrato (`StoreExtratoBancarioView.tsx`):**
   - Na linha 70, o estado inicial do escopo está como `viewScope = 'lote_ofx'`.
   - Esse escopo traz o lote histórico completo do arquivo OFX (incluindo dias passados) em vez de focar estritamente no fechamento do dia alvo selecionado (`dia_alvo`).
3. **Efeito Cascata no Cálculo SSOT (`get_daily_reconciliation_summary`):**
   - A função do Postgres faz `WHERE target_date = p_date`. Como as saídas e entradas de 14 e 15 foram gravadas com `target_date = '2026-09-17'`, o backend somou tudo no dia 17, inflando a diferença bancária da loja.

---

## 2. Solução Proposta

1. **Saneamento Imediato no Banco de Dados (`ofx_transactions` e `transactions`):**
   - Executar script de correção para realinhar `target_date` com a data real em que a transação bancária ocorreu:
     `UPDATE ofx_transactions SET target_date = occurred_at::date WHERE target_date != occurred_at::date;`
     `UPDATE transactions SET target_date = occurred_at::date WHERE source = 'ofx' AND target_date != occurred_at::date;`
2. **Correção Definitiva na Ingestão do Wizard (`CentralImportWizard.tsx` e `useTransactions.ts`):**
   - Garantir que toda transação OFX salve `target_date = effectiveOfxDate` (ou `occurred_at.split('T')[0]`), eliminando contaminação em futuras importações.
3. **Blindagem do Frontend (`StoreExtratoBancarioView.tsx`):**
   - Alterar o escopo padrão para `dia_alvo` (`Apenas Fechamento do Dia`), garantindo que o usuário visualize apenas as transações pertinentes à competência da data selecionada.
   - Impedir que pendências de dias anteriores vazem para o contador de pendências do dia corrente.
4. **Recálculo Automático da Conciliação:**
   - Ao segregar as datas, as transações de 14/09 pertencem estritamente a 14/09, as de 15/09 a 15/09, as de 16/09 a 16/09 e as de 17/09 a 17/09. A diferença de conciliado e OFX do dia volta ao valor real e fidedigno.

---

## 3. Skills Especializadas Aplicadas

- `database`: Saneamento de integridade fiduciária em `ofx_transactions` e `transactions` preservando integridade referencial.
- `backend-patterns`: Correção do motor de inserção e normalização de datas bancárias em `useTransactions.ts`.
- `frontend-design-pro`: Ajuste de padrão de escopo e visualização limpa por competência diária em `StoreExtratoBancarioView.tsx`.

---

## 4. Contratos de Dados

### Tabela `ofx_transactions`:
- `occurred_at`: Data/hora real do extrato bancário (ex: `2026-09-14T10:00:00+00:00`).
- `target_date`: Deve ser estritamente igual a `occurred_at::date` (ex: `2026-09-14`), garantindo que cada dia feche apenas seus próprios débitos e créditos.

---

## 5. Arquivos Afetados

### [Arquivos Existentes Reutilizados/Modificados]
- `src/components/importacoes/CentralImportWizard.tsx`: Corrigir linha 1378 para atribuir `target_date: effectiveOfxDate`.
- `src/hooks/useTransactions.ts`: Ajustar `useBulkInsertTransactions` para priorizar a data real de ocorrência da transação OFX.
- `src/components/conciliacao/StoreExtratoBancarioView.tsx`: Definir `viewScope = 'dia_alvo'` como padrão.
- Banco de dados Supabase: Alinhamento de `target_date` das 126 transações OFX existentes.

### [Arquivos Novos]
- Nenhum.

---

## 6. Plano de Rollback

Reverter com: `git checkout -- src/components/importacoes/CentralImportWizard.tsx src/hooks/useTransactions.ts src/components/conciliacao/StoreExtratoBancarioView.tsx`

---

## 7. Risco Principal e Mitigação

- **Risco:** Reabrir ou alterar o saldo bancário de dias anteriores.
- **Mitigação:** O saldo final bancário de cada filial (`bank_total`) já está gravado em `reconciliations` e `daily_snapshots` pelo fechamento noturno; o realinhamento de datas das transações apenas distribui as transações orfãs/conciliadas em suas gavetas corretas de data, zerando as divergências fantasmas do dia 17.
