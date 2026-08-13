# Spec Plan: Gestão de OSs Legadas do Marco Zero (187-gestao-os-legadas)

## Tasks

- [x] [BACKEND] Criar nova migration `supabase/migrations/YYYYMMDDHHMMSS_liquidate_legacy_os_rpc.sql`
- [x] [BACKEND] Definir a RPC `liquidate_legacy_os(p_os_ids uuid[])` que atualiza a tabela `patio_os`.
- [x] [BACKEND] Aplicar a migration no banco remoto usando `supabase db query --linked`.
- [x] [FRONTEND] Criar novo componente `src/components/conciliacao/LegacyOsTable.tsx` com as colunas, totais, seletores e botões de baixa de OS em lote/manual e cache invalidation (`invalidateQueries`).
- [x] [FRONTEND] Alterar `src/routes/conciliacao.$lojaId.tsx`: importar `useDailySnapshot`, interceptar se `(currentSnapshot?.metadata as any)?.is_marco_zero === true`.
- [x] [FRONTEND] Se `is_marco_zero` for verdadeiro, renderizar `<LegacyOsTable />` ocultando as abas operacionais (`OsVsRedeTable`, etc).
- [x] [TEST] Verificar cenário 1: Visão isolada das OSs legadas no modo Marco Zero.
- [x] [TEST] Verificar cenário 2: Simular baixa (lote e manual) de OS e garantir atualização reativa da contabilidade local.
