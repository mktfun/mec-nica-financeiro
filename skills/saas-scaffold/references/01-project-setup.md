# 01 — Setup Inicial do Projeto

## Stack Padrão
- **Framework**: Next.js 14+ (App Router)
- **Backend & Banco**: Supabase (PostgreSQL + Auth SSR + Storage)
- **UI & Estilos**: shadcn/ui (Zinc-950) + Tailwind CSS + Lucide Icons
- **Tipagem**: TypeScript (Strict Mode)
- **Deploy**: Vercel, Lovable ou VPS (Docker/Nginx/SSL)

---

## Comandos de Criação (Windows / PowerShell)

```powershell
# 1. Criar o projeto Next.js com App Router e alias @/*
cmd.exe /c "npx create-next-app@latest nome-do-projeto --typescript --tailwind --eslint --app --src-dir --import-alias '@/*'"

# 2. Entrar no diretório do projeto
Set-Location nome-do-projeto

# 3. Instalar clientes Supabase SSR
cmd.exe /c "npm install @supabase/supabase-js @supabase/ssr"

# 4. Inicializar shadcn/ui (Estilo: Default/Zinc, CSS Variables: Yes)
cmd.exe /c "npx shadcn@latest init"

# 5. Instalar componentes base essenciais
cmd.exe /c "npx shadcn@latest add button input label card dialog form table badge toast separator dropdown-menu"

# 6. Instalar bibliotecas de formulário, validação e animação
cmd.exe /c "npm install zod react-hook-form @hookform/resolvers clsx tailwind-merge framer-motion lucide-react"
```

---

## Próximos Passos & Integração com Skills

| Etapa | Ação | Skill / Arquivo de Referência |
|---|---|---|
| 1. Configurar `.env.local` | Criar variáveis de conexão Supabase | `references/06-env-vars.md` |
| 2. Estabelecer pastas | Criar estrutura padrão de arquivos | `references/02-folder-structure.md` |
| 3. Banco de Dados & Auth | DDL de tabelas, RLS e autenticação SSR | `database/`, `auth/` |
| 4. Server Actions & Backend | Mutações tipadas com `ActionResult<T>` | `backend-patterns/` |
| 5. Componentes de UI | Dashboards, tabelas avançadas e formulários | `ui-components/`, `ui-motion/` |
| 6. Deploy & Lançamento | Verificação de cache, SEO, CSP e build | `deploy-production/`, `github-ops/` |
