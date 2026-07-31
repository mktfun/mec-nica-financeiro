# Design: 049 - Refinamento da Conciliação

## Arquitetura de UI (Frontend - Stitch/Shadcn)

### Modificações em `src/routes/conciliacao.tsx`
- **Link dos Cards de Loja:** Alterar o `to={"/loja/" + store.id}` para `to={"/conciliacao/" + store.id}`. E garantir que passa a data no SearchParam ou contexto global da rota se for suportado pelo router. (Ex: `to={`/conciliacao/${store.id}?date=${selectedDate}`}`).
- **Métricas:** Os cards de loja na Home de Conciliação deverão calcular a métrica de DELTA, assim como a "Divergência Global". Para isso, usaremos hooks que busquem a soma de Transações OFX (`in` - `out`) vs Transações Patio/Despesa (`in` - `out`) filtradas por `occurred_at`.

### Nova Rota `src/routes/conciliacao.$lojaId.tsx`
- Layout baseado em *AppShell* como as demais telas.
- Título: "Conciliação Detalhada - {StoreName}".
- Exibirá a "Conciliação 3-WAY" (Triple Match), que foi herdada da antiga aba, mas de forma expandida e primária.
- Um seletor de "Data" fixo que virá pré-preenchido pelo search param `?date=YYYY-MM-DD`.
- Exibirá as abas para o Analista focar apenas no Financeiro: 
  - "Conciliação 3-WAY"
  - "Extrato (OFX)"
  - "Entradas"
  - "Saídas (Contas a Pagar)"
- Aplicar princípios da **ux-ui-architect-2026**:
  - Apple Liquid Glass nos Cards.
  - Tipografia forte e Badges coloridas com alto contraste (WCAG 2.2).
  - Micro-interações ao expandir detalhes ou passar o mouse em transações.

### Modificações em `src/routes/loja.$lojaId.tsx`
- Limpar todo o código de `tab === 'triple-match'`.
- Deixar apenas o dashboard gerencial (Faturamento, Despesas Totais do Mês).
- Remover a complexidade do "Extrato Bancário diário" desta tela se ele agora viverá na tela dedicada de conciliação. Ou se quiser manter, manter apenas o Resumo Mensal genérico. O foco principal é extrair a Conciliação daqui.

## Arquitetura de Banco de Dados (Supabase)
- Nenhuma alteração estrutural nas tabelas é requerida, pois os dados já estão salvos em `transactions` com as chaves `source`, `type`, `amount`, e `occurred_at`.
- Refatoração ocorrerá apenas nos Hooks (`src/hooks/useConciliacao.ts` e afins) para somar os deltas através do Supabase Client. No lugar de buscar o `bank_total` da tabela `reconciliations` genérica (que era o saldo em conta), calcularemos `sum(amount) where type=in` e `sum(amount) where type=out`.
