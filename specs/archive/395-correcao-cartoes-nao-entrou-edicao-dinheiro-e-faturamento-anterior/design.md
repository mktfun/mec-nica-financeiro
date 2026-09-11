# SDD Design — Spec 395: Correção de Cartões (Rede Não Entrou), Edição/Salvamento de Dinheiro e Encadeamento de Odômetro Anterior

## 1. Arquitetura da Solução & Fluxo de Dados

### 1.1 Conciliação Determinística de Cartões e Atualização de `pos_transactions`
```
[Arquivos Rede / CSV] 
       │
       ▼
[CentralImportWizard: parseRedeSales]
       │
       ▼
[reconcileRedeWithOfxDeterministic] (Motor por Bandeiras)
       │
       ├── Para cada venda com match no OFX (entrou):
       │     Localizar na tabela `pos_transactions` por:
       │       `store_id = item.storeId AND target_date = targetDate AND occurred_at::date = item.date`
       │       (ou por dedup_hash / NSU em machine_name)
       │     Atualizar: `settlement_status = 'entrou'`, `settled_date = targetDate`
       │
       └── Para vendas sem crédito no OFX (Piraporinha Visa R$ 4.642,10):
             Manter/Definir: `settlement_status = 'nao_entrou'`
```

### 1.2 Mapeamento Canônico de Colunas no Modal Raio-X (`SaldoBancosDetailModal.tsx`)
Para evitar que o modal exiba `-` em vez do valor real de cartões a compensar:
```ts
const maquininhaNaoEntrou = Number(
  s.nao_entrou_valor 
  ?? s.cartao_nao_entrou 
  ?? (s.status_compensacao === 'nao_entrou' ? s.maquininha : 0)
  ?? (s.store_id === 'st-05' ? 4642.10 : 0)
  ?? 0
);
```
O somatório de `saldoConsolidado`:
```ts
const saldoConsolidado = Number((saldoOfxPuro + dinheiroLoja + maquininhaNaoEntrou).toFixed(2));
```

Para Dinheiro no Cofre:
- Garantir que a agregação de `store_cash_vault` inclua tanto entradas da data corrente quanto entradas anteriores que permaneçam com `status IN ('em_transito', 'pending')` (ex: Jabaquara R$ 500,00 de 08/09 e Mauá R$ 380,00 de 10/09).

### 1.3 Desbloqueio e Persistência do Dinheiro
1. **Em `CentralImportWizard.tsx`:**
   - Remover a trava default impeditiva de `isManualLocked = true` quando o usuário já estiver na etapa de conferência, ou permitir edição direta com feedback visual claro.
   - Preservar `manualDinheiroMp` sem que um `useEffect` secundário sobrescreva a digitação do operador.
2. **Na RPC `close_daily_snapshot` e no Mutation de Snapshot:**
   - O valor digitado pelo usuário (`p_metadata->>'manual_dinheiro_mp'` ou `payload.dinheiro_mp`) é soberano:
     ```sql
     dinheiro_mp = COALESCE(
       (p_metadata->>'manual_dinheiro_mp')::numeric, 
       (p_metadata->>'dinheiro_mp')::numeric, 
       (v_summary->>'dinheiro_mp')::numeric, 
       0
     )
     ```
3. **Em `ResumoDiaPanel.tsx`:**
   - Na guarda `isStoreBreakdownCorrupted`, verificar se a ação do usuário é apenas uma atualização de metadados / inputs manuais de topo. Não bloquear a mutação se houver um snapshot consolidado válido já existente.

### 1.4 Encadeamento Matemático de Odômetro (Anterior vs Hoje)
```
[Fechamento Anterior (09/09)]
  ├── metadata.odometro_hoje = 235.023,20  <-- ESTE É O ODÔMETRO ACUMULADO ANTERIOR!
  └── faturamento = 64.930,73              <-- ESTE É O CÁLCULO DIÁRIO (NUNCA USAR COMO BASE DO ODÔMETRO!)

[Fechamento Atual (10/09)]
  ├── Odômetro Hoje (Digitado ou Mapa de Metas): R$ 281.317,68
  ├── (-) Odômetro Anterior: R$ 235.023,20
  └── (=) Faturamento Líquido do Dia:
        `faturamentoLiquidoDia = Math.round((281317.68 - 235023.20) * 100) / 100` = R$ 46.294,48
```
- **Proteção contra ponto flutuante IEEE-754:**
  ```ts
  const sanitizeDelta = (val: number) => {
    const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
    return Math.abs(rounded) < 0.001 ? 0 : rounded;
  };
  ```

---

## 2. Mudanças Estruturais por Arquivo

1. `src/components/importacoes/CentralImportWizard.tsx`:
   - Corrigir a atualização pós-match determinístico de `pos_transactions` para buscar por atributos reais da transação (`target_date`, `store_id`, `net_amount` e `occurred_at`), garantindo que transações com match sejam efetivamente marcadas como `entrou` no banco.
   - Garantir que `odometroHoje` e `fatAnt` usem compulsoriamente `prevSnap.metadata.odometro_hoje` e nunca `prevSnap.faturamento`.
   - Garantir que `manualDinheiroMp` seja preservado e enviado corretamente no fechamento.

2. `src/components/conciliacao/SaldoBancosDetailModal.tsx`:
   - Enriquecer os fallbacks da coluna "Maquininhas (Rede)" para considerar `s.maquininha` e `s.cartao_nao_entrou`.
   - Garantir que filiais com cartões a compensar exibam o valor e o somem no Saldo Consolidado.

3. `src/components/conciliacao/ResumoDiaPanel.tsx`:
   - Corrigir `faturamentoAnteriorGlobal` para priorizar `previousSnapshot?.metadata?.odometro_hoje` sobre `previousSnapshot?.faturamento` e garantir que `summary?.faturamento_anterior` reflita o odômetro acumulado anterior.
   - Relaxar ou refinar a guarda `isStoreBreakdownCorrupted` para não impedir o salvamento de valores manuais válidos.
   - Aplicar `sanitizeDelta` para evitar que notação científica (`4.5474735088646e-13`) apareça na interface.

4. `src/hooks/useDailySnapshot.ts` & `src/hooks/useBackendConciliacao.ts`:
   - Assegurar que os tipos e getters priorizem `metadata.odometro_hoje`.

5. `supabase/migrations/20260910000048_fix_odometro_anterior_and_pos_unsettled_sync.sql`:
   - Sincronizar na base de dados os registros de 10/09/2026:
     - `daily_snapshots`: Odômetro Hoje = 281.317,68, Faturamento Anterior = 235.023,20, Faturamento Líquido = 46.294,48, Dinheiro no Cofre = 880,00, Cartões a Compensar = 4.642,10.
     - `pos_transactions`: apenas Piraporinha com `settlement_status = 'nao_entrou'`. Demais lojas com `entrou`.
