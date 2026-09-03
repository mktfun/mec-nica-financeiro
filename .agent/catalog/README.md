# Catálogo de Skills — antigravity-config

> Índice navegável de todas as skills disponíveis.  
> Para metadados completos (triggers, risk, priority), veja `.agent/manifests/skill-manifest.yaml`.  
> Para instalação e bundles, veja `docs/bundles.md`.

---

## Por Categoria

### 🎨 Frontend / UI Visual

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `design-md` | Gera DESIGN.md semântico otimizado para Stitch | High |
| `enhance-prompt` | Otimiza prompts antes de enviar ao Stitch | Medium |
| `react-components` | Converte screens Stitch em componentes React | High |
| `stitch-loop` | Gera sites/apps multi-página com Stitch | Medium |
| `shadcn-ui` | Expert guidance para shadcn/ui + React | High |
| `remotion` | Vídeos de walkthrough a partir de screens Stitch | Low |
| `frontend-design` | Padrões de UX/UI, acessibilidade, interação | Medium |

### 📋 Planning & Architecture

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `brainstorming` | Facilita design e requisitos — previne implementação prematura | **Critical** |
| `architecture-review` | Documentação de decisões arquiteturais com trade-offs | High |
| `api-design-principles` | Design de APIs REST consistentes | High |

### 🔍 Debugging

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `debugging-strategies` | Debugging sistemático — de tentativa-e-erro para processo | **Critical** |

### ✅ Quality & Testing

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `test-driven-development` | TDD rigoroso — Red/Green/Refactor | High |
| `lint-and-validate` | Gate de qualidade — lint, TypeScript, imports | High |
| `code-review` | Revisão estruturada antes de merge | Medium |

### 🔒 Security

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `security-auditor` | Auditoria de segurança — RLS, auth, endpoints | High |

### 🗄️ Backend / Supabase

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `supabase-best-practices` | Padrões Supabase — migrations, RLS, Edge Functions | **Critical** |

### 🚀 DevOps / Release

| Skill | Descrição | Prioridade |
|-------|-----------|------------|
| `create-pr` | PR description estruturada + conventional commits | Medium |

---

## Por Bundle

| Bundle | Skills incluídas | Quando usar |
|--------|-----------------|-------------|
| `core` | brainstorming, lint-and-validate, debugging-strategies | Qualquer tarefa |
| `planning-mode` | brainstorming, architecture-review, api-design-principles | Antes de implementar |
| `fullstack-dev` | brainstorming, lint-and-validate, frontend-design, shadcn-ui, react-components, supabase-best-practices | Feature completa |
| `stitch-visual` | design-md, enhance-prompt, stitch-loop, react-components, remotion | UI visual pesada |
| `ship-mode` | create-pr, lint-and-validate, code-review | Antes de commitar/PR |

---

## Por Risco

| Risk | Skills |
|------|--------|
| **safe** | Todas as skills deste repo |
| **unknown** | `brainstorming`, `test-driven-development` (alteram o fluxo de trabalho) |

---

## Fontes

| Source | Skills |
|--------|--------|
| Official (google-labs-code/stitch-skills) | design-md, enhance-prompt, react-components, remotion, shadcn-ui, stitch-loop |
| Upstream (sickn33/antigravity-awesome-skills) | brainstorming, debugging-strategies, test-driven-development, security-auditor, api-design-principles, create-pr, lint-and-validate, frontend-design, code-review, architecture-review |
| Original/Custom | supabase-best-practices |

---

## Adicionando uma nova skill

1. Criar `skills/<nome>/SKILL.md`
2. Adicionar entrada em `.agent/manifests/skill-manifest.yaml`
3. Atualizar este arquivo
4. Se importado do upstream, seguir `.agent/policies/sync-upstream.md`
