# Proposal - Filtro de Apurado do Sistema por Data de Ocorrência

## Objetivo
Corrigir a visualização de "Apurado Sistema" (Fechamento do Dia) na tela de Conciliação, garantindo que ela SOME APENAS as transações que efetivamente **ocorreram** no dia selecionado, ignorando transações antigas que vieram na mesma importação.

## Requisitos
1. A função `useDailySystemBalance(targetDate)` deve ser refatorada para filtrar pelas datas reais.
2. Não deve ser usado `.eq('target_date', targetDate)` para as transações de sistema, mas sim o campo `occurred_at`.
3. É preciso extrair o início do dia (`00:00:00.000Z`) e o fim do dia (`23:59:59.999Z`) do `targetDate` para cobrir 100% daquele dia (levando em consideração que as datas estão persistidas como ISO Timestamp no banco).
4. As transações devem ser limitadas e filtradas no banco (usando `.gte` e `.lte`), para não trafegar o banco inteiro pelo payload se houver anos de histórico inserido.
5. Não afetar o fluxo original de ignorar as importações OFX no cálculo de sistema.

## BDD Scenarios

### Cenário: Cálculo de Apurado do Dia Específico
- **Given (Dado):** que a planilha continha 10 ordens de serviço, mas apenas 2 aconteceram no dia `2026-06-09` (total R$ 500,00) e 8 aconteceram ao longo dos anos anteriores (total R$ 198.000,00).
- **When (Quando):** o usuário visualizar a Conciliação para a data `2026-06-09`.
- **Then (Então):** o "Apurado Sistema" da loja exibirá `R$ 500,00` (desprezando os 198k importados do histórico da planilha).
