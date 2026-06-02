# Design: Juros Progressivo e Importação Idempotente (015)

## Componentes Afetados

1. **`src/hooks/useImportProcessor.ts`**
   - **Algoritmo de Detecção de Juros (Heurística):**
     Será criada uma função utilitária `adjustOsValueForInterest(totalOriginal, totalPago, metodo)` que compara a razão `(totalPago / totalOriginal)`.
     Se a razão bater (com margem de erro mínima de centavos) com as taxas do "Gráfico Progressivo de Juros":
       - 1.105 (5x) a 1.18 (18x) -> Identifica como Juros de Cartão.
       - 0.97 (-3%) -> Identifica como Desconto Débito.
       - 0.94 (-6%) -> Identifica como Desconto PIX.
     Se der match, o sistema atualizará o `total_value` (ou registrará a diferença) de forma que a divergência caia para R$ 0,00.
   - **Idempotência (Evitar Duplicação):**
     Ao inserir na tabela `transactions`, o código irá buscar registros existentes cujo `title` contenha o número da OS importada e a mesma data (`occurred_at`). Se já existir, ele ignorará a inserção (ou atualizará), evitando o "efeito 15k + 16k = 31k".
     Além disso, o `dailySummaries` no loop iterará sob os dados agregando o faturamento, e fará um `upsert` na tabela `import_logs` para sobrescrever os dados do dia, substituindo ao invés de somar cegamente.

2. **Supabase (Tabelas)**
   - Nenhuma tabela nova é estritamente necessária, mas usaremos a busca de duplicatas via `title` (ex: `OS #12345`) no extrato (`transactions`).

## Mapa de Dependências
- Depende diretamente das regras de negócio do "GRÁFICO PROGRESSIVO DE JUROS" anexado na imagem.
- A heurística dependerá de valores aproximados para evitar que centavos de arredondamento caguem a matemática. (ex: tolerância de R$ 1,00).
