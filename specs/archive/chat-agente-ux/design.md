# Design: UX do Agente, Sidebar e Markdown (chat-agente-ux)

## Arquitetura Técnica
1. **Frontend Sidebar (`agente.tsx`):** A Sidebar original (onde ficam as abas "Nova Conversa" e a lista de Histórico) usará `flex flex-col flex-1`. Na parte superior, ficará o Chat (histórico). Na base (rodapé da sidebar), inseriremos o bloco com os botões de configuraçÁo (Provedores & API, Telemetria, Inspector, Bot & MCP), todos com ícones menores (Lucide) e tipografia neutra (`text-zinc-400 hover:text-zinc-100`). 
2. **Frontend Markdown (`MessageList.tsx`):** Substituiremos a div contenedora do texto por `<ReactMarkdown remarkPlugins={[remarkGfm]} components={{...}}>`. Os overrides de CSS das tags focarÁo na criaçÁo de uma tabela elegante com Tailwind:
   - `table`: `w-full text-sm border-collapse rounded-lg overflow-hidden border border-zinc-800 my-2`
   - `th`: `bg-zinc-900 p-2 text-left font-semibold text-zinc-300 border-b border-zinc-800`
   - `td`: `p-2 border-b border-zinc-800/50 text-zinc-400`
3. **Backend Prompt (`ai-chat/index.ts`):** InclusÁo de `mp_master` (st-10 ou equivalente estrito) no identity block do Edge Function, sanando a alucinaçÁo/falha da IA com o Jabaquara/Master.

## Fluxo de UI
1. Usuário clica no menu "Agente IA".
2. O topo fica completamente limpo (sem poluiçÁo de links e "2 topo sla"). Apenas a interface de conversa toma a tela.
3. No painel esquerdo da tela do Agente (sidebar de conversas), abaixo da listagem de histórico, o usuário enxerga opções menores e discretas para mexer nos "Motores" (Provedores, Telemetria, etc).
4. O usuário pergunta "quais contas a pagar pra hoje", a IA responde via Edge Function com markdown `| ID | Fornecedor |`, e o Front-End compila para uma tabela HTML linda no estilo dashboard financeiro moderno (preto/cinza chumbo).

## Infra / Deploy
- Requer instalaçÁo de pacotes via npm: `npm i react-markdown remark-gfm`.
- O Edge Function exige deploy remoto: `supabase functions deploy ai-chat`.

## Cenários de VerificaçÁo
- **Cenário 1:** RenderizaçÁo de mensagens contendo tabelas markdown. O texto nÁo deve vazar da bolha de chat, o resize automático da tabela (overflow-x-auto) deve atuar caso haja muitas colunas para evitar tela quebrada.
- **Cenário 2:** Clicar nos botões da parte de baixo da sidebar lateral para garantir que os painéis (Provedores, etc) continuam renderizando na área principal substituindo o chat.
