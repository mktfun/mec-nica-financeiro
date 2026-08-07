# Design: Consertar Motor do Dashboard Global (140-fix-fluxo-caixa-rpc)

## Arquitetura de Cálculos Globais (RPC `get_dashboard_metrics`)

A nova estrutura do RPC deve separar a agregação de dados **Globais** da agregação de dados **Por Loja**. 

### 1. Variáveis Globais (Cálculo Direto)
Em vez de acumular variaveis globais dentro do `FOR store_record`, faremos consultas diretas considerando `store_id IS NULL` ou ignorando o `store_id` (para pegar tudo).

- **Faturamento Atual (`v_faturamento_atual`)**: 
  `SELECT SUM(amount) FROM transactions WHERE target_date = p_date AND type = 'in'`
- **Contas a Pagar Globais (`v_contas_a_pagar_ofx`)**:
  `SELECT ABS(SUM(amount)) FROM transactions WHERE target_date = p_date AND type = 'out'`
- **Total de Contas (`v_contas_a_pagar`)**:
  `v_contas_a_pagar_ofx` + `v_contas_a_pagar_manual` (vindo do snapshot)
- **Saldo Bancário Total (`v_saldo_total`)**:
  Para o saldo, como é um valor absoluto por loja e global (se houver), faremos:
  Pegar a soma do último saldo de cada store + o último saldo com `store_id IS NULL`.

### 2. Cálculo Real-Time do Dia Anterior
Para garantir que o Fluxo de Caixa funcione independente de cronologia de uso do app:
```sql
v_date_anterior := p_date - interval '1 day';

-- Puxar Snapshot Manual de ontem
SELECT COALESCE(dinheiro_mp, 0), COALESCE(a_receber_manual, 0), COALESCE(saldo_negativo_itau, 0)
INTO v_dinheiro_mp_ant, v_a_receber_manual_ant, v_saldo_negativo_itau_ant
FROM daily_snapshots WHERE date = v_date_anterior;

-- Puxar Patio de Ontem (veículos que não estavam finalizados ontem)
-- Simplificação: Usar o mesmo valor de hoje ou assumir o fluxo de variação.
-- Como o pátio é dinâmico, vamos simplificar o Fluxo de Caixa para ser focado no Saldo + Espécie:
```
**Refinamento do Fluxo de Caixa (Business Logic):**
O Fluxo de Caixa deve representar o dinheiro que *transitou*.
Para evitar cálculos astronômicos (Caixa de hoje = 200k, Caixa de Ontem = 195k -> Fluxo = 5k), que requerem cálculos pesados de D-1 para pátio (que não guarda histórico diário), vamos oferecer o fluxo como a verdadeira matemática financeira:
`Fluxo de Caixa (Real) = Faturamento Atual (Entradas) - Contas a Pagar (Saídas Reais OFX) - Juros Rede`
Isso reflete o que o usuário disse: "Contas não tá vindo as saídas do ofx junto com o juros".

Portanto:
`v_fluxo_caixa = v_faturamento_atual - (v_contas_a_pagar_ofx + v_juros_rede)`

### 3. Diferença Disponível
`v_diferenca = Caixa Atual + Fluxo de Caixa - Contas Futuras` (se houver). Ou apenas exibir o Fluxo. O usuário mencionou: "Faturamento + Fluxo de Caixa". Ajustaremos a fórmula conforme o código exija.

## Verificações
- SCAN: O `get_dashboard_metrics` é a única fonte do Global Dashboard.
- INFER: Separar escopo global de escopo de loja corrige a omissão de OFX Globais.
- VERIFY: Ao final, `Valor Disp. Contas` deve refletir a matemática corretamente.
