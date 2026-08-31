# Spec Plan: Persistência de Contas Manual e Gestão Completa de Despesas End-to-End (320)

## Tasks

- [x] [BACKEND] Criar RPC `public.update_manual_bill` para atualização atômica de despesas em `daily_manual_bills`
- [x] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` para respeitar `contas_manual_override` de `daily_snapshots`
- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx` para persistir e renderizar `contas_manual_override` sem reversão
- [x] [FRONTEND] Atualizar `ContasManualModal.tsx` com modal e fluxo de edição de contas existentes (`EditBillModal`)
- [x] [TEST] Executar Cenário 1: Validar persistência de override manual de contas no fechamento sem reversão
- [x] [TEST] Executar Cenário 2: Validar edição, exclusão e adição de contas no modal com recálculo em tempo real
