# Proposal 442: Edição Manual de Caixa Atual e Caixa Anterior no Fechamento Diário

## Contexto & Motivação
Atualmente, no fechamento diário da conciliação (`ResumoDiaPanel.tsx`), após a execução das importações (OFX, REDE, Pátio/OS, Contas):
- O **Caixa Atual** é rigidamente calculado pela soma dos 5 Pilares:
  $$\text{Caixa Atual} = \text{Saldo Bancos Positivo} + \text{Dinheiro MP} + \text{A Receber} + \text{Na Loja OS} - \text{Saldo Negativo Itaú}$$
- O **Caixa Anterior** é derivado automaticamente do snapshot do dia útil anterior (`previousSnapshot.caixa_atual`), do Marco Zero ou de `metadata.caixa_anterior`.

Em situações operacionais reais (como no fechamento do dia 24/09), correções de legado, ajustes contábeis manuais ou divergências pontuais de transição exigem que o gestor possa editar diretamente tanto o **Caixa Atual** quanto o **Caixa Anterior** no modo de edição (`isEditing`), salvando o fechamento com esses valores consolidados sem conflitos e com cálculo reativo imediato de todo o fluxo contábil.

---

## Causa-Raiz Diagnosticada
1. **Ausência de inputs de estado em `ResumoDiaPanel.tsx`:**
   - Existem inputs controlados para `faturamentoInput`, `faturamentoDiaInput`, `faturamentoAnteriorInput`, `dinheiroMpInput`, `aReceberInput` e `contasInput`.
   - **Não existem** `caixaAtualInput` nem `caixaAnteriorInput`.
   - No JSX (linhas 1063–1085), os cards de Caixa Atual e Caixa Anterior renderizam apenas tags estáticas `<p><AnimatedNumber /></p>`, impossibilitando a digitação mesmo com `isEditing === true`.

2. **Sobrescrita involuntária no hook `useBackendConciliacao.ts`:**
   - As linhas 495–499 forçam `finalCaixaAtual = calculatedCaixaAtual` a menos que seja especificamente `snapMeta.is_marco_zero`. Se um dia normal for salvo com override de `caixa_atual`, o hook ignora o valor salvo no snapshot e recalcula a partir dos dados brutos.

3. **Lacuna no Ramal 2 da RPC `get_daily_reconciliation_summary`:**
   - No Ramal 1 (dia fechado), a RPC já respeita `v_snapshot.caixa_atual` e `v_snapshot.metadata->>'caixa_anterior'`.
   - No Ramal 2 (dia aberto / rascunho dinâmico), a RPC calcula `v_caixa_atual` dinamicamente e busca `caixa_anterior` apenas em `v_prev_snapshot.caixa_atual`, ignorando overrides salvos previamente no snapshot do dia corrente.

---

## Escopo da Solução

### 1. Frontend: Edição Interativa no `ResumoDiaPanel.tsx`
- Adição dos estados:
  - `caixaAtualInput: number`
  - `caixaAnteriorInput: number`
  - `hasCaixaAtualOverride: boolean`
  - `hasCaixaAnteriorOverride: boolean`
- No modo de edição (`isEditing === true`):
  - Renderizar inputs numéricos estilizados com padrão Zinc-950 (`bg-[var(--bg-surface)]`, `border-zinc-700`, `text-white font-mono`).
  - Botão "Restaurar" caso o usuário queira voltar instantaneamente ao valor derivado automaticamente.
- Reatividade em tempo real:
  - Ao digitar qualquer valor em `caixaAtualInput` ou `caixaAnteriorInput`, os cálculos derivados atualizam instantaneamente:
    $$\text{Fluxo de Caixa} = \text{Caixa Atual} - \text{Caixa Anterior}$$
    $$\text{Disponível para Contas} = \text{Faturamento} - \text{Fluxo de Caixa}$$
    $$\text{Diferença Final} = \text{Disponível para Contas} - \text{Subtotal Contas}$$
- Persistência ao clicar em "Salvar Fechamento":
  - Salva em `daily_snapshots`: `caixa_atual`.
  - Salva em `metadata`: `caixa_anterior`, `caixa_atual`, `is_caixa_atual_override`, `is_caixa_anterior_override`, `fluxo_caixa`, `valor_disp_contas`, `diferenca_final`.

### 2. Hook de Dados: `useBackendConciliacao.ts`
- Respeitar `snapshotData.caixa_atual` quando houver override (`is_caixa_atual_override === true` ou dia fechado com snapshot).
- Respeitar `snapMeta.caixa_anterior` como prioridade sobre fallback anterior.

### 3. Banco / RPC: Migração Postgres para `get_daily_reconciliation_summary`
- No Ramal 2 (dia aberto / dinâmico), verificar se o snapshot atual possui `is_caixa_atual_override = true` e/ou `caixa_anterior` no metadata, garantindo consistência total tanto na RPC quanto no dashboard e tela de conciliação.

---

## Blast Radius & Grafo de Dependências
- **Arquivos a modificar:**
  1. `src/components/conciliacao/ResumoDiaPanel.tsx` (UI de inputs, estados reativos e payload de salvamento)
  2. `src/hooks/useBackendConciliacao.ts` (preservação de override de caixa atual e anterior)
  3. `supabase/migrations/20260925000001_allow_caixa_manual_override_in_rpc.sql` (blindagem da RPC canônica para respeitar overrides salvos em modo rascunho/aberto)
- **Dependências filhas afetadas:**
  - `get_dashboard_metrics` (consome a RPC `get_daily_reconciliation_summary`, herdando automaticamente os valores)
  - `useDailySnapshot` (já suporta gravação no `daily_snapshots` sem necessidade de alteração de schema DDL na tabela)

---

## Verificação & Quality Gate
- Terminal Gate: `npm run build`
- Typecheck: Sem erros de tipagem no payload do snapshot
- Verificação funcional com teste do dia 24/09 (persistência e recálculo reativo de fluxo e diferença).
