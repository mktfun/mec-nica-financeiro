# Spec Plan: Motor de Conciliação Autônoma Zero-Touch com Auto-Healing Pericial (Spec 258)

---

## Tasks

- [x] [BACKEND] Criar migration `20260821000007_autonomous_reconciliation_engine.sql` com a tabela `reconciliation_audit_logs` e a RPC `run_autonomous_reconciliation_loop(p_date text)`
- [x] [BACKEND] Implementar a lógica pericial de auto-healing em Postgres: varredura de cofre, ancoragem de datas, identificação de PIX de sócios/filiais nos OFX e contrapartida de faturamento/despesas
- [x] [BACKEND] Implementar a gravação automática na tabela `reconciliation_audit_logs` contendo todo o histórico de investigações executadas
- [x] [FRONTEND] Criar tipos TypeScript em `src/types/autoHealing.ts`
- [x] [FRONTEND] Criar hook `src/hooks/useAutonomousReconciliation.ts` que executa a RPC de auto-healing e monitora as etapas do loop
- [x] [FRONTEND] Atualizar `CentralImportWizard.tsx` adicionando o estágio visual de `Auditoria Pericial & Auto-Healing` após o salvamento da conciliação
- [x] [FRONTEND] Exibir no modal de conclusão do wizard o relatório pericial das regularizações automáticas realizadas pela IA
- [x] [TEST] Testar o loop de auto-healing no dia 21/08 (simulando delta inicial de R$ 1.899,78 e auto-regularização para -R$ 0,22)
- [x] [TEST] Executar `npm run build` para garantir zero erros de TypeScript e compilação Nitro
