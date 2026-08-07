# Proposal: Corrige Falha de Build no Lovable Publish (bugfix-lovable-publish)

## Problema
O deploy automatizado da plataforma (Lovable / CI) falhou no passo `npm install (--ignore-scripts) com exit status 1`.
Após análise (`Deep Research`), duas anomalias cruciais foram identificadas:
1. **Peer Dependency Desync (React 19.2):** O pacote `@ai-sdk/react@4.0.45` que injetamos na última Spec exige a peerDependency `{ react: '^18 || ~19.0.1 || ~19.1.2 || ^19.2.1' }`. No entanto, o `package.json` atual do projeto aponta para `"react": "^19.2.0"`. Essa incompatibilidade menor quebra ambientes rígidos como o Lovable/NPM 10 CI.
2. **ConfusÁo de Package Managers (Lockfiles):** Existe um arquivo `bun.lock` enorme (200kb) na raiz juntamente com o `package-lock.json`. O Lovable pode usar o PM incorreto se detectar multiplos lockfiles.

## SoluçÁo Proposta
1. Ajustar as versões de `react` e `react-dom` no `package.json` para `^19.2.1` para satisfazer as constraints do `@ai-sdk/react`.
2. Rodar `npm install` limpo e gerar um novo `package-lock.json`.
3. Remover o arquivo `bun.lock` do controle de versÁo para forçar o Lovable a utilizar o Node/NPM padrÁo.
4. Adicionar um block de `"overrides": { "react": "$react", "react-dom": "$react-dom" }` no `package.json` se necessário, para calar warnings de dependências de terceiros.

## Contratos de Dados
- **Nenhum banco modificado**. Apenas `package.json`.

## API / Interface
- **Nenhuma alteraçÁo de frontend**. Apenas bump de versionamento do React (de 19.2.0 para 19.2.1).

## Features Existentes Impactadas
- NÁo afeta a codebase de forma disruptiva. O upgrade do React é de patch version.

## Risco Principal
- O Lovable falhar por cache antigo. Iremos forçar a remoçÁo do bun.lock para que o pipeline dele instale fresh com npm.
