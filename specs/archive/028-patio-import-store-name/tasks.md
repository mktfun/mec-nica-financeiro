# Tasks 028: Leitura do Nome da Loja na Planilha de Pátio/OS

- [x] **1. Ajuste do Parser (Backend / Hook):**
  - [x] No arquivo `src/hooks/useOsImportProcessor.ts`, ajustar o regex principal ou a lógica condicional dentro do loop de `10` linhas de `data` para capturar relatórios cujo título contenha `[Loja] - Por Data da OS:`.
  - [x] Exemplo de condicional:
    ```javascript
    const match = rowText.match(/(?:LOJA|UNIDADE)\s+([A-Za-zÀ-ÿ0-9\s]+)|(.+?)\s+-\s+Por Data da OS/i);
    if (match) {
      storeAlias = (match[1] || match[2]).trim();
      break;
    }
    ```
- [x] **2. Mapeamento Automático (Frontend):**
  - [x] No arquivo `src/routes/importar-os.tsx`, dentro ou logo após invocar `processOsFiles`, interceptar o `storeAlias` e cruzar com a lista carregada de `stores`.
  - [x] Aplicar normalizaçÁo case-insensitive e desacentuada.
  - [x] Pré-preencher o `mapping` e, se todas as lojas das planilhas importadas forem resolvidas automaticamente, saltar do passo 1 (Upload) direto para o passo 3 (RevisÁo).
