# Plano 105: Dev Auto-Import & Mapeamento Resiliente

## 1. `src/hooks/useUnifiedStoreMapping.ts`
- Alterar a lógica do localStorage para salvar `{ alias: nomeNormalizadoDaLoja }` (string) em vez do UUID.
- No carregamento inicial, não preencher o estado `mapping` diretamente com UUIDs, mas sim resolver os UUIDs verificando a lista de `stores` ativa do Supabase. (ex: `stores.find(s => normalize(s.name) === nomeNormalizado)`).
- Isso garante que wipes no banco nunca quebrem o cache local de mapeamento.

## 2. `src/components/importacoes/CentralImportWizard.tsx`
- Adicionar no header (perto do título "Wizard de Importação Centralizada") um botão secundário: `[Dev] Auto-Load Mocks`.
- Exibir este botão condicionalmente usando `import.meta.env.DEV` (Vite).
- Ao clicar no botão, ele irá instanciar `File` objects baseados nos arquivos que o usuário normalmente arrasta.
- Como não temos acesso de leitura local direto (por segurança do browser), podemos criar um input "dir" (`webkitdirectory`) escondido onde o usuário clica 1 vez para selecionar a pasta de testes, ou criar um script Node local (`scripts/copy-mocks.mjs`) que converte os 25 arquivos de teste em base64 dentro de um `.ts` no projeto (`src/__mocks__/importFiles.ts`). Assim, o botão `Auto-Load` apenas lê desse arquivo e joga na esteira.

### Estratégia de Mock (Opção A)
- Usaremos a API File para injetar os 25 arquivos de exemplo em Base64 no código.

*(Aguardando aprovação do plano para iniciar!)*
