# Spec 420 — Proposal: Idempotência Global de Dinheiro de OS (Cofre) e Correção da Baixa de Cofre

## Problema
Ao importar os novos arquivos de OS do dia 18/09 (`C:\Users\admin\Desktop\conciliacao\09-26\18-09`), o sistema reimportou e recriou no cofre (`store_cash_vault`) todas as OSs com pagamento em dinheiro físico (17 OSs somando mais de R$ 25.000,00), incluindo 16 OSs que **já haviam sido dadas como baixadas/depositadas no dia anterior (17/09)**.

Isso forçou o usuário a ter que dar baixa em todas as 17 OSs novamente sem saber quais eram de fato novas, gerando duplicidade no banco e confusão sobre a persistência dos dados ("não salvar nem nada").

### Causa-Raiz Diagnosticada
1. **Restrição Indevida de `entry_date` na Busca de Idempotência (`useImportProcessor.ts` linha 170):**
   ```typescript
   const { data: existingVault } = await supabase
     .from('store_cash_vault')
     .select('id, status, amount')
     .eq('store_id', storeId)
     .eq('os_number_ref', osNumRef)
     .eq('entry_date', entryDate) // <-- CAUSA RAIZ
     .maybeSingle();
   ```
   As planilhas de conferência de OS (`*ConferenciaOSxFinanceiro.xls`) trazem o histórico de OSs recentes de vários dias. Quando o usuário importou no dia 18/09, o código filtrou por `entry_date = '2026-09-18'`. Como as OSs de 17/09 (ex: OS 419, OS 2423, OS 40357, etc.) estavam gravadas com `entry_date = '2026-09-17'`, a query retornou `null`!
   O sistema assumiu erroneamente que eram lançamentos novos e inseriu **16 registros duplicados** com `status: 'em_transito'` no dia 18/09.
2. **Ausência de Invalidação de Cache no Wizard (`Step3CashVaultDaniel.tsx` linha 95):**
   Ao clicar em "Confirmar Recolhimento" no Passo 3 do Wizard, o componente executava o `update` no Supabase, mas **não invalidava a query do React Query** (`queryKey: ['store-cash-vault-em-transito']`). A tela mantinha os itens em memória como se nada tivesse sido salvo, dando a impressão de erro de gravação.
3. **Data Forçada de Ingestão:**
   A linha 162 de `useImportProcessor.ts` forçava `entryDate = targetDate` mesmo quando a OS trazia a data de fechamento real (`closed_at`) de um dia anterior.

---

## Solução Proposta
1. **Idempotência Global por OS e Loja (`store_id` + `os_number_ref`):**
   Em `useImportProcessor.ts`, verificar a existência prévia da OS no cofre **independentemente da data** (`.eq('store_id', storeId).eq('os_number_ref', osNumRef)`).
   - Se já existe com `status === 'depositado'`: **NÃO REINSERIR**. Preservar o status de baixado intacto.
   - Se já existe com `status === 'em_transito'`: Atualizar o valor caso tenha mudado, mas **NUNCA duplicar**.
   - Se não existe: Inserir com a data real de fechamento da OS (`closed_at` ou fallback para `targetDate`).
2. **Invalidação Reativa em `Step3CashVaultDaniel.tsx`:**
   Ao confirmar recolhimento, disparar `queryClient.invalidateQueries({ queryKey: ['store-cash-vault-em-transito'] })` e refetch automático, limpando imediatamente os itens baixados da visualização e dando feedback conclusivo.
3. **Saneamento das 16 Duplicatas de 18/09 em `store_cash_vault`:**
   Remover do banco as 16 entradas duplicadas criadas em 18/09 que já existem legitimamente em 17/09 como `depositado`, mantendo apenas a OS 620 (R$ 500,00 da Dom Pedro), que é a única OS verdadeiramente nova de 18/09.

---

## Skills Especializadas Aplicadas
- `backend-patterns`: Idempotência determinística em pipelines de ETL e processamento atômico de transações financeiras.
- `database`: Saneamento de integridade referencial em tabelas financeiras (`store_cash_vault`).

---

## Contratos de Dados
- Tabela `store_cash_vault`:
  - Chave de idempotência semântica: `(store_id, os_number_ref)`.
  - Estados: `'em_transito'` | `'depositado'` | `'pending'`.

---

## Arquivos Afetados
- **Arquivos Existentes Modificados:**
  1. `src/hooks/useImportProcessor.ts` (linhas 157–192: busca de idempotência sem restrição de data)
  2. `src/components/importacoes/wizard/Step3CashVaultDaniel.tsx` (linhas 85–105: invalidação de query com `useQueryClient`)
- **Arquivos Novos:**
  - Nenhum.

---

## Plano de Rollback
Reverter modificações via git:
```bash
git checkout -- src/hooks/useImportProcessor.ts src/components/importacoes/wizard/Step3CashVaultDaniel.tsx
```

---

## Risco Principal e Mitigação
- **Risco:** Uma OS ter dois pagamentos em dinheiro legítimos e separados no mesmo dia.
- **Mitigação:** No sistema da oficina, cada OS possui um único campo de valor total em dinheiro (`Dinheiro: R$ X`). Portanto, a relação de OS para dinheiro de cofre é estritamente 1:1 por filial.
