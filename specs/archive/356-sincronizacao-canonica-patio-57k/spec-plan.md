# Spec Plan: Sincronização Canônica Estrita de Pátio com Planilha Oficial — R$ 57.780,63 (356)

## Tasks

- [x] [BACKEND] Criar e aplicar script SQL/RPC `20260902000023_sync_canonical_patio_0109.sql` para finalizar todas as OSs fora da lista oficial e sincronizar com precisão as 44 OSs canônicas
- [x] [BACKEND] Executar script headless de reconciliação de dados no Supabase e atualizar o snapshot diário para `total_patio = 57780.63`
- [x] [TEST] Executar `npm run build` e validar que a soma de pátio em aberto retorne exatamente R$ 57.780,63
