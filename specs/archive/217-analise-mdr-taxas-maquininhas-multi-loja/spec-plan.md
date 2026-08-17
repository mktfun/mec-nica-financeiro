# Spec Plan: Auditoria Analítica de MDR, Taxas de Maquininhas e Divergência Contratual Multi-Loja (217)

## Tasks

- [x] [BACKEND/DATABASE] Criar migration `supabase/migrations/20260817100000_create_mdr_contracts_and_audit_rpc.sql` com tabela `pos_fee_contracts` e RPC `get_mdr_audit_summary`.
- [x] [FRONTEND/LIB] Criar parser analítico `src/lib/parsers/redeSalesParser.ts` com mapeamento multi-loja (1:N) e extração de bandeira, parcelas e cálculo de taxa efetiva.
- [x] [FRONTEND/HOOKS] Criar hook `src/hooks/useMdrAudit.ts` com chamada segura à RPC e fallback resiliente no cliente.
- [x] [FRONTEND/COMPONENTS] Criar componente `src/components/maquininhas/MdrAuditView.tsx` em Dark UI sólido (Zinc-950) com KPIs, gráfico comparativo de taxas por bandeira, ranking por filial e tabela de auditoria com exportação CSV.
- [x] [FRONTEND/ROUTES] Integrar a visão de auditoria em `src/routes/recebiveis.tsx` com aba "Auditoria de Maquininhas (MDR)".
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo 0 erros de compilação.
- [x] [TEST] Validar compilação e integridade da solução.
