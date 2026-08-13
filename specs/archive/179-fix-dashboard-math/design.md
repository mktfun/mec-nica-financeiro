# Design: Correção da Matemática Financeira do Dashboard e Conciliação (179)

## 1. Modificações na RPC `get_dashboard_metrics`

A RPC será reescrita para refletir as equações corrigidas. 

### 1.1 `v_a_receber`
**Antes:** `v_a_receber := v_a_receber_manual + v_veiculos_patio_valor;`
**Depois:** `v_a_receber := v_a_receber_manual;` (Desacoplado das OSs do Pátio).

### 1.2 `v_saldo_total` (Saldo Banco Itaú)
**Como é feito:** Dentro do loop das lojas (`FOR store_record IN SELECT id, name FROM stores`), o sistema busca o último `bank_total` daquela loja na tabela `reconciliations` (que é alimentada pelo arquivo OFX).
O `v_saldo_total` é a soma desses valores. Isso está correto, mas vamos remover qualquer desconto artificial de `saldo_negativo_itau`.

### 1.3 `v_caixa_atual`
**Antes:** `v_caixa_atual := (v_saldo_total + v_dinheiro_mp + v_a_receber) - v_saldo_negativo_itau;`
**Depois:** `v_caixa_atual := v_saldo_total + v_dinheiro_mp + v_a_receber;`

### 1.4 Lógica de Diferença
O Dashboard precisa de novos campos para refletir a matemática visual solicitada pelo usuário, ou nós expomos o cálculo via backend e o frontend consome.
A tabela `dashboard_daily_logs` atual NÃO POSSUI as colunas `valor_disp_contas` e `valor_contas`.
No entanto, o frontend (`ResumoDiaPanel.tsx`) já parece calcular essas variáveis internamente (`calculated.valor_disp_contas`, `calculated.valor_contas`).

Vamos modificar o backend para garantir que as bases matemáticas que vão para o frontend (`faturamento_atual`, `fluxo_caixa`, `contas_a_pagar`) estejam cristalinas, para que o cálculo no React:
```typescript
const valor_disp_contas = faturamento_atual - fluxo_caixa;
const valor_contas = contas_a_pagar + juros_rede;
const diferenca = valor_disp_contas - valor_contas;
```
funcione 100% igual ao banco de dados.

No backend:
```sql
v_valor_disp_contas := v_faturamento_atual - v_fluxo_caixa;
v_subtotal_contas := v_contas_a_pagar + v_juros_rede;
v_diferenca := v_valor_disp_contas - v_subtotal_contas;
```

## 2. Unificação de "Na Loja OS" (Pátio Valor)
O bloco de código já existente faz:
```sql
v_veiculos_patio_valor := v_veiculos_patio_valor + v_estoque_valor;
```
Visualmente (e matematicamente), isso será tratado como uma única entidade consolidada de dívida passiva ativa.

## 3. Frontend (`ResumoDiaPanel.tsx`)
Se o componente Frontend estiver fazendo contas redundantes, ele será atualizado para refletir ou consumir diretamente a nova equação `Diferença Final = Valor Disp. Contas - Subtotal: Valor Contas`.
