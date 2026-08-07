# Corrigir erro 500 no app (SSR quebrado)

## O que está acontecendo

O erro 500 não é do Supabase nem do código das telas. O servidor derruba **toda** requisição (inclusive `/` no preview, que também responde 500) com:

```text
TypeError: matchedRoutes is not iterable
  at handleServerRoutes (@tanstack/start-server-core/createStartHandler.ts:778)
```

Causa confirmada: as bibliotecas do framework estão em versões incompatíveis entre si dentro do projeto:

```text
@tanstack/react-router      1.170.21
@tanstack/router-core       1.171.18   <- novo formato
@tanstack/react-start       1.168.34
@tanstack/start-server-core 1.169.17   <- espera o formato antigo
```

Na versão nova o roteador devolve os dados de rota em outro formato; a camada de servidor (mais antiga) lê o formato antigo, recebe `undefined` e estoura antes de renderizar qualquer página. Por isso o site publicado retorna a página "This page didn't load".

Além disso, o projeto hoje tem uma grande quantidade de erros de TypeScript (arquivos de importação, conciliação, hooks de dashboard, etc.), que impedem um build limpo — ou seja, mesmo com o SSR consertado, a publicação continuaria servindo um build antigo.

## Plano

### 1. Realinhar as versões do framework (correção do 500)
- Atualizar em conjunto `@tanstack/react-start`, `@tanstack/react-router` e `@tanstack/router-plugin` para o mesmo release atual, forçando `router-core` e `start-server-core` a ficarem na mesma linha.
- Regerar o lockfile / `node_modules` para eliminar as cópias duplicadas.
- Reiniciar o servidor e confirmar que `/` responde 200 no preview (hoje responde 500).
- Conferir as rotas principais (`/`, `/login`, `/conciliacao`, `/patio`) sem erro de SSR.

### 2. Destravar o build para publicar
- Corrigir os erros de TypeScript que hoje quebram o build, em blocos:
  - variantes inválidas de `Badge`/`Button` (`"outline"`, `"teal"`, `"xs"`) nos componentes de conciliação e no `CentralImportWizard`;
  - hooks inexistentes importados (`useRedeVsExtrato`, `useSaveBankReconciliation`, `useSaveMachineTotal`) e módulo ausente `@/lib/parsers/centralImportManager`;
  - tipos incompletos ao gravar `daily_snapshots` / `stores` (campos obrigatórios faltando);
  - tipagem dos retornos de RPC em `useBackendDashboard` / `useBackendConciliacao` (`Json` → tipo concreto).
- Rodar o build até passar limpo.

### 3. Publicar
- Republicar para que `conciliamec.lovable.app` receba o build corrigido e validar a home em produção.

## Observações técnicas
- Nada de banco de dados, RLS ou regra de negócio muda neste plano.
- As correções de TypeScript são de tipagem/props; se algum ponto exigir decisão de comportamento (ex.: hook que não existe mais), eu aviso antes de mudar lógica.
