# Design Document — Spec 242: Correção dos Cálculos da Conciliação e Modais de Drill-Down

## Contexto e Problema
Na conciliação financeira do dia 19/08 (e subsequentes), observavam-se divergências críticas:
1. O Faturamento do Dia mostrava `-R$ 0,82` devido à subtração de odômetros acumulados gravados sem a devida atualização diária no snapshot.
2. O card "Na Loja OS" não permitia ao operador visualizar quais ordens de serviço compunham o somatório nem editar valores divergentes.
3. Os modais de vinculação de OS (`ManualMatchOsModal` e `LinkOfxToOsModal`) eram renderizados com largura reduzida (`size="md"` padrão), tornando a visualização espremida.

## Arquitetura das Soluções

### 1. Faturamento Inteligente (Odômetro vs Diário)
- Implementado em `ResumoDiaPanel.tsx`:
  - Se o input for maior que `faturamentoAnteriorGlobal`, assume-se que é o **Odômetro Acumulado** (`faturamentoLiquidoDia = input - faturamentoAnteriorGlobal`).
  - Se o input for menor que `faturamentoAnteriorGlobal` (e maior que 0), assume-se que é o **Faturamento do Dia** diretamente, calculando o odômetro correspondente para gravação.

### 2. PatioOsDetailModal (Drill-Down e Edição Inline)
- Componente `src/components/conciliacao/PatioOsDetailModal.tsx`:
  - Visualização com filtros por filial e busca por placa/OS/cliente.
  - Edição inline direta de `total_value`, `paid_value` e `status` no banco `patio_os`.
  - Invalidação automática de queries do React Query para recálculo instantâneo na UI.

### 3. Padronização 2XL de Modais de Conciliação
- `ManualMatchOsModal.tsx` e `LinkOfxToOsModal.tsx` ajustados para `size="2xl"` com tabelas ampliadas (`max-h-[460px]`).

## Estrutura de Validação Oficial (19/08)
- **Saldo Bancos + Não Entrou:** R$ 152.608,71
- **Dinheiro MP:** R$ 8.466,00
- **A Receber:** R$ 10.694,50
- **Na Loja OS:** R$ 100.153,69
- **Caixa Atual:** R$ 271.922,90
- **Caixa Anterior (18/08):** R$ 316.215,85
- **Fluxo de Caixa:** -R$ 44.292,95
- **Faturamento do Dia:** R$ 73.813,07
- **Valor Disp. Contas:** R$ 118.106,02
- **Valor das Contas:** R$ 118.106,68 (Contas R$ 114.568,15 + Juros R$ 3.177,07 + Devoluções R$ 361,46)
- **Diferença Final:** -R$ 0,66 (Aprovado ✅)
