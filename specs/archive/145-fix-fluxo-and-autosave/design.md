# Design: Diferença Matemática e Auto-Save

## Front-End (Matemática e Interface)
Em `src/lib/modulo1Calculations.ts`, alteraremos:
`const valor_disp_contas = faturamento - fluxo_cx;`

Em `src/components/conciliacao/ResumoDiaPanel.tsx`:
- Subtítulo de Valor Disp. Contas para `Faturamento - Fluxo de Caixa`
- Subtítulo de DESPESAS / JUROS: Adicionar tooltip ou texto extra exibindo `OFX Out: R$ {totalOfxOut} | Juros: R$ {juros}`.

## Auto-Save (Import Wizard)
Em `src/components/importacoes/CentralImportWizard.tsx`:
Após toda a promessa de gravação e geração de logs (aproximadamente na linha 530+), injetaremos um bloco automático:
```ts
addLog(`📸 Auto-salvando Fechamento do Dia ${targetDate}...`, "info");
const { data: metrics } = await supabase.rpc('get_dashboard_metrics', { p_date: targetDate });
if (metrics) {
  await supabase.from('daily_snapshots').upsert({
    date: targetDate,
    caixa_atual: metrics.caixaAtual,
    faturamento: metrics.faturamentoAtual,
    dinheiro_mp: 0,
    total_recebiveis: metrics.aReceber,
    total_patio: metrics.veiculosPatioValor,
    saldo_bancario: metrics.saldoTotal,
    a_receber_manual: 0,
    faturamento_outros_valor: 0,
    contas_a_pagar: metrics.contasAPagar,
    provisao: 0,
    saldo_negativo_itau: 0,
    juros_rede: 0,
    updated_at: new Date().toISOString()
  }, { onConflict: 'date' });
}
```

## Back-End (Migration `20260807000017_fix_diferenca_math.sql`)
```sql
    -- DIFERENÇA CORRIGIDA: (Faturamento Hoje) - Fluxo de Caixa - Contas a Pagar
    v_diferenca := (v_faturamento_atual - v_faturamento_anterior) - v_fluxo_caixa - v_contas_a_pagar;
```
