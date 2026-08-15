# Proposal: 207-fix-automatic-rede-juros-calculation-on-import

## Problem Statement

Ao processar os 6 arquivos reais de vendas da REDE (`Rede_Rel_Vendas_13_08_2026...`), o parser antigo calculou apenas **`R$ 1.743,61`** de Juros/Taxas. O diagnóstico aprofundado nos arquivos brutos do usuário revelou as causas exatas:

1. **Cabeçalhos de Valor Bruto não mapeados (`redeParser.ts`)**:
   - Os relatórios da REDE utilizam os cabeçalhos `"valor da venda atualizado"` e `"valor da venda original"`. Como a regex antiga procurava apenas por `"bruto"`, a busca falhava e caía em índices estáticos errados (ex: coluna de status `"aprovada"`).
2. **Coluna de Porcentagem confundida com Valor Financeiro (`numberUtils.ts`)**:
   - Quando o parser buscava por `"taxa"`, encontrava a coluna `"taxa MDR"` (ex: `"2.04%"`), e o `extractNumber` convertia para o número `2.04` em vez de buscar a coluna monetária `"valor total das taxas descontadas"` ou calcular a retenção real.
3. **Cálculo da Retenção Real da REDE**:
   - O valor real que a REDE retém por transação é dado por:
     - Prioridade 1: Coluna monetária `"valor total das taxas descontadas (MDR+recebimento automático)"`.
     - Prioridade 2: Soma de `"valor MDR"` + `"valor taxa de recebimento automático"`.
     - Prioridade 3: Diferença exata entre `Valor Bruto - Valor Líquido` (`grossAmount - netAmount`).

## Validação com os 6 Arquivos Reais de 13/08 / 14/08:

Ao rodar o algoritmo inteligente nos 6 arquivos reais fornecidos pelo usuário, os totais exatos apurados por loja foram:
- **DOM PEDRO MP**: Bruto `R$ 5.054,52` | Líquido `R$ 4.911,48` | Juros/Taxas: **`R$ 143,04`**
- **JORGE BERETTA MP**: Bruto `R$ 5.782,50` | Líquido `R$ 4.964,85` | Juros/Taxas: **`R$ 817,65`**
- **REI DO MODULO MP**: Bruto `R$ 1.600,00` | Líquido `R$ 1.453,12` | Juros/Taxas: **`R$ 146,88`**
- **CAP MP (Rudge Ramos)**: Bruto `R$ 3.558,26` | Líquido `R$ 3.231,61` | Juros/Taxas: **`R$ 326,65`**
- **JABAQUARA MP**: Bruto `R$ 3.330,80` | Líquido `R$ 3.025,03` | Juros/Taxas: **`R$ 305,77`**
- **HD MP (Santo André)**: Bruto `R$ 2.035,00` | Líquido `R$ 1.964,57` | Juros/Taxas: **`R$ 70,43`**

📊 **Total Consolidado REDE**:
- **Total Bruto (Vendas)**: **`R$ 21.361,08`**
- **Total Líquido (Banco)**: **`R$ 19.550,66`**
- **Total Juros/Taxas REDE Retidos**: **`R$ 1.810,42`** *(Diferença exata entre Bruto e Líquido!)*

## Proposed Solution

1. Atualizar `src/lib/parsers/redeParser.ts` com reconhecimento robusto de colunas (`valor da venda atualizado`, `valor da venda original`, `valor total das taxas descontadas`, `valor MDR`, `valor taxa de recebimento automático`).
2. Atualizar `src/lib/parsers/numberUtils.ts` para ignorar strings de porcentagem (ex: `"2.04%"` -> `0`) na extração monetária.
3. Garantir que `CentralImportWizard.tsx` consolide e persista os juros totais automaticamente no `daily_snapshots.juros_rede` no momento do fechamento.
