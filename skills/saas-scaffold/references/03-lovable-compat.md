# 03 — Compatibilidade Lovable

## O que é Lovable

Lovable é uma plataforma visual de desenvolvimento e prototipação com IA para React e Next.js. Projetos integrados ao Lovable exigem a existência e manutenção da pasta `lovable/` na raiz do repositório.

---

## Estrutura da Pasta `lovable/`

```
nome-do-projeto/
├── lovable/                          ← PASTA OBRIGATÓRIA — versionar no Git
│   ├── DESIGN.md                     ← Especificação visual e design tokens
│   ├── PROJECT.md                    ← Descrição funcional e features para a IA
│   └── COMPONENTS.md                 ← Catálogo de componentes e blocos
```

---

## Templates dos Arquivos

### `lovable/PROJECT.md`
```markdown
# [Nome do Projeto]

## Descrição
[Descrição concisa do propósito e público-alvo da plataforma]

## Stack Tecnológico
- Next.js 14+ (App Router)
- Supabase (PostgreSQL + Auth SSR + Storage)
- shadcn/ui (Tema Zinc-950) + Tailwind CSS + Framer Motion
- TypeScript (Strict)

## Features Principais
- [ ] Autenticação SSR (Email/Password, OAuth, Magic Link)
- [ ] Multi-tenancy com isolamento de organizações e RLS
- [ ] Dashboard analítico responsivo com métricas em tempo real
- [ ] Gestão de assinaturas e faturamento (Stripe)
```

### `lovable/DESIGN.md`
```markdown
# Design System

## Paleta de Cores (Zinc-950 / Indigo)
- Background Base: `#09090b` (zinc-950)
- Superfície Card: `#18181b` (zinc-900)
- Bordas: `#27272a` (zinc-800)
- Accent Primário: `#6366f1` (indigo-500)
- Texto Principal: `#fafafa` (zinc-50)
- Texto Secundário: `#a1a1aa` (zinc-400)

## Tipografia & Componentes
- Fonte: Inter (`font-sans`), Geist Mono (`font-mono`)
- Primitivos: Baseados em shadcn/ui (ver skill `ui-components`)
- Animações e Micro-interações: Magic UI (ver skill `ui-motion`)
```

### `lovable/COMPONENTS.md`
```markdown
# Catálogo de Componentes

## Componentes Estruturais (src/components/layout/)
- `AppSidebar`: Barra de navegação lateral expansível/recolhível
- `AppHeader`: Cabeçalho sticky com busca e perfil
- `UserNav`: Menu dropdown do usuário logado

## Componentes de Bloco (src/components/features/)
- `DataTable`: Tabela com ordenação, filtros e paginação
- `SettingsForm`: Formulário com validação Zod e Server Action
```

---

## Fluxo Operacional & Delegação de Skills

1. **Geração e Ajustes Visuais**: Utilize `ui-components` para construir as telas e componentes respeitando os tokens do `lovable/DESIGN.md`.
2. **Efeitos e Micro-interações**: Utilize `ui-motion` para adicionar animações e transições.
3. **Sincronização Git**: Utilize `github-ops` para versionar os arquivos da pasta `lovable/` e abrir PRs no repositório conectado.
4. **Validação de Deploy Lovable**: Consulte `deploy-production` (Target B em `references/checklist-launch.md`) para verificar a integridade da build.
