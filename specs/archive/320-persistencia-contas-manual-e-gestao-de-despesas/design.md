# Design: Persistência de Contas Manual e Gestão Completa de Despesas End-to-End (320)

## Arquitetura e Fluxo de Dados
Diagrama do fluxo de ponta a ponta:

1. **Edição no Painel (`ResumoDiaPanel.tsx`)**:
   - Operador clica em "Editar Fechamento" → Altera `contasInput` → Clica em "Salvar Fechamento".
   - `handleSave` envia mutação para `daily_snapshots` com `contas_a_pagar = contasInput` e `metadata.contas_manual_override = contasInput`.
   - RPC `get_daily_reconciliation_summary` detecta `metadata.contas_manual_override` e retorna `contas_manual = contasInput`.
   - A interface exibe exatamente o valor salvo com coerência no DRE e na Diferença Final.

2. **Gestão de Itens no Modal (`ContasManualModal.tsx`)**:
   - Operador abre o modal de Contas.
   - Lista todas as contas (Base Planilha + Extras Manuais).
   - Para qualquer conta, pode:
     - **Editar**: Abre `EditBillModal`, altera valor/título/loja/categoria, grava via `update_manual_bill`.
     - **Toggle Contábil**: Inclui/exclui do subtotal via `toggleContabilizarMutation`.
     - **Excluir**: Remove a conta via `deleteBillMutation`.
     - **Adicionar**: Cria nova conta via `addBillMutation`.
   - Os totais de Base, Extras e Subtotal recalculam instantaneamente.

## Mutações em Arquivos Existentes [MODIFY]
- `supabase/migrations/20260831000006_fix_contas_manual_override_and_management.sql`:
  - Cria RPC `update_manual_bill`.
  - Atualiza `get_daily_reconciliation_summary` com precedência de `contas_manual_override`.
- `src/components/conciliacao/ContasManualModal.tsx`:
  - Adiciona diálogo de edição e mutação de atualização de despesa.
- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Adiciona suporte e persistência de `contas_manual_override` e botão de restaurar base.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Edição Direta no Fechamento)**:
  - SCAN: Carregar data `31/08/2026`, editar Contas para `R$ 40.394,05` e salvar.
  - INFER: O valor deve persistir `R$ 40.394,05` mesmo após refetch e recarregamento.
  - VERIFY: Subtotal de contas = `40.394,05 + 3.932,35 = R$ 44.326,40`.
- **Cenário 2 (Edição de Item no Modal)**:
  - SCAN: Abrir `ContasManualModal`, editar uma despesa alterando seu valor.
  - INFER: A alteração persiste no banco de dados e recalcula o total de despesas.
  - VERIFY: Ao fechar o modal, a conciliação reflete o novo somatório.
