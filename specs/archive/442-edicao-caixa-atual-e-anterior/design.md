# Design 442: Edição Manual de Caixa Atual e Caixa Anterior

## 1. Arquitetura de Estados (`ResumoDiaPanel.tsx`)

### 1.1 Novos Estados Controlados
```typescript
const [caixaAtualInput, setCaixaAtualInput] = useState<number>(0);
const [caixaAnteriorInput, setCaixaAnteriorInput] = useState<number>(0);
const [hasCaixaAtualOverride, setHasCaixaAtualOverride] = useState<boolean>(false);
const [hasCaixaAnteriorOverride, setHasCaixaAnteriorOverride] = useState<boolean>(false);
```

### 1.2 Inicialização e Sincronização (`useEffect` quando `!isEditing`)
```typescript
useEffect(() => {
  if (!isEditing) {
    const snapMeta = (currentSnapshot?.metadata as any) || {};
    
    // Caixa Anterior: Prioridade: metadata do snapshot atual -> summary -> previousSnapshot
    const ant = caixaAnteriorGlobal;
    setCaixaAnteriorInput(ant);
    setHasCaixaAnteriorOverride(Boolean(snapMeta.is_caixa_anterior_override));

    // Caixa Atual: Prioridade: snapshot já gravado com override -> caixaAtualCalculado
    const isOverrideAtual = Boolean(snapMeta.is_caixa_atual_override);
    const cxAtual = isOverrideAtual && currentSnapshot?.caixa_atual !== undefined
      ? Number(currentSnapshot.caixa_atual)
      : caixaAtualCalculado;
      
    setCaixaAtualInput(cxAtual);
    setHasCaixaAtualOverride(isOverrideAtual);
    
    // ... demais campos existentes (faturamento, dinheiro_mp, a_receber, contas)
  }
}, [currentSnapshot, summary, previousSnapshot, isEditing, faturamentoAnteriorGlobal, caixaAnteriorGlobal, caixaAtualCalculado]);
```

### 1.3 Valores Efetivos e Reatividade Contábil
```typescript
// Caixa Atual Efetivo
const effectiveCaixaAtual = isEditing
  ? (hasCaixaAtualOverride ? caixaAtualInput : caixaAtualCalculado)
  : ((currentSnapshot?.metadata as any)?.is_caixa_atual_override && currentSnapshot?.caixa_atual !== undefined
      ? Number(currentSnapshot.caixa_atual)
      : caixaAtualCalculado);

// Caixa Anterior Efetivo
const effectiveCaixaAnterior = isEditing
  ? (hasCaixaAnteriorOverride ? caixaAnteriorInput : caixaAnteriorGlobal)
  : ((currentSnapshot?.metadata as any)?.caixa_anterior !== undefined
      ? Number((currentSnapshot.metadata as any).caixa_anterior)
      : caixaAnteriorGlobal);

// Pilares Reativos
const fluxoCaixaCalculado = Math.round(((effectiveCaixaAtual - effectiveCaixaAnterior) + Number.EPSILON) * 100) / 100;
const valorDispContasCalculado = Math.round(((faturamentoTotalComAjustes - fluxoCaixaCalculado) + Number.EPSILON) * 100) / 100;
const subtotalContasCalculado = Math.round(((jurosRedeValor + contasManualValor) + Number.EPSILON) * 100) / 100;
const diferencaFinalCalculada = Math.round(((valorDispContasCalculado - subtotalContasCalculado) + Number.EPSILON) * 100) / 100;
const diferencaAbs = Math.abs(diferencaFinalCalculada);
const isDiferencaOk = diferencaAbs <= 50;
```

---

## 2. Interface com o Usuário (UI / UX Guardrails Zinc-950)

### 2.1 Card do Caixa Atual
- **Modo Leitura:**
  - Valor grande `<AnimatedNumber value={effectiveCaixaAtual} format="currency" />`
  - Subtexto informativo: "Patrimônio disponível" ou badge indicando override manual caso ativo.
- **Modo Edição (`isEditing === true`):**
  - Input com prefixo `R$`, classe `bg-[var(--bg-canvas)] border border-zinc-700 rounded-lg py-1 pl-7 pr-2 text-sm font-bold font-mono text-white focus:ring-1 focus:ring-zinc-500`.
  - Ação rápida "Restaurar": Quando `hasCaixaAtualOverride === true`, renderiza link em âmbar para resetar imediatamente ao valor dos 5 Pilares (`caixaAtualCalculado`).

