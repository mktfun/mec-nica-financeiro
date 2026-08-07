# Design: Corrige Falha de Build no Lovable Publish (bugfix-lovable-publish)

## Arquitetura Técnica
N/A - Sem alterações em fluxos lógicos ou de infraestrutura de servidor. Apenas configuraçÁo do gerenciador de pacotes e dependências.
O objetivo é garantir que o container de build do Lovable utilize a versÁo exata do React esperada pelo SDK de IA, além de isolar o build exclusivamente no NPM.

## Interfaces TypeScript
N/A.

## Componentes / Hooks / Funções
N/A.

## Fluxo de UI
N/A.

## Infra / Deploy
- **Plataforma:** Lovable Deploy (via GitHub).
- O Lovable detecta o gerenciador de pacotes através dos lockfiles na raiz do projeto.
- RemoçÁo do `bun.lock` garante que o Lovable executará estritamente os scripts do `npm` (`npm ci` ou `npm install`).
- A versÁo do React será elevada de `19.2.0` para `19.2.1` (minor patch sem breaking changes) para acalmar o npm10 peerDependency checker do `npm install --ignore-scripts`.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Lovable Cloud Build `npm install (--ignore-scripts)`.
  - [açÁo]: Commit com a remoçÁo do bun.lock e bump do React
  - [resultado esperado]: O passo de install passará com exit code 0 e o deploy voltará ao normal.
