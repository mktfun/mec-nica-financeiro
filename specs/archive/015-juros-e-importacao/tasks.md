# Tarefas: Juros Progressivo e Importação Idempotente (015)

- `[x]` Algoritmo de Heurística de Juros
  - `[x]` Criar utilitário `detectInterestOrDiscount(osValue, paidValue, paymentMethod)` em `useImportProcessor.ts`.
  - `[x]` Inserir a tabela de juros progressivo (5x a 18x) e os descontos de PIX/Débito.
  - `[x]` Implementar margem de tolerância (~0.8%) para evitar problemas com centavos/arredondamento.
  
- `[x]` Integração no Fluxo de Importação (`useImportProcessor.ts`)
  - `[x]` Durante o parse da OS, antes de salvar o `total_value` ou `paid_value`, aplicar o validador de juros.
  - `[x]` Se for detectado Juros, ajustar o `total_value` ao `paid_value`, garantindo que a OS fique sem divergência.
  - `[x]` Anotar no `payment_method` qual taxa foi aplicada (ex: `[Juros 18x (18%)]`).

- `[x]` Idempotência e Duplicações
  - `[x]` Revisar o laço que insere em `transactions`.
  - `[x]` Evitar inserir duplicatas baseadas no `os_number` (busca global, não só por dia).
  - `[x]` Garantir que o `import_logs` utilize UPSERT (onConflict) por data.

- `[x]` Loading Spinner Bonito
  - `[x]` Criar componente `LoadingSpinner.tsx` com animação Framer Motion premium.
  - `[x]` Substituir o SVG tosco do triângulo rodando em TODAS as telas do sistema.
