# Spec Plan: Expurgo de OSs Zumbis/Antigas e Blindagem de Consulta do Pátio Ativo (355)

## Tasks

- [x] [BACKEND] Criar migration `20260902000022_cleanup_patio_os_zombies.sql` com expurgo dos 8 registros espúrios e atualização da RPC `get_pending_patio_os_for_ocr` com filtros defensivos
- [x] [BACKEND] Aplicar a migration no Supabase via script headless
- [x] [TEST] Executar `npm run build` e validar a nova lista limpa de pátio ativo
