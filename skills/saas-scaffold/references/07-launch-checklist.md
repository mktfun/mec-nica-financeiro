# 07 — Checklist de Lançamento e Pré-Deploy

Este checklist fornece uma visão rápida das verificações essenciais antes do primeiro deploy. Para o runbook detalhado de configuração de infraestrutura (Vercel, Lovable, Docker/Nginx VPS e SSL), consulte `deploy-production/references/checklist-launch.md`.

---

## 1. Verificação de Código & Tipagem
- [ ] TypeScript compila com 0 erros: `cmd.exe /c "npx tsc --noEmit"`
- [ ] Build de produção passa localmente: `cmd.exe /c "npm run build"`
- [ ] Linter sem avisos críticos: `cmd.exe /c "npm run lint"`
- [ ] Zero logs de tokens, senhas ou dados sensíveis de usuários
- [ ] Boundaries de erro configurados: `app/error.tsx` e `app/not-found.tsx`

---

## 2. Banco de Dados & Autenticação Supabase
- [ ] Todas as tabelas têm Row Level Security (RLS) habilitado (ver `database/references/rls-patterns.md`)
- [ ] Migrações versionadas executadas no banco de produção
- [ ] URLs de Site e Redirects configuradas no painel do Supabase Auth
- [ ] Provedor de SMTP (Resend / SES) configurado para e-mails transacionais

---

## 3. SEO, Performance & Segurança
- [ ] Metadata dinâmico e estático configurados (ver `deploy-production/SKILL.md`)
- [ ] Dynamic `sitemap.ts` e `robots.ts` presentes
- [ ] Headers de segurança CSP e HSTS configurados em `next.config.mjs`
- [ ] Core Web Vitals otimizados (imagens prioritárias com `next/image`)

---

## 4. Git & Automação de Lançamento
- [ ] Arquivo `.env.local` ignorado no `.gitignore`
- [ ] Commits no padrão Conventional Commits (ver `github-ops/SKILL.md`)
- [ ] PR criado e revisado via `gh pr create` antes do merge na `main`
- [ ] Tag de release criada no GitHub: `gh release create v1.0.0`
