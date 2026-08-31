# Design: Correção Emergencial do Pátio OS, Faturamento e Conciliação dos 5 Pilares no Wizard e RPCs (315)

## Arquitetura e Fluxo de Dados
```
[CentralImportWizard.tsx]
    │  (Armazena results em memória e inputs manuais do Step 3)
    ▼
[Step4FinalAuditAndClose.tsx (Tela D)]
    │  (Calcula os 5 pilares in-memory de results + manualInputs + previousSnapshot)
    │  Pilar 1: Saldo Bancos OFX Líquido (OFXs + Cofre em trânsito)
    │  Pilar 2: Dinheiro MP (manualDinheiroMp)
    │  Pilar 3: A Receber (manualAReceber)
    │  Pilar 4: Na Loja OS (Soma de total_value - paid_value das OSs pendentes)
    │  Pilar 5: Faturamento (Odômetro Hoje - Odômetro Ontem)
    │  DRE: Caixa Atual -> Fluxo -> Disponível -> Diferença Final (<= R$ 50)
    ▼
[Step 8: handleConfirm]
    │  Grava lote no PostgreSQL / Supabase
    ├── reconciliations (grava na_loja_os por loja e bank_total)
    ├── daily_snapshots (grava snapshot com metadata congelado)
    └── patio_os (atualiza status e valores)
    ▼
[RPC PostgreSQL: get_daily_reconciliation_summary]
    ├── Ramal 1 (is_closed = true): Lê snapshot congelado (imunidade a recálculo)
    └── Ramal 2 (is_closed = false): Filtra estritamente OSs abertas (total_value - paid_value > 0.05)
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` [MODIFY]
- Implementar `useMemo` para consolidar em memória:
  - `totalSaldoBanco`, `saldoBancosPositivo`, `saldoNegativoItau` (de `results.ofxResults`).
  - `dinheiroMp` (de `manualInputs.manualDinheiroMp`).
  - `aReceber` (de `manualInputs.manualAReceber`).
  - `naLojaOs` (de `results.osFiles` e `missingOsList`).
  - `faturamentoDia` e `faturamentoPeriodo` (de `manualInputs.odometroHoje - previousSnapshot.faturamento` + ajustes).
  - `caixaAtual`, `caixaAnterior`, `fluxoCaixa`, `valorDispContas`, `subtotalContas`, `diferencaFinal`.
- Substituir a leitura direta de `summary` pela computação in-memory nos cards e no semáforo.

### 2. `src/components/importacoes/CentralImportWizard.tsx` [MODIFY]
- No método `handleConfirm`: assegurar que o payload enviado para `daily_snapshots` contenha o `metadata` completo com todos os campos canônicos (`caixa_anterior`, `fluxo_caixa`, `faturamento_oi_base`, `valor_disp_contas`, `subtotal_contas`, `diferenca_final`).

### 3. `supabase/migrations/20260831000001_fix_patio_os_filter_and_odometro_calculation.sql` [NEW]
- Executar correção SQL em `get_daily_reconciliation_summary` e `calculate_daily_conciliation`.
- Executar limpeza corretiva do registro corrompido de OS #18412 em `patio_os`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Visualização Imediata dos 5 Pilares na Tela D do Wizard
- **SCAN:** Fazer upload dos 27 arquivos de 27-08 no Wizard e avançar até o Step 7 (Tela D).
- **INFER:** Os 5 cards devem refletir exatamente os dados em memória (Saldo Bancos R$ 204k/225k, Dinheiro MP R$ 22.475, A Receber R$ 8.049, Na Loja OS ~R$ 62.835 e Faturamento do Dia R$ 28.833).
- **VERIFY:** Semáforo verde exibindo Diferença Final $\le \pm \text{R\$} 50,00$.
- **FIX:** Confirmar gravação sem erros.

### Cenário 2: Consulta via RPC após Gravação
- **SCAN:** Executar `get_daily_reconciliation_summary('2026-08-28')` no PostgreSQL.
- **INFER:** A RPC deve retornar `is_closed = true`, `na_loja_os = 62835.12`, `faturamento_oi_base = 28833.02` e `diferenca_final = -0.15`.
- **VERIFY:** Visualizar o Cockpit em `/conciliacao` confirmando 10 lojas aprovadas e semáforo verde.
