# Proposal: Resilient Mixed Cell OS Parser (171)

## Problema
O parser de OS (`useOsImportProcessor.ts`) possui um fallback customizado de `parseValue` que tenta converter strings para números usando `parseFloat`. No entanto, quando as planilhas contêm textos misturados com números na mesma célula (ex: `"Pago no PIX 1.500,00"` na coluna de Valor Pago), o `parseFloat` retorna `NaN`. Isso faz com que todo o faturamento da OS e o valor do Pátio sejam zerados, afetando os cards da UI e a tabela `reconciliations`.
Além disso, se a menção à forma de pagamento (PIX, Cartão) estiver na coluna de Valor Pago e não na coluna de Forma de Pagamento, o parser não reconhece a forma de pagamento corretamente.

## Solução Proposta
1. Substituir o frágil `parseValue` interno pelo robusto `extractNumber` de `numberUtils.ts`, que usa regex para limpar e extrair os números de qualquer string (ex: "PIX R$ 1.500,00" vira `1500`).
2. Ampliar a varredura de "Forma de Pagamento": concatenar o texto da coluna de Valor Pago com a coluna de Forma de Pagamento ao buscar por termos-chave (PIX, Crédito, Débito). Assim, se a célula disser "Pago PIX 1500", ele saberá que o método é PIX e o valor é 1500.

## Contratos de Dados
Nenhuma tabela nova será criada. A mudança ocorre apenas no parse das planilhas em memória antes de salvar via RPC.

## API / Interface
- `useOsImportProcessor.ts`: importar `extractNumber` e atualizar `parseValue`.
- Modificar `payment_method_str` para incluir também o conteúdo textual das colunas de pagamento.

## Features Existentes Impactadas
- Processamento de OS via `CentralImportWizard.tsx` (Step 3).

## Risco Principal
- **Probabilidade:** Baixa.
- **Impacto:** Parcialmente reversível (importação pode ser re-feita).
- **Mitigação:** Como usaremos `extractNumber`, que já é validado em outras partes do sistema, a estabilidade aumenta.
