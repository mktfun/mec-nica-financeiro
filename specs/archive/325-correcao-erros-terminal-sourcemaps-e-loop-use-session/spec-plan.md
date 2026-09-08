# Spec Plan: Eliminação de Erros de Terminal (Sourcemaps Ausentes e Loop Infinito em useSession) (325)

## Tasks

- [x] [BUILD/LOGGER] Configurar `customLogger` em `vite.config.ts` para suprimir avisos de sourcemaps ausentes de pacotes externos (`@tanstack` em `node_modules`)
- [x] [BUILD/LOGGER] Aprimorar a interceptação de streams e classificação em `scripts/dev-server-logger.mjs` para blindar o terminal contra falso-positivos de `stderr` de sourcemaps
- [x] [FRONTEND/AUTH] Refatorar o hook `useSession` em `src/hooks/useAuth.ts` utilizando a API padrão `useSyncExternalStore` para eliminar o loop de re-renders e o erro `Maximum update depth exceeded`
- [x] [FRONTEND/ROUTING] Estabilizar as referências de fallbacks vazios no destructuring de queries em `src/routes/index.tsx` e `src/routes/conciliacao.index.tsx` usando constantes de módulo (`EMPTY_DATES`, `EMPTY_STORES`)
- [x] [TEST] Executar Cenário 1: Reiniciar o servidor de desenvolvimento via `dev-server-logger.mjs` e comprovar a eliminação de 100% das mensagens de erro de sourcemap no terminal e em `logs/error.log`
- [x] [TEST] Executar Cenário 2: Testar a navegação e o ciclo de autenticação nas rotas `/` e `/conciliacao`, verificando a ausência do erro de profundidade máxima do React e confirmando o build limpo com `npm run build`
