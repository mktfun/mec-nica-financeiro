# Spec Plan: Teste E2E e Execução da Conciliação com Arquivos Reais de 27-08 (314)

## Tasks

### Fase 1 — Criação e Configuração do Script E2E
- [x] [TEST] Criar o script de automação E2E `scripts/run-e2e-conciliacao-2708.ts` com suporte a Playwright, injeção dos 27 arquivos de `C:\Users\admin\Desktop\conciliacao\27-08`, captura de screenshots de cada step e validação no banco Supabase

### Fase 2 — Execução do Teste E2E no Localhost:8080
- [x] [TEST] Executar o script `npx tsx scripts/run-e2e-conciliacao-2708.ts` contra o servidor Vite ativo na porta 8080
- [x] [TEST] Validar transição bem-sucedida do Step 1 ao Step 8 sem interrupções ou erros

### Fase 3 — Auditoria Visual e Conferência dos 5 Pilares
- [x] [TEST] Inspecionar as screenshots geradas em `./e2e-results/screenshots/` (Steps 1 a 8 e Cockpit)
- [x] [TEST] Validar o fechamento contábil dos 5 Pilares (Saldo Bancos R$ 60.575,77, Pátio R$ 65.603,74, Contas R$ 20.752,83, Diferença Final -R$ 0,03)
- [x] [TEST] Confirmar os registros gravados em `daily_snapshots`, `patio_os`, `transactions` e `reconciliations`
