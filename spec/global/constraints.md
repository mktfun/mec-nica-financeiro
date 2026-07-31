# Constraints

1. Headless Only: Toda operação de IA e DB deve ser autônoma, sem interações interativas de terminal.
2. Design: Dark Mode sólido (Zinc-950). Sem Glassmorphism. Fontes: Inter ou Outfit.
3. RLS: Toda tabela nova no Supabase DEVE ter Row Level Security configurada.
4. Código Existente: Sempre prefira usar wrappers a criar código duplicado.
5. Vercel AI SDK: Nunca use `spread` em objetos `Headers` na configuração de `fetch`. Use `new Headers()` e `.set()`.
