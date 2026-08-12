# Spec Plan: Fix PDF.js SSR Crash no Vite (173)

## Tasks

- [ ] [FRONTEND] Abrir `src/lib/parsers/mapaMetasParser.ts`.
- [ ] [FRONTEND] Remover o import estático: `import * as pdfjsLib from 'pdfjs-dist';`.
- [ ] [FRONTEND] Remover a configuração estática `pdfjsLib.GlobalWorkerOptions.workerSrc...` do escopo global do arquivo.
- [ ] [FRONTEND] Injetar o bloco dinâmico no início do try/catch de `parseMapaMetasPDF`:
```typescript
const pdfjsLib = await import('pdfjs-dist');
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```
- [ ] [TEST] Compilar ou rodar o Vite e verificar se o crash SSR (`DOMMatrix is not defined`) foi solucionado.
