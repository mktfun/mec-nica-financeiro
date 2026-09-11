# SDD Design: 381-correcao-encadeamento-odometro-faturamento-anterior

## 1. Fluxo de Dados e Arquitetura do Odômetro

### Fluxo Operacional:
```
[Fechamento Anterior (ex: 09/09)]
  ├── metadata.odometro_hoje = R$ 235.023,20  <-- Input do usuário / Mapa de Metas
  ├── metadata.faturamento_anterior = R$ 170.092,47
  └── metadata.faturamento_oi_base = R$ 64.930,73 (Delta líquido de 09/09)
         │
         ▼ (Encadeamento Canônico)
[Importação Hoje (ex: 10/09)]
  ├── Input do Usuário: Odômetro Hoje = R$ 281.317,68
  ├── Leitura do Anterior: previousOdometro = 235.023,20
  │     (Precedência: metadata.odometro_hoje ?? metadata.faturamento_anterior ?? faturamento)
  ├── Cálculo do Delta:
  │     fatOiBase = 281.317,68 - 235.023,20 = R$ 46.294,48
  └── Gravação no Banco:
        ├── daily_snapshots.faturamento = 281.317,68 (Odômetro oficial do mês)
        ├── metadata.odometro_hoje = 281.317,68
        ├── metadata.faturamento_anterior = 235.023,20
        ├── metadata.faturamento_oi_base = 46.294,48
        └── metadata.faturamento_periodo = 46.294,48
```

---

## 2. Interfaces TypeScript e Tipos Reais

### Interface de Metadata do Snapshot:
```ts
export interface DailySnapshotMetadata {
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_anterior: number;     // Odômetro do fechamento anterior homologado
  odometro_hoje: number;            // Odômetro acumulado na data
  faturamento_oi_base: number;      // Delta líquido do dia (odometro_hoje - faturamento_anterior)
  faturamento_ajustes?: number;     // Receitas extras / ajustes DRE
  faturamento_periodo: number;      // faturamento_oi_base + faturamento_ajustes
  faturamento_mes_anterior?: number;// Odômetro acumulado no fechamento do mês anterior
  source_mode?: 'mapa_metas' | 'odometro_os';
  has_os_files?: boolean;
  valor_disp_contas: number;
  subtotal_contas: number;
  diferenca_final: number;
  total_saldo_banco: number;
  saldo_bancos_ofx: number;
  saldo_bancos_positivo: number;
  saldo_negativo_itau: number;
  dinheiro_mp: number;
  a_receber_manual: number;
  total_patio: number;
  status_geral: 'approved' | 'divergent';
  is_closed: boolean;
}
```

### Contrato de Retorno da RPC `get_daily_reconciliation_summary`:
```ts
export interface DailyReconciliationSummary {
  date: string;
  odometro_hoje: number;
  faturamento_anterior: number;
  faturamento_oi_base: number;
  faturamento_periodo: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  valor_disp_contas: number;
  total_saldo_banco: number;
  total_saldo_banco_positivo: number;
  saldo_bancos_ofx: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  contas_manual: number;
  juros_rede: number;
  subtotal_contas: number;
  diferenca_final: number;
  is_closed: boolean;
  stores: any[];
}
```

---

## 3. Módulos a Modificar

### Backend:
1. **Nova Migration SQL `supabase/migrations/20260911000040_fix_odometro_faturamento_anterior_chain.sql`:**
   - **Atualização da RPC `public.get_daily_reconciliation_summary`:**
     - Corrigir a extração de `v_faturamento_anterior`:
       ```sql
       v_faturamento_anterior := COALESCE(
           (v_prev_snapshot.metadata->>'odometro_hoje')::numeric,
           (v_prev_snapshot.metadata->>'faturamento_anterior')::numeric,
           v_prev_snapshot.faturamento,
           0
       );
       ```
     - Corrigir o cálculo de `v_faturamento_oi_base` quando há snapshot:
       ```sql
       v_odometro_atual := COALESCE(
           (v_snapshot.metadata->>'odometro_hoje')::numeric,
           v_snapshot.faturamento,
           0
       );
       IF v_odometro_atual > 0 AND v_faturamento_anterior > 0 AND v_odometro_atual >= v_faturamento_anterior THEN
           v_faturamento_oi_base := v_odometro_atual - v_faturamento_anterior;
       ELSIF (v_snapshot.metadata->>'faturamento_oi_base')::numeric > 0 THEN
           v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_oi_base')::numeric;
       ELSE
           v_faturamento_oi_base := v_odometro_atual;
       END IF;
       ```
     - Adicionar `'odometro_hoje'` explicitamente no JSON de saída do summary.
   - **Atualização da RPC `public.close_daily_snapshot`:**
     - Se `p_metadata->>'odometro_hoje'` for fornecido e > 0, gravar `faturamento = (p_metadata->>'odometro_hoje')::numeric`.
     - Caso contrário, gravar `faturamento = COALESCE((v_summary->>'odometro_hoje')::numeric, (v_summary->>'faturamento_anterior')::numeric + (v_summary->>'faturamento_oi_base')::numeric, 0)`.
     - Garantir que a coluna `faturamento` nunca receba o delta diário isolado quando o odômetro acumulado for conhecido.
   - **Saneamento Histórico (Setembro/2026):**
     - Sincronizar os registros de `daily_snapshots` de 09/09 e 10/09 para que `faturamento = metadata.odometro_hoje` e `metadata.faturamento_anterior` em 10/09 seja R$ 235.023,20.

### Frontend:
2. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - **Linha 1730:** Substituir o `prevSnap?.faturamento || (prevSnap?.metadata as any)?.odometro_hoje` pela precedência canônica:
     ```ts
     const fatAnt = previousOdometro > 0
       ? previousOdometro
       : Number((prevSnap?.metadata as any)?.odometro_hoje ?? (prevSnap?.metadata as any)?.faturamento_anterior ?? prevSnap?.faturamento ?? 0);
     ```
   - **Linhas 1755 e 1774-1778:** Garantir que o payload de save salve o odômetro acumulado no campo `faturamento` e garanta que `metadata.odometro_hoje` seja sempre o acumulado (`odometroHoje > 0 ? odometroHoje : (fatAnt + fatOiBase)`).
   - **Linhas 1897-1901:** Aplicar a mesma precedência canônica no segundo ponto de sincronização de snapshot.
   - **Linha 2013-2017:** No `handleFinalizeClosing`, passar o `odometro_hoje` explícito no `p_metadata` da RPC `close_daily_snapshot`.

3. **`src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:**
   - No bloco de `useMemo` (linhas 118-120), mapear `fatAnterior` priorizando `summary.faturamento_anterior ?? previousOdometro`.
   - Mapear `odometroHoje` para exibição no card de faturamento, mostrando claramente `Hoje: R$ ... | Anterior: R$ ... | Líquido do Dia: R$ ...`.

4. **`src/components/conciliacao/ResumoDiaPanel.tsx`:**
   - Confirmar alinhamento da precedência de `faturamentoAnteriorGlobal` com o padrão unificado:
     ```ts
     const faturamentoAnteriorGlobal = Number(
       summary?.faturamento_anterior 
       ?? (previousSnapshot?.metadata as any)?.odometro_hoje
       ?? (previousSnapshot?.metadata as any)?.faturamento_anterior 
       ?? (currentSnapshot?.metadata as any)?.faturamento_anterior 
       ?? previousSnapshot?.faturamento 
       ?? 0
     );
     ```
