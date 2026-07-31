# Tasks (005-planilha-import-fix)

- [x] **1. Mudar o método de leitura do Excel**
  - [x] No `ImportReportDialog.tsx`, mudar `sheet_to_json<any>(ws)` para `sheet_to_json<any[]>(ws, { header: 1 })`.
- [x] **2. Identificar Índices (Dynamic Column Mapping)**
  - [x] Criar lógica para varrer as primeiras 20 linhas procurando pelo cabeçalho (linha que contenha a palavra 'OS' ou 'Nº OS' e 'Status').
  - [x] Ao achar a linha, preencher um objeto `colMap` guardando as posições exatas (ex: `colMap.dataFim = 5`, `colMap.total = 10`).
- [x] **3. Atualizar Extração de Linhas**
  - [x] Atualizar o loop principal para ignorar linhas acima do cabeçalho.
  - [x] Ler valores baseados nos índices de `colMap` em vez de chaves mágicas `"__EMPTY_X"`.
  - [x] Sanear os valores (ex: remover R$ de colunas financeiras caso existam como string, converter datas corretamente garantindo isolamento da string).
- [x] **4. Build & Test**
  - [x] Fazer build da aplicação, testar compilação e subir as alterações.
