# Design: Fix PDF.js SSR Crash no Vite (173)

## Arquitetura Técnica
A mudança é contida em apenas 1 arquivo utilitário (`src/lib/parsers/mapaMetasParser.ts`).
O padrão de Lazy Loading via Dynamic Import será usado:
```typescript
const pdfjsLib = await import('pdfjs-dist');
```
Dessa forma, o compilador e o bundler do Vite empacotarão o PDF.js em um chunk separado e nunca tentarão executá-lo no lado do Node (SSR), já que a função `parseMapaMetasPDF` só é invocada pelo hook `useCentralImport` a partir de uma interação puramente do navegador (arrastar o PDF no dropzone).

## Interfaces TypeScript
Nenhuma mudança de interface.

## Fluxo de UI
Nenhuma mudança visual, mas os crashes 500 no carregamento inicial da página de Importação desaparecerão.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Acessar o sistema (`npm run dev`)
  - *Ação*: Entrar na rota de Importações ou Dashboard.
  - *Resultado esperado*: A página renderiza sem o erro "DOMMatrix is not defined".
- **Cenário 2**: Parsing de PDF real
  - *Ação*: Arrastar um PDF na tela de importação.
  - *Resultado esperado*: O import dinâmico é resolvido, o Worker é linkado via CDN, e o PDF é lido normalmente sem erros de rede.
