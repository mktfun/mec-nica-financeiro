# Spec Plan: Lógica Refatorada de Conciliação Bruto vs Líquido (090-reconciliation-math)

## Tasks

- [x] [BACKEND] Criar arquivo de migration SQL (`supabase/migrations/...`) para adicionar `gross_amount NUMERIC` e `fee_amount NUMERIC` na tabela `transactions`.
- [x] [FRONTEND] Atualizar interface `TransactionRow` em `src/lib/supabase.ts` para incluir `gross_amount` e `fee_amount`.
- [x] [FRONTEND] No `CentralImportWizard.tsx`, ao mapear `results.redeResults` e `maqByStore`, passar `gross_amount` (grossAmount) e `fee_amount` (interest) no payload `txsToInsert`.
- [x] [FRONTEND] No `modulo1Calculations.ts`, reescrever a matemática do `calculateGlobalConciliacao` (e das stores) para abater a taxa explícita (`fee_amount`), exibindo um Faturamento Líquido e uma diferença focada apenas no "pendente bruto".
- [x] [FRONTEND] Atualizar UI em `ResumoDiaPanel.tsx` para apresentar a linha "Juros Descontados" e "Divergência de Vendas (OS vs Maquininha Bruto)".
- [x] [TEST] Verificar se importar um arquivo da Rede agora salva os juros e o bruto corretamente no Supabase.
- [x] [TEST] Verificar se a UI exibe os totais corretos (OS vs Rede).
