# Design: Motor de Diagnóstico Pré-Conciliação no Step 3 (264)

## Arquitetura Técnica

```
Step 3 renderiza (step === 3)
  │
  ├─ allPreviewOsList (já calculado — totalPatioEstoqueGlobal, totalOs)
  ├─ totalOfxIn (já calculado)
  ├─ manualDinheiroMp, manualAReceber (estado existente)
  ├─ contasManual (estado existente)
  ├─ isLoadingMissingOs (aguarda false)
  │
  └─► useDiagnosticEngine(inputs) [novo hook]
        │
        ├─ useEffect: quando step===3 && !isLoadingMissingOs
        │    └─ Supabase query → daily_snapshots últimos 5 dias
        │         SELECT saldo_bancario, dinheiro_mp, a_receber_manual,
        │                total_patio, contas_a_pagar, juros_rede, faturamento
        │         WHERE date < targetDate ORDER BY date DESC LIMIT 5
        │
        ├─ useMemo: calcula DiagnosticResult a partir dos inputs + histórico
        │    ├─ projectedCaixaAtual = totalOfxIn + manualDinheiroMp + manualAReceber + totalPatioEstoqueGlobal
        │    ├─ threshold = max(500, historicFaturamentoAvg * 0.02)
        │    ├─ 5 DiagnosticSource (patio, banco, dinheiro, a_receber, contas)
        │    └─ mainSuspect = source com maior |deviation| se > threshold
        │
        └─► DiagnosticPanel [novo componente]
              Renderizado no Step 3, ACIMA dos botões de ação
              Props: { diagnostic, isLoading }
              UI: tabela compacta de auditoria, sem chat, sem bot
```

## Interfaces TypeScript

```typescript
// src/types/diagnostic.ts (arquivo novo)
export type DiagnosticSourceKey = 'patio' | 'banco' | 'dinheiro' | 'a_receber' | 'contas';

export interface DiagnosticSource {
  key: DiagnosticSourceKey;
  label: string;
  currentValue: number;
  historicAvg: number;
  deviation: number;           // currentValue - historicAvg
  deviationPct: number;        // deviation / historicAvg * 100 (Infinity se historicAvg=0)
  status: 'ok' | 'warning' | 'alert';  // ok: |dev|<10%, warning: 10–30%, alert: >30%
}

export interface DiagnosticResult {
  projectedCaixaAtual: number;
  historicCaixaAvg: number;
  projectedDiff: number;       // projectedCaixaAtual - historicCaixaAvg
  threshold: number;           // max(500, historicFaturamentoAvg * 0.02)
  isWithinThreshold: boolean;
  sources: DiagnosticSource[];
  mainSuspect: DiagnosticSource | null;
  hasManualInputMissing: boolean;  // true se dinheiro_mp=0 E a_receber=0
  snapshotDaysUsed: number;    // quantos dias de histórico foram encontrados (0–5)
}

// src/hooks/useDiagnosticEngine.ts (arquivo novo)
export interface DiagnosticEngineInput {
  step: number;
  targetDate: string;
  isLoadingMissingOs: boolean;
  totalOfxIn: number;
  totalPatioEstoqueGlobal: number;
  manualDinheiroMp: number;
  manualAReceber: number;
  contasManual: number;
  jurosRedeTotal: number;  // calculado localmente no wizard a partir de redeResults
}
```

## Componentes / Hooks / Funções

| Artefato | Localização | Responsabilidade |
|---|---|---|
| `useDiagnosticEngine` | `src/hooks/useDiagnosticEngine.ts` | Busca histórico (1 query), calcula DiagnosticResult |
| `DiagnosticPanel` | `src/components/importacoes/DiagnosticPanel.tsx` | Renderiza o card de auditoria no Step 3 |
| `DiagnosticSource[]` types | `src/types/diagnostic.ts` | Interfaces TypeScript — sem lógica |

**Nenhum arquivo existente novo é necessário além da integração no `CentralImportWizard.tsx`.**

## Fluxo de UI (Step 3)

