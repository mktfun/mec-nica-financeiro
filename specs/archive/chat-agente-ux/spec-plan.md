# Spec Plan: UX do Agente, Sidebar e Markdown (chat-agente-ux)

## Tasks
- [x] [INFRA] Executar a instalaçÁo das dependências do parser Markdown: `npm install react-markdown remark-gfm`.
- [x] [BACKEND] Atualizar `supabase/functions/ai-chat/index.ts` para adicionar o mapeamento de loja `- Master (MPMaster) -> mp_master` no bloco `<identidade_b2b>` do SYSTEM_PROMPT.
- [x] [FRONTEND] Refatorar `src/components/chat/MessageList.tsx` para importar os novos pacotes e adicionar o componente `ReactMarkdown` renderizando `msg.content` e mapeando elementos críticos (`table`, `th`, `td`, `a`, `code`, `p`, `ul`, `ol`) com as classes Tailwind necessárias (foco extremo em Zinc e estética Premium).
- [x] [FRONTEND] Refatorar `src/routes/agente.tsx`: mover a funçÁo `renderNavTabs()` que fica no Topo para o final (bottom) da Sidebar Histórico, ajustando o CSS (flex, layout, gaps, cores) para que se pareça com um menu técnico limpo, deixando a visÁo do Chat principal completamente "clean".
- [x] [TEST] Executar `npm run build` após a refatoraçÁo para assegurar que as definições de tipagem e a injeçÁo do pacote Markdown nÁo quebram o rollup do Vite.
