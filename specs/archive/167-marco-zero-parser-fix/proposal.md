# Proposal: Correção Estrutural do Parser Marco Zero (167)

## Problema
O parser implementado na Spec 166 assumiu que a primeira coluna não vazia de cada linha era automaticamente um "Nome de Loja", a menos que fosse a palavra "Loja" ou "Totais". Como o Excel real coloca os "Tipos de Saldo" (ex: "Saldo Banco Itaú", "Limite", "Cartão Débito") na mesma coluna (Coluna B) em que ficam os nomes das lojas, o sistema criou "lojas fantasmas" para cada tipo de conta.
Além disso, os valores financeiros reais estão localizados na Coluna D (índice 3), associados a esses rótulos.

## Solução Proposta
Refatorar o loop de parsing do `marcoZeroParser.ts` para usar uma máquina de estados (`currentStore`):
1. **Identificação Estrita de Loja:** Ao ler a Coluna B, só iniciamos um novo bloco de loja se o texto bater estritamente com os nomes mapeados na nossa lista oficial (`REDE_STORE_MAPPING`).
2. **Acúmulo de Dados:** Se a linha não for um nome de loja conhecido, mas tivermos uma loja "aberta" (um `currentStore` definido na iteração), nós checamos se essa linha contém os rótulos alvo ("DINHEIRO MP", "A RECEBER", "NEGATIVO", "CAIXA").
3. **Mapeamento de Coluna Correto:** Os valores serão puxados da Coluna D (índice 3), conforme instruído.

## Contratos de Dados
- Nenhuma alteração nas tabelas do Supabase. A saída `MarcoZeroExtraction` permanece a mesma.

## API / Interface
- **`src/lib/parsers/marcoZeroParser.ts`**: Alteração exclusiva no algoritmo interno de iteração das planilhas. O hook `useStores` ou `storeMapping.ts` fornecerá os nomes de lojas válidas para ancoragem.

## Features Existentes Impactadas
- **Implantação de Saldo Inicial (Marco Zero Global)**

## Risco Principal
- **Probabilidade**: Alta (Novos padrões desconhecidos no Excel podem surgir).
- **Impacto**: Parcialmente reversível (Lojas ficam sem saldos mapeados).
- **Mitigação**: Manteremos a lógica de fallback iterativa. Se uma nova loja for adicionada à planilha mas não estiver no `REDE_STORE_MAPPING`, o parser pode ignorá-la. Solução é usar uma função de "fuzzy strict" que permita match se tiver as palavras "Santo André", "Kennedy", etc.
