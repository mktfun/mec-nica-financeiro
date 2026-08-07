# Design: Semântica do Fluxo de Caixa

## Front-End
Em `src/lib/modulo1Calculations.ts`, alteraremos:
```ts
  // Fluxo CX agora é literalmente o Caixa Anterior (regra de negócio da oficina)
  const fluxo_cx = Number(input.caixa_anterior || 0);

  // Valor disp contas = faturamento + fluxo caixa (Caixa anterior)
  const valor_disp_contas = faturamento + fluxo_cx;

  // Valor contas = juros REDE + contas a pagar + provisão
  const valor_contas = Math.abs(Number(input.juros_rede || 0)) + Math.abs(Number(input.contas_a_pagar || 0));

  // Diferença = Caixa Atual - (Valor Disp Contas - Valor Contas)
  const diferenca = caixa_atual - (valor_disp_contas - valor_contas);
```

Em `src/components/conciliacao/ResumoDiaPanel.tsx`:
Mudar o label "Caixa atual vs Conciliação Anterior" para "Saldo da Conciliação Anterior".
Mudar o label "Faturamento + Fluxo de Caixa" para "Faturamento + Caixa Anterior".

## Back-End
Criar a migration `20260807000016_fix_semantic_fluxo.sql` que dá REPLACE FUNCTION em `get_dashboard_metrics(p_date date)`.
Modificar a equação:
```sql
    -- FLUXO DE CAIXA: Agora reflete diretamente o Caixa Anterior
    v_fluxo_caixa := v_caixa_anterior;
    
    -- DIFERENÇA: Caixa Atual - (Caixa Anterior + Faturamento - Contas)
    v_diferenca := v_caixa_atual - (v_caixa_anterior + (v_faturamento_atual - v_faturamento_anterior) - v_contas_a_pagar);
```
