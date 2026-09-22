# Spec Plan — Spec 427: Correção do Caixa Atual no Auto-Save do Wizard

## Tasks Sequenciais

- [x] Task 1: Atualizar cálculo do Caixa Atual e metadados no Auto-Save do `CentralImportWizard.tsx` <!-- id: 1 -->
  - Mapear `cartoesACompensarTotal` (vendas líquidas da Rede a compensar).
  - Mapear `dinheiroLojaCofreTotal` (dinheiro em trânsito no cofre das lojas).
  - Atualizar `totalSaldoBancoPositivoConsolidado = saldoBancosPositivo + dinheiroLojaCofreTotal + cartoesACompensarTotal - devolucoesRedeTotal`.
  - Recalcular `caixaAtualCalculado`, `fluxoCalculado`, `valorDispCalculado`, `subtotalContasCalculado` e `diferencaCalculada`.
  - Persistir campos canônicos no `payload` e no `metadata` de `daily_snapshots`.

- [x] Task 2: Executar Terminal Gate & Build Check <!-- id: 2 -->
  - Executar `npm run build` garantindo zero erros de TypeScript e compilação limpa.

- [x] Task 3: Sincronizar Snapshot de 18/09/2026 no Banco com os Valores Canônicos <!-- id: 3 -->
  - Atualizar `daily_snapshots` para `date = '2026-09-18'` com `caixa_atual = 234574.15`, `diferenca_final = 0.00`, `status_geral = 'approved'`.
  - Incluir `cartoes_a_compensar: 31840.45` e `dinheiro_lojas: 806.68` nos metadados.

- [x] Task 4: Executar Teste de Auto-Healing & Verificação Forense <!-- id: 4 -->
  - Disparar `public.run_autonomous_reconciliation_loop('2026-09-18')`.
  - Comprovar que `is_conforme = true` e `final_delta = 0.00`.
  - Validar que a conciliação do dia 18/09 fica 100% aprovada e sem resíduos.
