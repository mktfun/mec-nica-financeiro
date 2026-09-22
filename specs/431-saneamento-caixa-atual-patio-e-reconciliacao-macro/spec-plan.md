# Spec Plan — Spec 431: Saneamento do Caixa Atual, Pátio e Reconciliação Macro (21/09 e 22/09)

> [!IMPORTANT]
> **REGRAS ESTRITAS:**
> - ZERO novas RPCs.
> - ZERO novas funções no SQL ou frontend.
> - Estritamente atualizar os registros existentes de dados (`patio_os`, `daily_snapshots`) e calibrar o código existente.

---

## Tasks Sequenciais

- [x] Task 1: [DB/SANEAMENTO] Sanear as 4 OSs Existentes em `patio_os` <!-- id: 1 -->
  - Executar UPDATE direto nas linhas existentes da tabela `patio_os`:
    - `UPDATE patio_os SET status = 'finalizada' WHERE os_number IN ('596', '1856', '1818');`
    - `UPDATE patio_os SET status = 'pago_parcial', paid_value = 3500 WHERE os_number = '4421' AND store_id = 'st-04';`
  - Atualizar `total_patio` nos snapshots de 21/09 (R$ 42.198,47) e 22/09 (R$ 68.152,06) para bater 100% com os 10 arquivos `*_ConferenciaOSxFinanceiro.xls`.
  - Critério de verificação: Script node confirmando que a query de OSs abertas em `patio_os` soma exatamente R$ 68.152,06.

- [x] Task 2: [DB/CONTINUIDADE] Equalizar Continuidade de Caixa Atual (21/09) e Caixa Anterior (22/09) <!-- id: 2 -->
  - Atualizar o snapshot de 22/09 para que `caixa_anterior` seja exatamente igual ao `caixa_atual` de 21/09 (R$ 229.061,74), eliminando o desvio de R$ 1.960,00.
  - Recalcular `fluxo_caixa` de 22/09: `158.783,49 - 229.061,74 = -70.278,25` (em vez de `-72.238,25`).
  - Recalcular `valor_disp_contas` de 22/09: `67.326,78 - (-70.278,25) = 137.605,03`.
  - Critério de verificação: Delta entre `Caixa Atual (21/09)` e `Caixa Anterior (22/09)` igual a R$ 0,00.

- [x] Task 3: [DB/SANEAMENTO] Desduplicar Juros Rede no Snapshot de 21/09 <!-- id: 3 -->
  - Em 21/09, ajustar `contas_base` no snapshot para R$ 75.555,84 (eliminando a duplicidade dos juros de R$ 3.473,84 no subtotal).
  - Recalcular `subtotal_contas` = `75.555,84 + 3.473,84 = 79.029,68` e a diferença de fechamento de 21/09.
  - Critério de verificação: Subtotal de contas do snapshot de 21/09 bate exatamente R$ 79.029,68.

- [x] Task 4: [SECURITY/TEST] Terminal Gate & Build Check <!-- id: 4 -->
  - Executar `npm run build` garantindo zero erros de compilação.
  - Critério de verificação: Terminal com exit code 0.
