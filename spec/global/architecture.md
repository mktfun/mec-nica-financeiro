# Architecture

## Stack
- Frontend: React + Vite + TailwindCSS (Zinc-950)
- Backend: Supabase (Edge Functions, Postgres RLS)
- IA: Vercel AI SDK (@ai-sdk/react) e Deno Edge Functions
- Memory & Context: Graphify (grafo de conhecimento)

## Padrões de Pastas
- `src/components/`: Componentes React
- `src/hooks/`: Custom Hooks
- `src/routes/`: Rotas da aplicação
- `supabase/functions/`: Edge Functions (Deno)
- `.agent/memory/`: Memória da IA
- `specs/`: Proposals e documentações de engenharia
