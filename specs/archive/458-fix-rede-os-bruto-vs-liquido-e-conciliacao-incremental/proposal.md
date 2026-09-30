# Spec 458 — Fix Rede × OS: Bruto vs Líquido + Arquitetura de Conciliação Incremental

## Problema

Dois bugs correlacionados identificados:

### Bug 1: Matcher Rede × OS usando valor LÍQUIDO ao invés de BRUTO

No `autoMatchingEngine.ts` (L272), a variável `amount` que é persistida em `resolvedMatches` e em `unmatchedTransactions` prefere o `net_amount` ao invés do `gross_amount`:

```ts
const amount = net > 0 ? net : gross;  // BUG: prioriza líquido
```

Enquanto os Tiers 1, 2 e 3 (L291, L310, L330) comparam corretamente contra `gross`, o `amount` que vai para o output prioriza líquido.

Adicionalmente, no `Fase2RedeVsOsReview.tsx`:
- L106: `amount: Number(c.net_amount || 0)` — monta o `amount` da colisão com líquido ao invés de bruto.
- L131: `.order('net_amount', { ascending: false })` — ordena lista POS por líquido.
- L140: `net_amount: Number(p.net_amount || 0)` — monta lista visual com líquido.

No `CentralImportWizard.tsx`:
- L1145: `amount: Math.abs(Number(t.net_amount || t.gross_amount || 0))` — exibe transações pendentes com líquido.
- L1575: `amount: item.netAmount || 0` — salva `net_amount` no campo `amount` da tabela (correto para o campo `amount` legado, mas o `gross_amount` é populado via L1576).

**RPC canônica (`get_rede_os_eligible_candidates`, `match_stage2_rede_os`):** ✅ Correta — compara `v_pos.gross_amount` contra deltas da OS. Sem bug no banco.

**RPC `link_manual_rede_to_os`:** ✅ Correta — usa `COALESCE(p_amount, v_pos.gross_amount, v_pos.net_amount)`.

### Bug 2: Conciliação Incremental de Pagamentos de OS (Arquitetura)

Documento `arquitetura-conciliacao-os-rede.md` descreve que o sistema atual compara o saldo ACUMULADO da forma de pagamento contra a venda da adquirente, quando deveria comparar apenas o DELTA (incremento do dia):

```
pagamento_novo = valor_acumulado_atual - valor_acumulado_anterior
```

Este é um problema de **arquitetura** de médio/longo prazo que afeta cenários como:
- OS com pagamentos parciais em dias diferentes
- Múltiplos pagamentos da mesma forma no mesmo dia (indistinguíveis com snapshots)
- Deltas negativos (correções, trocas de forma)

**Decisão pragmática:** O Bug 2 (conciliação incremental) é uma refatoração arquitetural significativa que exige novas tabelas (`os_payment_snapshot`, `os_payment_delta`), nova lógica de importação e novo motor de conciliação. A implementação ATUAL já trabalha com `os_import_observations` que funciona como um proto-snapshot. **Este spec aborda apenas o Bug 1 (bruto vs líquido) e registra o Bug 2 como decisão arquitetural para spec futura.**

## Solução Proposta

Corrigir todos os pontos no frontend onde `net_amount`/`netAmount` é usado como valor de comparação ou exibição principal para a conciliação Rede × OS, substituindo por `gross_amount`/`grossAmount`.

## Skills Especializadas Aplicadas

- `backend-patterns` (verificação de contrato de dados)
- `database` (confirmação de que as RPCs já usam bruto)

## Arquivos Afetados

### [Modificados]
1. `src/lib/matchers/autoMatchingEngine.ts` — L272: inverter prioridade de `amount`
2. `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx` — L106, L131, L140: trocar referências de `net_amount` para `gross_amount`
3. `src/components/importacoes/CentralImportWizard.tsx` — L1145: trocar fallback para `gross_amount || net_amount`

### [Novos]
- Nenhum.

## Evidência e Decisão

| Caminho | Símbolo | Ação | Motivo | Verificação |
|---------|---------|------|--------|-------------|
| `autoMatchingEngine.ts:L272` | `const amount = net > 0 ? net : gross` | Editar → `const amount = gross > 0 ? gross : net` | Comparação de conciliação deve usar bruto | Build + E2E |
| `Fase2RedeVsOsReview.tsx:L106` | `amount: Number(c.net_amount \|\| 0)` | Editar → `c.gross_amount` | Colisões devem exibir bruto | Build |
| `Fase2RedeVsOsReview.tsx:L131` | `.order('net_amount', ...)` | Editar → `gross_amount` | Ordem por bruto para match | Build |
| `Fase2RedeVsOsReview.tsx:L140` | `net_amount: Number(p.net_amount \|\| 0)` | Manter → campo é net_amount da interface | Exibe líquido na lista para informação | N/A |
| `CentralImportWizard.tsx:L1145` | `t.net_amount \|\| t.gross_amount` | Editar → `t.gross_amount \|\| t.net_amount` | Transações pendentes devem mostrar bruto | Build |
| RPCs `get_rede_os_eligible_candidates`, `match_stage2_rede_os` | `v_pos.gross_amount` | Reutilizar → já correto | Banco usa bruto | N/A |

## Plano de Rollback

- Reverter os 3 arquivos tocados via `git checkout HEAD -- <arquivo>`
- Sem DDL, sem migration, sem risco de dados

## Risco Principal

- **Risco baixo:** As RPCs do banco já comparam com `gross_amount`. A correção é apenas no frontend/engine em memória.
- **Mitigação:** Todos os Tiers do autoMatchingEngine já comparam contra `gross`. Apenas o `amount` de output e exibição estavam errados.
