# Memória Geral do Projeto

## Preferências de Arquitetura
- **Stack Frontend**: React 19 + TanStack Start / Vite + Tailwind CSS + shadcn/ui + TypeScript.
- **Backend & Database**: Supabase (PostgreSQL) com RLS ativado em todas as tabelas, RPCs plpgsql e Edge Functions quando necessário.
- **Design System**: Dark UI obrigatório (Zinc-950 base, #050711, Indigo accents), sem glassmorphism em cards principais, responsividade mobile-first, estados de loading/error/empty padronizados.
- **Autenticação**: Supabase Auth com JWT validado no servidor via getUser().
- **Importação Financeira**: Parsing de OFX e XLSX com deduplicação rigorosa (FITID / hash) e validação transacional.

## Erros Passados & Guardrails
- **Headless CLI**: Nunca usar comandos interativos que abram browser (supabase login, gh auth login). Usar sempre env vars (GH_TOKEN, SUPABASE_ACCESS_TOKEN).
- **PowerShell**: Nunca encadear comandos com & no PowerShell. Usar ; ou executar comandos isolados. Usar cmd.exe /c para scripts .ps1 com restrição de execution policy.
- **Docker Local**: Nunca rodar Docker localmente; apenas na VPS remota.
- **Graphify**: Usar graphifyy (Python tool via uv), nunca 
px @baml/graphify.
- **Database Safety**: Nunca rodar CREATE TABLE sem IF NOT EXISTS e sem políticas RLS.

## Persona do Usuário
- Foco em entregas determinísticas, alta qualidade de código, arquitetura robusta e testes automatizados.
- Preferência por relatórios detalhados de integridade e feedback claro de status.
