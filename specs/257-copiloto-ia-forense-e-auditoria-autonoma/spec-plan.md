# Spec Plan: Copiloto IA Forense & Motor de Auditoria Autônoma (Spec 257)

---

## Tasks

- [ ] [BACKEND] Criar migration `20260821000006_forensic_audit_rpc.sql` com a tabela `reconciliation_audit_logs` e a RPC `audit_daily_reconciliation_delta(p_date text)`
- [ ] [BACKEND] Implementar a lógica SQL de detecção de assinaturas numéricas (vault, aportes intercompany, assimetria de horários e efeito cascata de snapshots)
- [ ] [FRONTEND] Criar tipos TypeScript em `src/types/forensicAudit.ts`
- [ ] [FRONTEND] Criar hook `src/hooks/useForensicAudit.ts` integrado com a RPC e com o provedor LLM via `useAiSettings`
- [ ] [FRONTEND] Criar hook `src/hooks/useForensicRemediation.ts` para aplicar correções de auto-cura de forma segura com preview
- [ ] [FRONTEND] Criar componente `ForensicDiagnosisCard.tsx` e integrá-lo no card lateral de Diferença Final em `ResumoDiaPanel.tsx`
- [ ] [FRONTEND] Criar componente `ForensicAuditDrawer.tsx` para o chat pericial interativo lateral
- [ ] [TEST] Testar cenário real de 21/08 (detecção e explicação de delta ao centavo)
- [ ] [TEST] Testar cenário de Aporte Intercompany (cruzamento de entradas PIX com retiradas)
- [ ] [TEST] Executar `npm run build` para garantir zero erros de compilação TypeScript e Vite
