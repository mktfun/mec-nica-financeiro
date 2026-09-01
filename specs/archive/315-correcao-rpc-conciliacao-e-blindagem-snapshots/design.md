# Design: Correção Crítica da RPC de Conciliação, Cálculo de Faturamento e Blindagem de Snapshots (315)

## 1. Arquitetura e Fluxo de Dados Ponta a Ponta

`
+-----------------------------------------------------------------------------------+
| Frontend: src/routes/conciliacao.index.tsx & ResumoDiaPanel.tsx                   |
| 1. Hook useDailyReconciliationSummary(selectedDate) chama RPC                     |
| 2. Recebe { stores: [...10 lojas com saldos e métricas], faturamento_periodo }   |
| 3. Guarda de Segurança: isStoreBreakdownCorrupted desabilita 'Salvar Fechamento'  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| Backend: RPC get_daily_reconciliation_summary(p_date, p_force_dynamic)            |
| -> Ramal 1 (is_closed = true):                                                    |
|    - Lê dados congelados de daily_snapshots (caixa_atual, faturamento, contas)   |
|    - Computa v_stores_detail a partir de reconciliations(date=v_target_date)     |
|    - RETORNA 'stores' preenchido com as 10 lojas!                                 |
| -> Ramal 2 (is_closed = false ou p_force_dynamic = true):                          |
|    - Computa 5 Pilares ao vivo                                                    |
|    - Odômetro delta: IF odometro >= odometro_anterior THEN odometro - anterior    |
|    - Computa v_stores_detail e v_triple_recon                                     |
|    - RETORNA 'stores' preenchido com as 10 lojas!                                 |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| Backend: RPC close_daily_snapshot(p_date, p_notes, p_metadata)                     |
| -> Executa get_daily_reconciliation_summary(v_target_date, true)                   |
| -> Se stores estiver vazio ou nulo com saldo > 0: RAISE EXCEPTION                 |
| -> Grava daily_snapshots(is_closed = true, metadata com espelho completo)         |
| -> Preserva reconciliations sem zerar bank_total                                  |
+-----------------------------------------------------------------------------------+
`

---

## 2. Interfaces TypeScript (src/hooks/useBackendConciliacao.ts)

`	ypescript
export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  saldo_banco: number;
  saldo_banco_ofx?: number;
  saldo_banco_itau?: number;
  maquininha?: number;
  rede_bruto?: number;
  rede_liquido?: number;
  rede_taxas?: number;
  pix?: number;
  pix_os?: number;
  na_loja_os?: number;
  previsto_ofx?: number;
  faturamento_atual?: number;
  diferenca?: number;
  status?: 'approved' | 'divergence' | 'pending';
  status_compensacao?: 'entrou' | 'parcial' | 'nao_entrou' | 'sem_movimento';
  nao_entrou_valor?: number;
  dinheiro_loja?: number;
}
`

---

## 3. Mutações em Arquivos Existentes [MODIFY]

### 1. supabase/migrations/20260901000002_fix_daily_reconciliation_stores_and_snapshot_guard.sql [NEW MIGRATION]
- Atualizar get_daily_reconciliation_summary para incluir stores em Ramal 1 e corrigir odômetro delta.
- Atualizar close_daily_snapshot com RAISE EXCEPTION de segurança.
- Corrigir snapshot de 01/09/2026 e 31/08/2026.

### 2. src/components/conciliacao/ResumoDiaPanel.tsx [MODIFY]
- Implementar guarda isStoreBreakdownCorrupted bloqueando handleSave e desabilitando botão caso filiais estejam zeradas enquanto consolidado > 0.
- Não sobrescrever 
econciliations com zeros.

### 3. src/routes/conciliacao.index.tsx [MODIFY]
- Robustecer mapeamento de storesList suportando campos de Ramal 1 e Ramal 2 (
ede_liquido ?? maquininha, saldo_banco ?? saldo_banco_itau).

---

## 4. Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

### Cenário 1: Carregamento de Dia Fechado (01/09/2026 e 31/08/2026)
- **Estado Inicial:** Snapshot 2026-09-01 e 2026-08-31 estão com is_closed = true.
- **Ação:** Chamar get_daily_reconciliation_summary('2026-09-01') e calculate_daily_conciliation('2026-09-01').
- **Resultado Esperado:**
  - stores contém 10 objetos (Dom Pedro, Jabaquara, etc.) com saldos preenchidos.
  - aturamento_periodo de 01/09 = R$ 0,00 (pois odômetro não mudou em relação a 31/08).
  - Diferença final compatível com o fluxo real.

### Cenário 2: Tentativa de Salvar Fechamento Inválido com Lojas Zeradas
- **Estado Inicial:** Simular estado onde storesData esteja vazio ou zerado.
- **Ação:** Clicar em 'Salvar Fechamento'.
- **Resultado Esperado:**
  - Botão desabilitado e Toast de erro exibido no frontend.
  - RPC close_daily_snapshot rejeita com RAISE EXCEPTION impedindo gravação nula.
