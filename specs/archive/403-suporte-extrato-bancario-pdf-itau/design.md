# Design: Arquitetura do Parser e Ingestão de Extratos Itaú em PDF

## 1. Módulos
- `src/lib/parsers/itauPdfParser.ts`: Carregamento do PDF.js, inspeção de cabeçalho (`isItauBankStatementPDF`), extração colunar com coordenadas X e particionamento de lançamentos multi-line por pontos médios entre datas consecutivas.
- `src/lib/parsers/centralImportManager.ts`: Bifurcação automática no loop de PDFs para direcionar extratos bancários para `results.ofxResults` e mapas de metas para `results.mapaMetasResults`.
- `src/lib/parsers/ofxParser.ts`: Delegação automática de `parseOFXFile` para `parseItauBankStatementPDF` caso receba arquivo `.pdf`.
- `src/components/importacoes/CentralImportWizard.tsx`: Mapeamento de lojas atualizado para suportar mnemônicos e razões sociais com sufixos `.pdf`.

## 2. Validação Matemática
- Testado com os 3 arquivos oficiais (`mp.pdf`, `mhe.pdf`, `modulo.pdf`), obtendo 100% de paridade de saldos e transações.
