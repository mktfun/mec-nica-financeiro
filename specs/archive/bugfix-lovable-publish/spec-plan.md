# Spec Plan: Corrige Falha de Build no Lovable Publish (bugfix-lovable-publish)

## Tasks

- [x] [BACKEND] Deletar o arquivo `bun.lock` da raiz do repositório
- [x] [FRONTEND] Atualizar as dependências `react` e `react-dom` no `package.json` para `"^19.2.1"`
- [x] [FRONTEND] Adicionar um bloco `"overrides": { "react": "$react", "react-dom": "$react-dom" }` no final do `package.json` para mitigar problemas futuros com outras libs (ex: radix)
- [x] [FRONTEND] Rodar `npm install --ignore-scripts` localmente para forçar a regeraçÁo de um `package-lock.json` impecável
- [x] [TEST] Verificar cenário 1: O build local de produçÁo (`npm run build`) deverá passar sem quebras.
