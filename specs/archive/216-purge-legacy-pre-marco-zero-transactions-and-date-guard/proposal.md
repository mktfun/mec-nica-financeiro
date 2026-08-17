# Proposal: Limpeza de Dados Pré-Marco Zero e Gráfico de Evolução Diária em 3 Linhas (216)

## Problema
1. **Dados de Testes Pré-Marco Zero:** Existiam 874 transações antigas no banco entre 03/08 e 11/08 geradas antes do Marco Zero (13/08/2026).
2. **Card de Resumo Lateral Estático:** O card lateral abaixo do gráfico de pizza era apenas um bloco de números estáticos. O usuário solicitou um **gráfico de evolução em linhas com 3 curvas**:
   - Linha 1 (Verde): **Entradas** por dia
   - Linha 2 (Vermelho/Coral): **Saídas** por dia
   - Linha 3 (Azul/Ciano): **Saldo / Resultado do Dia**
   - Com legenda explícita e tooltips interativos.

## Solução Proposta
1. **Limpeza Definitiva do Banco de Dados (Purge SQL):**
   - Purgar todas as transações com `target_date < '2026-08-13'`, mantendo estritamente os dados a partir do Marco Zero (13/08) e as conciliações ativas (14/08 em diante).
2. **Novo Componente de Gráfico de Evolução em 3 Linhas (`LojaEvolutionChart.tsx`):**
   - Gráfico de Linhas Recharts (`LineChart`, `ResponsiveContainer`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `CartesianGrid`).
   - 3 Linhas Suaves (`monotone` ou `linear`, `strokeWidth: 2.5`):
     - Curva Verde (`#10b981`): Entradas diárias.
     - Curva Coral (`#f43f5e`): Saídas diárias.
     - Curva Azul (`#3b82f6`): Saldo / Resultado Líquido diário.
   - Legenda rica e tooltips com formatação monetária (R$).
3. **Agregação Diária Otimizada:**
   - Agrupar as transações do período por `target_date` em ordem cronológica para alimentar o gráfico de linhas.
4. **Blindagem de Período no Frontend:**
   - `min="2026-08-13"` e atalho `Tudo` ancorado em `13/08/2026`.

## Contratos de Dados
- **Tabela:** `transactions`
- **Mutações:**
  - `DELETE FROM ofx_transactions WHERE target_date < '2026-08-13';`
  - `DELETE FROM pos_transactions WHERE target_date < '2026-08-13';`
  - `DELETE FROM manual_transactions WHERE target_date < '2026-08-13';`
  - `DELETE FROM reconciliations WHERE date < '2026-08-13';`
  - `DELETE FROM daily_snapshots WHERE date < '2026-08-13';`

## Risco Principal
- **Risco:** Período de 1 único dia renderizar apenas 1 ponto no gráfico de linhas.
- **Probabilidade:** Média.
- **Impacto:** Baixo (Visual).
- **Mitigação:** Exibir pontos com `dot={{ r: 4 }}` para que mesmo com 1 ou 2 dias os pontos fiquem perfeitamente visíveis e interativos.
