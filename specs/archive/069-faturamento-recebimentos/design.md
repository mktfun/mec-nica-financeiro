# Design Document: Spec 069

## 1. Mapeamento de Dados (Faturamento / Entradas)
O Faturamento passará a espelhar as entradas financeiras (`transactions` onde `type = 'in'`).
Isso representa o valor exato das vendas de Maquininha (Rede) e recebimentos bancários (PIX/OFX) processados no dia.

### 1.1 Modificações em `useDashboardV2.ts`
- **Adicionar Fetch de Entradas Diárias:**
  ```typescript
  supabase
    .from('transactions')
    .select('store_id, amount')
    .eq('target_date', dateAtual)
    .eq('type', 'in')
    .gt('amount', 0)
  ```
- **Adicionar Fetch de Entradas Anteriores:**
  ```typescript
  supabase
    .from('transactions')
    .select('store_id, amount')
    .eq('target_date', dateAnterior)
    .eq('type', 'in')
    .gt('amount', 0)
  ```
- **Modificar Fetch do Histórico Macro:**
  Alterar a query de `historicoContasRes` (que puxava saídas) para puxar TAMBÉM entradas, ou adicionar uma nova promise `historicoEntradasRes`.
  Para o histórico macro:
  ```typescript
  monthDates.length > 0
    ? supabase.from('transactions')
        .select('target_date, amount, type')
        .in('target_date', monthDates)
    : Promise.resolve({ data: [] })
  ```
  Isso otimiza o fetch. Em uma única query, trazemos `type='in'` (Faturamento) e `type='out'` (Contas).

## 2. Processamento dos Dados
- `faturamentoAtualLog` será o `.reduce()` dos amounts das `transactions` diárias (`type='in'`).
- `faturamentoAnterior` será o `.reduce()` dos amounts do dia anterior.
- `fatByStore` será agrupado iterando sobre essas mesmas `transactions`.
- O loop sobre `patioOs` para Faturamento será descartado de vez, deixando o `patioOs` focado exclusivamente na métrica de "A Receber" e "Veículos no Pátio" (status `em_aberto`).
