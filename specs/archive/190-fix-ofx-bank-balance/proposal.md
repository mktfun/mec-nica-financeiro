# Proposal: fix-ofx-bank-balance-and-os-pending-values (190)

## Problema
Dois problemas críticos de cálculo estão inflando artificialmente os saldos das lojas e dos painéis de conciliação:
1. **Extrator do Saldo OFX (`bankBalance` / `<BALAMT>`)**: Valores em dízimas decimais (ex: 13093.22) estão sendo higienizados de forma incorreta e convertidos como se fossem centavos literais (multiplicando o saldo por 100), resultando em 1.3 milhão no banco de dados. 
2. **Somatório de "Na Loja OS"**: A agregação do saldo pendente no pátio está somando valores de OSs históricas que já foram pagas/finalizadas, pois as CTEs SQL não filtram explicitamente as OSs pelo `status` de em aberto, baseando-se apenas numa diferença bruta `(total_value - paid_value) > 0`, que falha quando os valores da implantação Marco Zero estão dessincronizados.

## Solução Proposta
1. **Correção do Parser OFX (`src/lib/parsers/ofxParser.ts`)**: Adicionar uma conversão segura de precisão especificamente para o campo `<BALAMT>`. Caso o banco envie o número sem ponto ou vírgula mas que logicamente represente centavos (raro), o sistema deve dividir por 100. Valores com `.` explícito serão mantidos em sua escala original e parseados usando as utilidades de ponto flutuante.
2. **Refatoração CTE "Na Loja OS"**: Atualizar a migration recente (e as RPCs `calculate_daily_conciliation` e `get_dashboard_metrics`) para injetar um filtro rigoroso de `status`: `LOWER(status) IN ('em_aberto', 'pago_parcial', 'pendente')` ou `NOT IN ('finalizada', 'pago', 'cancelada')`. OSs finalizadas terão peso 0 sumariamente, independentemente da discrepância entre `total` e `paid`.
3. **Migration de Sanitização**: Limpar o rastro de dados incorretos da tabela `reconciliations` e `conciliation_daily_logs`, retrocedendo `bank_total` nos dias afetados (dividindo por 100 os saldos corrompidos, se necessário) e recalculando os históricos, garantindo a idempotência.

## Contratos de Dados
- **Tabelas Afetadas:** Nenhuma alteração estrutural no schema. Apenas mutação (UPDATE) para corrigir dados incorretos em `reconciliations` (coluna `bank_total`) e `conciliation_daily_logs`.
- **Validação RPC:** A CTE `patio` filtrará restritamente por `status`.

## API / Interface
- **Parser OFX (`ofxParser.ts`)**: Lógica condicional para divisão de centavos na variável `balNum`.
- **Supabase RPCs**: `calculate_daily_conciliation` e `get_dashboard_metrics`.

## Features Existentes Impactadas
- Os painéis `conciliacao.index`, `conciliacao.loja`, e o dashboard global do Marco Zero refletirão as quedas imediatas de valores para o patamar real (na casa dos milhares, e não milhões).

## Risco Principal
- **Probabilidade:** Média
- **Impacto:** Reversível
- **Mitigação:** Como aplicaremos um divisor de sanitização retrospectivo em saldos já gravados no banco de dados, devemos ter cuidado para não dividir por 100 saldos que já estão corretos (como o da loja Kennedy, que possuía valor inteiro e entrou corretamente como 4585). Faremos a sanitização de forma explícita via script SQL (UPDATE) com filtro para saldos absurdamente grandes (ex: `> 1000000`).
