# Design: 004-Interactive-Mock-Details

## 1. DivisÁo da UI (Componentes)
Vamos expandir o catálogo de UI components adicionando novos modais/dialogs e gráficos usando ferramentas de visualizaçÁo modernas, mas sem backend real.

### Novos Componentes Principais
1. **`CashFlowChart.tsx`:**
   - Usa `recharts`. Gráfico de barras simples, elegante (Cores: Verde `#00a87e` para In, Cinza Escuro para Out). Sem grid lines fortes, tooltips arredondadas e dark.
   
2. **`StoreDetailsSheet.tsx` (ou Dialog):**
   - Um painel lateral (Sheet) ou Modal que surge ao clicar em uma Loja no `/lojas`.
   - Mostrará: Informações do gerente, lista de mecânicos (`Mecânicos da Oficina: JoÁo, Pedro, etc`), histórico dos últimos 5 dias da loja e top divergências.

3. **`AlertResolveDialog.tsx`:**
   - Modal que aparece ao clicar em "Resolver" num alerta.
   - Mostrará as opções falsas: "Justificar Quebra de Caixa", "Vincular a OS Existente", "Ajustar Manualmente". Botões com loading state fake e animaçÁo de sucesso (confete sutil ou checkmark animado).

4. **`ConciliationReport.tsx`:**
   - Um modal expansivo (full-screen ou sheet largo) que surge ao clicar em "Ver Relatório Detalhado". Mostrará o extrato consolidado mockado, com estatísticas do "Motor de ConciliaçÁo".

5. **`SettingsView.tsx` (Rota `/configuracoes`):**
   - Página simples com os toggles de sistema: "Ativar Motor de ConciliaçÁo Automático", "Notificações de Divergência", "SincronizaçÁo Bancária".

## 2. Lógica e Estado
### O Problema do AnimatedNumber
- O componente `AnimatedNumber` atualmente anima do `0` até o `value` toda vez que é montado.
- **SoluçÁo:** Adicionar uma store muito simples usando o estado global do arquivo de módulo ou um contexto, mas como estamos no cliente simples, podemos usar `sessionStorage` (para durar a sessÁo) ou uma variável exportada que age como "cache" de initial load.
- `useInitialLoad.ts`: Hook que retorna `true` apenas nos primeiros N segundos da sessÁo, instruindo o `AnimatedNumber` a usar `duration: 0` se nÁo for o "first load".

## 3. Modelo de Banco de Dados (Mock Supabase Schema)
Embora nÁo vamos conectar agora no Supabase (é tudo MOCK para investidor ver), a estrutura que usaremos no `data.ts` reflete a futura modelagem:
- `Stores` (Lojas): `{ id, name, manager, mechanics (array of strings), osTotal, financialTotal, status }`
- `Alerts` (Alertas): `{ id, storeId, type, description, amount, resolved }`
- `Transactions`: `{ id, amount, type, time, icon }`

## 4. Mapa de Dependências
- `index.tsx` -> Depende de `CashFlowChart`
- `lojas.tsx` -> Depende de `StoreDetailsSheet` e expansÁo de `mock/data.ts`
- `alertas.tsx` -> Depende de `AlertResolveDialog`
- `conciliacao.tsx` -> Depende de `ConciliationReport`
- `AnimatedNumber.tsx` -> Depende de hook `useInitialLoad`
