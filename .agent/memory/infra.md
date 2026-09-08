# Infraestrutura & Deploy

## Stack de Infraestrutura
- **Frontend Host**: Lovable / Cloudflare Pages / Local Vite
- **Database & Auth**: Supabase Cloud / Self-hosted VPS
- **VPS Host**: Conforme configurado em .antigravity/state.json
- **Cloudflare**: Gestão de DNS e túneis Argo (chat, evo, minio, traefik)

## Regras Operacionais
- NUNCA executar Docker localmente. Containers rodam apenas na VPS.
- Usar headless CLI com tokens de ambiente.

---

## [2026-09-02] — [Feature ID: 351-fix-case-sensitive-ui-button-imports]
**Contexto:** O ambiente de deploy da Lovable roda em Linux (case-sensitive). Importações como `@/components/ui/button` passavam no Windows mas quebravam no build remoto com `UNLOADABLE_DEPENDENCY`.
**Regra aprendida:** Todos os componentes em `src/components/ui/` usam convenção PascalCase (`Button.tsx`, `Card.tsx`, `Badge.tsx`, `Modal.tsx`, etc.). Os imports devem obrigatoriamente usar PascalCase exato.
**Risco identificado / Anti-pattern:** Nunca importar componentes UI em minúsculo. A regra `"forceConsistentCasingInFileNames": true` no `tsconfig.json` é obrigatória para barrar discrepâncias em tempo de compilação no Windows.

## [2026-09-08] — [Feature ID: 325-correcao-erros-terminal-sourcemaps-e-loop-use-session]

**Contexto:** Mais de 140 linhas de erro falso `[ERROR]` no terminal devido a avisos de sourcemap ausentes em pacotes `@tanstack` de terceiros em `node_modules`.

**Regra aprendida:**
1. **Silenciamento de Sourcemaps em Vite:** Pacotes como `@tanstack/router-core` apontam para `.js.map` não empacotados pelo npm. Deve-se usar `customLogger` no `vite.config.ts` para suprimir `Failed to load source map` de `node_modules` na origem.
2. **Classificação Defensiva em Process Logger Wrappers:** Processos como `scripts/dev-server-logger.mjs` que interceptam `stderr` de subprocessos NÃO devem classificar automaticamente qualquer saída de `stderr` como `ERROR` crítico. Mensagens informativas de runtime (ex: recomendações de configuração de tsconfig ou avisos de sourcemap) devem ser filtradas e registradas como `DEBUG` ou `WARN` para evitar falsos alarmes no terminal do operador.

**Risco identificado:** Depender de regex simplória `/fail|error/i` em wrappers de processo causa alarme falso quando ferramentas como o Vite escrevem avisos normais de stderr.

**Não fazer:** Nunca redirecionar stderr bruto de processos de compilação diretamente para fluxos de alerta de erro sem antes higienizar padrões conhecidos de dependências de terceiros.

