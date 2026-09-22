# Spec Plan — Spec 429: Auditoria Eliminatória e Saneamento da Conciliação 21/09

## Tasks Sequenciais

- [ ] Task 1: [DB] Sincronizar Caixa Anterior (18/09 SSOT) no Supabase <!-- id: 1 -->
  - Atualizar `daily_snapshots` para `date = '2026-09-18'` com `caixa_atual = 235727.47` e `dinheiro_lojas = 1960.00`.
  - Critério de verificação: Script node verificando que snapshot de 18/09 retorna `caixa_atual = 235727.47`.
  - Skill: `skills/database/SKILL.md`

- [ ] Task 2: [BACKEND] Equalizar Inputs Manuais (Dinheiro MP & Cofre) e Recalcular Snapshot 21/09 <!-- id: 2 -->
  - Alinhar `caixa_anterior = 235727.47` no snapshot de 21/09.
  - Avaliar Dinheiro MP (R$ 31.116 vs R$ 28.316) e status de depósito do cofre (R$ 1.960,00).
  - Recalcular `fluxo_caixa`, `valor_disp_contas` e `diferenca_final`.
  - Critério de verificação: Script node validando o recalculo do snapshot com delta sanado.
  - Skill: `skills/backend-patterns/SKILL.md`

- [ ] Task 3: [BACKEND] Analisar e Categorizar Entradas OFX Não Justificadas em 21/09 <!-- id: 3 -->
  - Verificar os R$ 67.154,38 de créditos OFX não vinculados (transferências internas / adiantamentos).
  - Associar justificativas necessárias para compor o faturamento/ajustes do dia caso aplicável.
  - Critério de verificação: Consulta SQL / Script node em `ofx_transactions`.
  - Skill: `skills/backend-patterns/SKILL.md`

- [ ] Task 4: [SECURITY/TEST] Executar Terminal Gate & Build Check <!-- id: 4 -->
  - Executar `npm run build` garantindo zero erros de compilação e tipagem TypeScript.
  - Critério de verificação: Terminal com exit code 0.
  - Skill: `skills/sdd-apply/SKILL.md`
