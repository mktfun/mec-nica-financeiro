# Proposal: restore-previous-parser-and-fix-decimals-and-math (194)

## Problema
A importação dos valores do OFX (R$ 70k) estava quase correta, mas sofria de dois pequenos bugs na precisão e no módulo de cálculo global, que geraram distorções gigantes em iterações recentes.
1. **Parser de Dízimas**: Valores no OFX terminados em uma única casa decimal (como `.9` ou `.5` - ex: Jabaquara R$ 39.851,90 e Kennedy R$ 458,50) eram mal lidos ou descartavam o ponto, alterando sua grandeza na tabela e provocando uma diferença de "uns 30k" no saldo.
2. **Cálculo da Diferença Final (Aberrações Matemáticas)**: A fórmula que fechava a conciliação ("Diferença Final") somava os dois sinais se o `valor_disponivel_contas` já fosse negativo (ex: `-97k - 97k = -195k`), distorcendo o balanço real (que era para ser `-4,85`).

## Solução Proposta
1. **Refatoração Cirúrgica do OFX Parser**:
   - Reverteremos a lógica que causou anomalias extremas e aplicaremos a conversão decimal nativa `parseFloat` e multiplicação tática antes de repassar o valor em centavos.
   - Qualquer número que chega do OFX será higienizado (`replace(',', '.')`) e cravado com `Math.round(parsedFloat * 100) / 100`, resolvendo de forma nativa e limpa os dígitos únicos `.9` e `.5`.
2. **Correção de Sinal na Diferença Final (`modulo1Calculations.ts`)**:
   - Vamos blindar a matemática do dashboard. A `diferenca_final` passará a ser calculada sempre confrontando a magnitude absoluta: `Math.abs(valor_disponivel_contas) - subtotal_valor_contas`. Assim, despesas negativas não se somarão em cascata irreal.
3. **Reset do Snapshot Contaminado**:
   - Nova exclusão via SQL dos dados do dia 11/08 (nas tabelas de daily logs) para garantir o recálculo liso na próxima reimportação.

## Contratos de Dados
- Nenhuma alteração estrutural nas tabelas. O parser fará a conversão exata no Runtime antes do Insert.
