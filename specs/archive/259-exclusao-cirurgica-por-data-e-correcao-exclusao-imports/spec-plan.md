# Spec Plan: Exclusão Cirúrgica por Data & Correção do Botão de Excluir Imports (259)

## Tasks

- [x] [BACKEND] Criar migration `20260821000009_purge_daily_financial_data.sql` com a RPC `purge_daily_financial_data(p_date DATE)`
- [x] [BACKEND] Aplicar migration na base Supabase via REST API
- [x] [FRONTEND] Criar hook `src/hooks/usePurgeDailyData.ts` para exclusão cirúrgica de dados por data
- [x] [FRONTEND] Criar modal `src/components/importacoes/PurgeDailyModal.tsx` com seletor de data e confirmação
- [x] [FRONTEND] Atualizar `src/routes/importacoes.tsx` integrando o botão "Resetar Dados do Dia" e corrigindo o feedback de exclusão no histórico (trocando `alert()` por Sonner `toast`)
- [x] [FRONTEND] Atualizar `src/hooks/useImportProcessor.ts` para tornar o `useDeleteImport` resiliente a erros
- [x] [TEST] Testar o reset cirúrgico na data de teste e validar preservação de outras datas
- [x] [TEST] Validar script de restauração `scratch/restore_checkpoint_day_21.cjs`
- [x] [TEST] Executar `npm run build` para garantir zero erros de compilação
