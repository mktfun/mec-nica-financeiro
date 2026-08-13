# Spec Plan: Correção de Matemática do Dashboard e Marco Zero (182)

## Tasks

- [x] [BACKEND] Criar nova migration baseada em `20260813085500_fix_dashboard_math.sql` para alterar o `get_dashboard_metrics` restaurando `AND source = 'ofx'` nas variáveis globais e de loja (`v_faturamento_atual`, `v_contas_a_pagar_ofx`, `v_store_fat`, `v_store_contas`).
- [x] [BACKEND] Na mesma migration, alterar `calculate_daily_conciliation` para restaurar `AND source = 'ofx'` nas variáveis (`v_faturamento_banco`, `v_store_contas`).
- [x] [FRONTEND] Alterar `src/components/importacoes/MarcoZeroWizard.tsx` na função `handleSave`, adicionando lógica para gerar um upsert global e por loja na tabela `reconciliations` populando a coluna `bank_total` com o Caixa Anterior extraído da planilha (que representa o dinheiro em conta antes de iniciar).
- [x] [TEST] Reexecutar as SQL Functions localmente.
- [x] [TEST] Verificar no VLM se os valores do Dashboard agora se mantêm saudáveis após salvar.
