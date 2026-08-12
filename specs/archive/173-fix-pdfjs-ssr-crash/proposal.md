# Proposal: Fix PDF.js SSR Crash no Vite (173)

## Problema
O app está quebrando no modo de desenvolvimento/SSR (Server-Side Rendering) ou build pré-renderizado do Vite/Start, apresentando o erro `DOMMatrix is not defined`. Isso ocorre porque a biblioteca `pdfjs-dist` está sendo importada no topo do arquivo `src/lib/parsers/mapaMetasParser.ts`. Essa biblioteca tenta instanciar e acessar APIs exclusivas de browser (`DOMMatrix`, `canvas`, etc.) no exato momento do import. Como ela é parte da árvore de dependências do `useCentralImport.ts` e indiretamente da UI da Importação, ela "vaza" pro ciclo do servidor, derrubando a tela.

## Solução Proposta
Em vez de importar o `pdfjs-dist` de forma estática no root level do arquivo:
1. Remover o import top-level: `import * as pdfjsLib from 'pdfjs-dist';`
2. Mover o carregamento para dentro da própria função `parseMapaMetasPDF` usando `await import('pdfjs-dist')`. 
3. Isso garante que a biblioteca pesada do PDF.js (que só é usada quando o usuário solta de fato um arquivo PDF na tela) só seja baixada, executada e lida pelo browser *no exato momento* da extração (Runtime/Client-side).

## Contratos de Dados
- Nenhuma alteração no Supabase. Modificação exclusivamente de Frontend/Build pipeline.

## API / Interface
- `parseMapaMetasPDF` continua retornando a mesma Promise, sem quebrar contratos com `useCentralImport`.

## Features Existentes Impactadas
- Tela de Dashboard / Importação (que agora deixarão de crashear no SSR).

## Risco Principal
- **Probabilidade**: Baixa.
- **Impacto**: Quebra no lazy loading do worker.
- **Mitigação**: O `workerSrc` será injetado imediatamente após o import dinâmico na mesma função, mantendo o fallback para a CDN (`cdnjs.cloudflare.com`).