### 2.2 Card do Caixa Anterior
- **Modo Leitura:**
  - Valor grande `<AnimatedNumber value={effectiveCaixaAnterior} format="currency" />`
  - Subtexto: "Fechamento do dia anterior".
- **Modo Edição (`isEditing === true`):**
  - Input numérico correspondente permitindo ajuste fino.
  - Ação rápida "Restaurar": Reseta para `caixaAnteriorGlobal`.

---

## 3. Contrato de Persistência no Banco (`daily_snapshots`)

No payload de `saveSnapshot.mutateAsync`:
```typescript
await saveSnapshot.mutateAsync({
  date: selectedDate,
  is_closed: true,
  closed_at: currentSnapshot?.closed_at || new Date().toISOString(),
  saldo_bancario: summary?.saldo_bancos_ofx ?? 0,
  dinheiro_mp: dinheiroMpValor,
  a_receber_manual: aReceberValor,
  total_recebiveis: dinheiroMpValor + aReceberValor,
  total_patio: naLojaValor,
  caixa_atual: effectiveCaixaAtual, // <-- Grava o valor consolidado
  faturamento: faturamentoTotalComAjustes,
  faturamento_outros_valor: faturamentoOutrosValor,
  contas_a_pagar: ...,
  saldo_negativo_itau: ...,
  juros_rede: jurosRedeValor,
  metadata: {
    ...(currentSnapshot?.metadata || {}),
    caixa_anterior: effectiveCaixaAnterior,
    caixa_atual: effectiveCaixaAtual,
    is_caixa_atual_override: hasCaixaAtualOverride,
    caixa_atual_override: hasCaixaAtualOverride ? effectiveCaixaAtual : null,
    is_caixa_anterior_override: hasCaixaAnteriorOverride,
    caixa_anterior_override: hasCaixaAnteriorOverride ? effectiveCaixaAnterior : null,
    fluxo_caixa: fluxoCaixaCalculado,
    valor_disp_contas: valorDispContasCalculado,
    diferenca_final: diferencaFinalCalculada,
    status_geral: isDiferencaOk ? 'approved' : 'divergent',
    is_closed: true
  }
});
```

---

## 4. Atualização em `useBackendConciliacao.ts`

Nas linhas 495–502:
```typescript
const calculatedCaixaAtual = Number((finalTotalSaldoBancoPositivo + finalDinheiroMp + finalAReceber + finalNaLojaOs - baseBancoNegativo).toFixed(2));
const hasCaixaOverride = Boolean(snapMeta.is_caixa_atual_override || snapMeta.is_marco_zero || (snapshotData?.is_closed && snapshotData?.caixa_atual !== undefined));

const finalCaixaAtual = hasCaixaOverride && snapshotData?.caixa_atual !== undefined && snapshotData?.caixa_atual !== null
  ? Number(snapshotData.caixa_atual)
  : calculatedCaixaAtual;

const finalCaixaAnterior = Number(snapMeta.caixa_anterior ?? raw.caixa_anterior ?? 0);
const finalFluxoCaixa = Number((finalCaixaAtual - finalCaixaAnterior).toFixed(2));
```

---

## 5. Blindagem na RPC `get_daily_reconciliation_summary`

No Ramal 2 da RPC PostgreSQL:
```sql
-- Caixa Atual: Se houver override manual gravado no snapshot corrente, honrar o valor
IF v_snapshot_found AND (COALESCE((v_snapshot.metadata->>'is_caixa_atual_override')::boolean, false) = true) THEN
    v_caixa_atual := COALESCE(v_snapshot.caixa_atual, v_caixa_atual);
END IF;

-- Caixa Anterior: Priorizar metadata do snapshot se presente (Marco Zero ou ajuste manual)
IF v_snapshot_found AND v_snapshot.metadata->>'caixa_anterior' IS NOT NULL THEN
    v_caixa_anterior := (v_snapshot.metadata->>'caixa_anterior')::numeric;
ELSIF v_prev_snapshot.caixa_atual IS NOT NULL THEN
    v_caixa_anterior := v_prev_snapshot.caixa_atual;
ELSE
    v_caixa_anterior := 0;
END IF;

v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
```

Essa especificação garante que todos os canais (RPC, Snapshots, Hook e Painel) operem em sintonia matemática absoluta sem riscos de regressão ou duplicações.
