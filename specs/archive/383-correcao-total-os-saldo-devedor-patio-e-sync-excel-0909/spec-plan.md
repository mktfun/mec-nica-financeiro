# Spec Plan: Correção de Total da OS vs Saldo Devedor no Pátio e Sincronização com CONCILIAÇÃO 0909.xlsx (383)

## Tasks

- [x] [DATA] Criar script de sincronização `scripts/sync-patio-os-0909.cjs` para processar as 60 OSs de `CONCILIAÇÃO 0909.xlsx`
- [x] [DATA] Executar sincronização no Supabase atualizando `total_value`, `paid_value`, formas de pagamento e status em `patio_os`
- [x] [VERIFY] Validar no banco de dados que a soma dos saldos em aberto (`total_value - paid_value`) totaliza exatamente R$ 70.204,89
- [x] [UI] Atualizar `MissingPatioOsEditor.tsx` para exibir colunas claras: Valor Total da OS, Valor Pago e Saldo Devedor no Pátio
- [x] [UI] Ajustar ações de baixa/reabertura em `MissingPatioOsEditor.tsx` para manipular `paid_value` sem corromper `total_value`
- [x] [WIZARD] Revisar `CentralImportWizard.tsx` (`detectMissingOs`) para garantir mapeamento correto de `total_value` e `paid_value`
- [x] [BUILD] Executar `npm run build` (`vite build`) e garantir 0 erros de tipagem TypeScript
- [x] [TEST] Testar o fluxo no navegador (localhost:8080) e validar a visualização correta das OSs no Step 2.5
