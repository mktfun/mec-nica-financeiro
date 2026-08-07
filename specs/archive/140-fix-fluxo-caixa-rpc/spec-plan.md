# Spec Plan: Consertar Motor do Dashboard Global (140-fix-fluxo-caixa-rpc)

- [ ] [BACKEND] Criar nova migration Supabase (ex: `20260807000013_fix_dashboard_metrics.sql`)
- [ ] [BACKEND] Reescrever a função `get_dashboard_metrics` para extrair variáveis globais (Faturamento, Contas OFX) fora do loop das lojas.
- [ ] [BACKEND] Atualizar a fórmula matemática do Fluxo de Caixa conforme a escolha do usuário (ex: `Fluxo = Entradas - Saídas`).
- [ ] [BACKEND] Aplicar a migration no banco de dados.
- [ ] [TEST] Atualizar a página de dashboard no frontend e validar que o Valor Disp. Contas e o Fluxo de Caixa estão coerentes.
