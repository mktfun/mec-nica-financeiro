# Spec Plan: Correção na Importação de OSs (Status, Valor Total = Pago + Aberto) e Ajuste da Tela de OSs (fix-os-import-parsing-and-patio-metrics)

## Tasks

- [ ] [FRONTEND] Ajustar `src/hooks/useOsImportProcessor.ts`:
  - [ ] Mapear explicitamente colunas de `openValue` ("em aberto", "restante", "falta", "saldo") separadas de `paidValue`.
  - [ ] Calcular `total_value = paid_value + open_value` (com fallback seguro para `rawTotal`).
  - [ ] Ler a coluna Status / D4 diretamente para `raw_status` e derivar `statusEnum` ('em_aberto' | 'pago_parcial' | 'finalizado') sem sobrescrever "Em Aberto" como finalizado.
- [ ] [FRONTEND] Reformular a Tela de OSs em `src/routes/patio.tsx`:
  - [ ] Ajustar KPI **Total em Aberto** para somar `(total_value - paid_value)` de todas as OSs em aberto/parciais.
  - [ ] Ajustar contadores de **Sem Pagamento** (`paid_value === 0`) e **Pagas Parcialmente** (`paid_value > 0 && total_value > paid_value`).
  - [ ] Adicionar no Card da OS a exibição explícita do valor **Aberto: R$ (total_value - paid_value)** quando houver saldo pendente.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