```
[Cards de Resumo: Total OS | Maquininha | Saldo OFX]  ← já existe

[Tabela Unificada de OSs com filtros e edição inline]  ← já existe (Spec 263)

┌─────────────────────────────────────────────────────────────┐
│ AUDITORIA DE FECHAMENTO                    [ícone: escudo]  │ ← NOVO (DiagnosticPanel)
│ Conferência automática antes de confirmar a gravação        │
├──────────────────┬────────────┬────────────┬───────┬────────┤
│ Fonte            │ Este dia   │ Média 5d   │ Var.  │ Status │
├──────────────────┼────────────┼────────────┼───────┼────────┤
│ Pátio (OSs)      │ R$ 88.028  │ R$ 103.023 │ -14%  │   △   │
│ Banco (OFX)      │ R$ 29.501  │ R$ 27.400  │ +8%   │   ✓   │
│ Dinheiro/MP      │ R$ 8.466   │ R$ 8.200   │ +3%   │   ✓   │
│ A Receber        │ R$ 10.694  │ R$ 10.500  │ +2%   │   ✓   │
│ Contas a Pagar   │ R$ 195.066 │ R$ 188.000 │ +4%   │   △   │
├──────────────────┴────────────┴────────────┴───────┴────────┤
│ ⚠ Pátio 14% abaixo da média — verifique OSs ausentes       │
│   ou valores ajustados manualmente antes de confirmar.      │
└─────────────────────────────────────────────────────────────┘

[Previsão por Loja]  ← já existe

[Botão: Confirmar e Gravar Fechamento]  ← já existe
```

### Regras visuais (sem cara de IA):
- Fundo: `bg-zinc-900 border border-zinc-700 rounded-xl`
- Título: `"Auditoria de Fechamento"` — fonte Inter, `text-sm font-semibold text-zinc-100`
- Status icons: CheckCircle (verde `#10b981`), AlertTriangle (âmbar `#f59e0b`), XCircle (vermelho `#ef4444`) — Lucide, tamanho 14px
- Linha de suspeita: fundo `bg-amber-500/10 border border-amber-500/20 rounded-lg` — texto `text-amber-300 text-xs`
- Se `snapshotDaysUsed === 0`: exibir apenas os valores atuais sem comparação, com nota `"Sem histórico suficiente para comparação"` em zinc-400
- Se `hasManualInputMissing`: nota sutil `"Dinheiro/MP e A Receber não preenchidos — diagnóstico parcial"` em zinc-400 itálico
- **Sem gradientes coloridos, sem glassmorphism, sem animações de loading excessivas** — apenas um `opacity-50` no card enquanto `isLoading`

### Lógica de classificação por status:
```typescript
function classifyDeviation(deviationPct: number): 'ok' | 'warning' | 'alert' {
  const abs = Math.abs(deviationPct);
  if (abs <= 10) return 'ok';
  if (abs <= 30) return 'warning';
  return 'alert';
}
```

### Lógica de mainSuspect:
```typescript
// mainSuspect = source com maior |deviation| em R$ absoluto, exceto se isWithinThreshold
const mainSuspect = isWithinThreshold ? null : sources.reduce((max, s) =>
  Math.abs(s.deviation) > Math.abs(max.deviation) ? s : max
);
```

## Cenários de Verificação

- **Cenário 1 — Happy Path:** Todos os arquivos importados, dinheiro_mp=R$8.466, a_receber=R$10.694. Histórico de 5 dias disponível. Variação < 10% em todas as fontes → painel verde, `isWithinThreshold=true`, nenhuma suspeita.

- **Cenário 2 — Pátio divergente:** Planilha de hoje trouxe menos OSs (ex: sem planilha do Planalto). `totalPatioEstoqueGlobal` fica R$14.000 abaixo da média. Painel exibe `mainSuspect = 'patio'`, nota âmbar: "Pátio 14% abaixo da média — verifique OSs ausentes".

- **Cenário 3 — Inputs manuais zerados:** Operador ainda não preencheu dinheiro/MP. `hasManualInputMissing=true`. Painel exibe valores com nota cinza "diagnóstico parcial". Recalcula reativo quando o operador preenche.

- **Cenário 4 — Sem histórico:** Primeiro dia de uso do sistema. `snapshotDaysUsed=0`. Painel exibe apenas os valores atuais sem comparação. Título muda para "Resumo de Fechamento" (sem a comparação histórica).

- **Cenário 5 — Todos os dados zerados (upload só de OFX sem OS):** `totalPatioEstoqueGlobal=0`. O painel exibe 0 para Pátio sem classificar como alerta (sem histórico de comparação para esse dia).
