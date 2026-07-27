# Design: Teste Granular N:1 (Múltiplas Transações de Maquininha/OS -> 1 Único Depósito OFX/PIX) (granular-n-to-one-matching-test)

## Fluxo de Teste Granular N:1 (Maquininha/OS x Depósito Único OFX)

```
[Múltiplas Mini Vendas (N)]
  - Venda 1: R$ 15,50
  - Venda 2: R$ 24,50
  - Venda 3: R$ 40,00     ===> Total Bruto: R$ 100,00 (- R$ 5,00 MDR) ===> Líquido: R$ 95,00
  - Venda 4: R$ 10,00
  - Venda 5: R$ 10,00
                                                                            |
                                                                            v
                                                             [1 Depósito Único no OFX]
                                                                - Crédito: R$ 95,00
                                                                            |
                                                                            v
                                                       [Algoritmo Subset Sum + IA Background]
                                                                            |
                                                                            v
                                                             [Pareamento N:1 Confirmado]
                                                             (Agrupa as 5 vendas ao crédito)
```

## Casos de Teste Granulares

1. **Caso A (5 Vendas Maquininha -> 1 Depósito Líquido OFX):**
   - 5 transações de cartão com valores centavados fracionados pareando com 1 linha de extrato bancário.
2. **Caso B (4 Lançamentos PIX em OS -> 1 Depósito Único PIX OFX):**
   - 4 pagamentos fracionados de OSs diferentes que caíram no mesmo lote de PIX bancário.
3. **Caso C (1 OS -> 3 Cartões de Crédito Diferentes):**
   - 1 OS de valor elevado fracionada em 3 parcelas de cartões de débito/crédito.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Batimento de Soma Subset Sum):**
  - *Ação:* Injetar as N mini transações e o 1 depósito único.
  - *Resultado Esperado:* A função `findExactSubsetMatch` localiza o conjunto exato de N itens cuja soma é igual ao valor do depósito (descontada a taxa de MDR/Juros).
- **Cenário 2 (Intervenção da IA em Casos Complexos):**
  - *Ação:* Se o número de itens exceder a profundidade direta ou possuir variações de data D+1/D+2.
  - *Resultado Esperado:* A IA em background é acionada, gera o log em `ai_execution_logs` e registra os vínculos em `conciliation_matches` com `confidence >= 90%`.
- **Cenário 3 (Purga Implacável de Dados):**
  - *Ação:* Concluir a validação e rodar a rotina de limpeza.
  - *Resultado Esperado:* O banco de dados retorna a 0 registros fictícios.
