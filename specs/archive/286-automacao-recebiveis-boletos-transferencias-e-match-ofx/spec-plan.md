# Spec Plan: Automação de Recebíveis para Boletos e Transferências Bancárias (286)

## Tasks

- [x] [FRONTEND] Criar utilitário de calendário bancário brasileiro `src/lib/bankingCalendar.ts` (feriados nacionais + cálculo determinístico de dias úteis)
- [x] [FRONTEND] Implementar extrator e classificador de Boletos e Transferências em `src/hooks/useOsImportProcessor.ts`, gerando `receivablesArray` com parcelas e prazos úteis
- [x] [FRONTEND] Atualizar persistência de recebíveis em `src/hooks/useImportProcessor.ts` para salvar `os_number`, `installment` e `description` com idempotência estrita
- [x] [BACKEND] Criar migração `20260825000005_receivables_automatch_and_calendar.sql` com a RPC `auto_match_receivables` e índice `idx_receivables_os_inst`
- [x] [FRONTEND] Conectar a tela de Recebíveis (`src/routes/recebiveis.tsx`) para exibir as parcelas da OS e badges de match sugerido
- [x] [TEST] Executar testes automatizados de parsing de OSs com múltiplos formatos de boletos e transferências
- [x] [TEST] Testar conciliação e baixa automática com extrato OFX em ambiente Supabase
