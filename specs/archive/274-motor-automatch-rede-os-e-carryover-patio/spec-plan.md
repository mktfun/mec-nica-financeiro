# Spec Plan: Motor Inteligente de Auto-Match (Rede ↔ OS) e Carry-Over de Pátio (Spec 274)

## Tasks

- [x] [BACKEND] Criar migração SQL `20260824000006_sync_patio_os_forensic_excel_2408.sql` sincronizando a OS #2326 (Santo André, R$ 9.218,73 em aberto) e OS #1847 (Rei do Módulo, quitada com R$ 12.900)
- [x] [BACKEND] Aplicar a migração no Supabase e auditar via RPC que `na_loja_os = 88.212,39` e `diferenca_final = +6,20` (Conciliado)
- [x] [FRONTEND] Aprimorar a lógica de auto-match em `useImportProcessor.ts` para cruzar automaticamente vendas de cartão da Rede com OSs em aberto de mesmo valor na filial
- [x] [TEST] Executar `npm run build` e validar compilação com zero erros
