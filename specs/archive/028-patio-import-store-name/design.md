# Design Document: IdentificaçÁo e Auto-Match de Loja no Pátio

## UI & Mapeamento (Stitch MCP)
NÁo haverá necessidade de novos componentes visuais ou grandes refatorações no design.
A tela `importar-os.tsx` (que lida com Pátio e OS) manterá o design Liquid Glass e Fluxos guiados, com o "Passo 2: Mapeamento de Lojas".
A mudança visual perceptível pelo usuário será de pura acessibilidade: os selects no "Passo 2" já estarÁo resolvidos e a listagem exibirá os nomes lógicos das lojas em vez de títulos sujos (como `1675`).

## Lógica Interna
- `src/hooks/useOsImportProcessor.ts`: O `processOsFiles` varrerá até 15 linhas das matrizes extraídas pela biblioteca `xlsx` testando o seguinte RegEx: `/(?:LOJA|UNIDADE)\s+([A-Za-zÀ-ÿ0-9\s]+)|(.+?)\s+-\s+Por Data da OS/i`. O grupo capturado definirá `storeAlias`.
- `src/routes/importar-os.tsx`: A tela implementará na lógica do dropzone (`onDrop`) ou num useEffect a estratégia normalizadora de nomes (já implementada em importações-despesas.tsx) que remove diacríticos e acentuações (`str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()`). Ao cruzar com as lojas providas pelo `useStores`, se for detectado mapeamento 1:1, será alimentado e o usuário prosseguirá automaticamente.
