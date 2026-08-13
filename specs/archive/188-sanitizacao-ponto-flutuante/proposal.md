# Proposal: Sanitização Global de Ponto Flutuante e Arredondamento Financeiro (188-sanitizacao-ponto-flutuante)

## Problema
O JavaScript, ao manipular valores numéricos em ponto flutuante (IEEE 754), frequentemente gera resíduos decimais em cálculos de soma ou subtração (ex: `2358.5519000000004` ao invés de `2358.55`). Isso resulta em imprecisões no salvamento de transações no banco de dados, especialmente durante as importações e cálculos no frontend (OFX, Rede, Marco Zero). Quando esses valores caem no PostgreSQL e são agregados (SUM), a divergência de micro-centavos pode quebrar a verificação de igualdade (ex: diferenca === 0) na lógica de conciliação.

## Solução Proposta
1. **Frontend (`numberUtils.ts`):** 
   Criar um utilitário base `roundCurrency(value: number): number` usando a fórmula de alta precisão (`Math.round((value + Number.EPSILON) * 100) / 100`).
2. **Pipelines de Importação:**
   Fazer com que a função `extractNumber` passe o resultado final por `roundCurrency`. Adicionalmente, forçar que os cálculos lineares nos parsers (ex: `grossAmount - netAmount` no `redeParser` e conversores no `ofxParser`) invoquem `roundCurrency` para qualquer total derivado.
3. **Backend/Banco de Dados:**
   No PostgreSQL, os tipos `numeric` e `decimal` sem precisão guardam o número exato passado. Como já vamos sanitizar o payload de inserção no client e nas Edge Functions, o Supabase receberá o valor correto (ex: `106.93`). 

## Contratos de Dados
- **Tabelas Envolvidas:** `patio_os`, `conciliation_matches`, `ofx_transactions`, `reconciliations`, `pos_transactions`.
- **Mutações:**
  O tipo dos dados continua `numeric` no Supabase. O contrato apenas estipula que o payload JSON da camada de serviço deve conter numéricos sempre limitados a 2 casas.
  
## API / Interface
- **Modificações em Funções JS/TS:**
  - `src/lib/parsers/numberUtils.ts`: Exportar `roundCurrency(val: number)`. Atualizar `extractNumber` para sempre retornar um valor passado pelo `roundCurrency`.
  - `src/lib/parsers/ofxParser.ts`, `src/lib/parsers/redeParser.ts`, `src/lib/parsers/marcoZeroParser.ts`, `src/lib/parsers/centralImportManager.ts`: Mapear retornos para garantir o arredondamento de totais agregados, garantindo compatibilidade global.

## Features Existentes Impactadas
- **Conciliação e Dashboards (Visor Global):** Impacto altamente positivo (elimina bugs de centavos). As views globais, por lerem as tabelas, refletirão os novos valores perfeitamente sanitizados em 2 casas.
- **Importação Central (`MarcoZeroWizard`, etc.):** As rotinas de parse agora entregarão payloads matematicamente limpos.

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Reversível
- **Risco:** O arredondamento forçado causar diferença intencional contra notas fiscais que usam 3 casas, ou mascarar erros lógicos na importação original do banco/adquirente.
- **Mitigação:** O arredondamento a 2 casas (`.00`) é padrão contábil BRL. Todas as conciliações do sistema possuem limites de tolerância flexíveis ou arredondamento nativo na comparação (ex: `Math.abs(diff) < 0.05`), o que absorve bem o truncamento seguro proposto.
