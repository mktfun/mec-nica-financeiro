# Proposal: Correção Emergencial do Pátio OS, Faturamento e Conciliação dos 5 Pilares no Wizard e RPCs (315)

## Problema
Durante o processo de importação e auditoria final no Wizard (Step 7 — Tela D / `Step4FinalAuditAndClose.tsx`), os 5 pilares contábeis apresentam distorções críticas:
1. **Pátio OS (`Na Loja OS`) inflado para R$ 938.815,40** (em vez do saldo real em aberto de ~R$ 62.835,12).
2. **Faturamento do Dia exibindo R$ 0,00** (ignorando o Odômetro da Oficina Inteligente inserido no Step 3).
3. **Diferença Contábil artificial de -R$ 855.357,61** com semáforo em vermelho e bloqueio do operador.

### Causa Raiz Identificada:
1. **Frontend Descompassado (`Step4FinalAuditAndClose.tsx`):** A Tela D consultava a RPC `useDailyReconciliationSummary(targetDate)` no banco antes que o lote fosse gravado no Step 8 (`handleConfirm`), lendo dados não consolidados.
2. **Filtro de Pátio OS no PostgreSQL (`get_daily_reconciliation_summary` e `calculate_daily_conciliation`):** O Ramal Dinâmico somava todas as OSs abertas históricas sem filtrar por saldo devedor real (`total_value - paid_value > 0.05`) e sem priorizar os dados do dia de `reconciliations.na_loja_os`. Além disso, havia um registro corrompido em `patio_os` (OS 18412) gravado com o total do odômetro.
3. **Odômetro no Modo Dinâmico:** A RPC não realizava fallback para calcular `faturamento_oi_base = Odômetro Hoje - Odômetro Anterior` quando o snapshot do dia ainda não estava gravado.

---

## Solução Proposta (Foco em Reuso e Correção)

### 1. Frontend — Cálculo dos 5 Pilares em Memória na Tela D (`Step4FinalAuditAndClose.tsx`) [MODIFY]
- Em vez de depender de uma RPC vazia antes da gravação, a Tela D calculará os 5 pilares diretamente a partir do objeto `results` parseado em memória e dos `manualInputs` (`odometroHoje`, `manualDinheiroMp`, `manualAReceber`, `contasManual`):
  - **Pilar 1 (Saldo Bancos + Cofre):** Soma dos saldos de `results.ofxResults` + cofres em trânsito.
  - **Pilar 2 (Dinheiro MP):** `manualInputs.manualDinheiroMp`.
  - **Pilar 3 (A Receber):** `manualInputs.manualAReceber`.
  - **Pilar 4 (Na Loja OS):** Soma de `total_value - paid_value` das OSs pendentes em `results.osFiles` e `missingOsList`.
  - **Pilar 5 (Faturamento):** `manualInputs.odometroHoje - faturamentoAnterior` (ou faturamento de OSs).
  - **DRE:** `Caixa Atual = Ativos - Cheque Especial`, `Fluxo = Caixa Atual - Caixa Anterior`, `Disp = Faturamento - Fluxo`, `Diferença = Disp - Contas`.

### 2. Backend — Migration PostgreSQL Corretiva [MODIFY]
- Atualizar `get_daily_reconciliation_summary` e `calculate_daily_conciliation`:
  - **Filtro Estrito de Pátio:** Prioriza `reconciliations.na_loja_os` para a data; no fallback de `patio_os`, filtra estritamente `(total_value - paid_value) > 0.05` e `status IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'pendente')`.
  - **Cálculo Dinâmico do Odômetro:** Extrai `odometro_hoje` de `daily_snapshots.metadata->>'odometro_hoje'` ou `faturamento`, deduzindo `faturamento_anterior`.
  - **Limpeza de Registro Corrompido:** Normalizar OS #18412 em `patio_os` para o valor correto (`total_value: 436.60, paid_value: 0`).

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `get_daily_reconciliation_summary`: Será mantida sua assinatura canônica e tipagem `jsonb`, aplicando a correção no Ramal 2 e blindagem no Ramal 1.
  - `calculate_daily_conciliation`: Reutilizada com o filtro estrito de `na_loja_os`.
  - `daily_snapshots`, `reconciliations`, `patio_os`: Nenhuma tabela nova será criada.
- **Componentes / Hooks Existentes Encontrados:**
  - `Step4FinalAuditAndClose.tsx`: Componente existente refatorado para renderizar métricas em memória.
  - `CentralImportWizard.tsx`: Componente orquestrador existente com passagem consistente de props.

---

## Contratos de Dados & SQL (Supabase)
- **Migration `20260831000001_fix_patio_os_filter_and_odometro_calculation.sql`**:
  - `CREATE OR REPLACE FUNCTION get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)`
  - `CREATE OR REPLACE FUNCTION calculate_daily_conciliation(p_date date)`
  - `UPDATE patio_os SET total_value = 436.60, paid_value = 0, status = 'em_andamento' WHERE os_number = '18412' AND total_value > 100000;`

---

## API & Componentes (Frontend)
- **`src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` [MODIFY]**:
  - Recebe `results`, `manualInputs`, `missingOsList`, `mapping`, `targetDate`.
  - Executa `useMemo` para computar os 5 Pilares e a DRE em tempo real.
  - Exibe valores exatos, semáforo em verde e botão de gravação com feedback instantâneo.

---

## Risco Principal e Mitigação
- **Risco:** Divergência entre os números exibidos na Tela D e os números salvos no snapshot após clicar em "Confirmar".
- **Mitigação:** `CentralImportWizard.tsx` (método `handleConfirm`) e `Step4FinalAuditAndClose.tsx` compartilharão exatamente a mesma rotina de cálculo `computeFivePillarsInMemory`, garantindo paridade 1:1 entre o preview e a gravação no PostgreSQL.
