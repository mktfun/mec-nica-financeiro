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
