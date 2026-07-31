# Proposal: UX do Agente, Sidebar e Markdown (chat-agente-ux)

## Problema
1. O texto gerado pela IA, especialmente listas e tabelas (ex: retorno de contas a pagar), está sendo renderizado como texto puro (`whitespace-pre-wrap`), ficando esteticamente quebrado e difícil de ler (destoando de IAs do mercado como Claude/ChatGPT).
2. O mapeamento da loja "Master" foi esquecido no System Prompt da Edge Function, fazendo a IA "inventar" ou falhar ao acessar contas dessa loja (a UI exibe `MPMaster`, mas a IA não sabe como transcrever isso para o slug).
3. A interface do Agente (`agente.tsx`) possui uma barra superior de ferramentas de navegação que o usuário considera muito poluída e desnecessária para ficar no header principal, sugerindo passá-la para o menu lateral junto à aba da inteligência.

## Solução Proposta
1. **Frontend (Markdown):** Instalar e utilizar as bibliotecas `react-markdown` e `remark-gfm` no componente `MessageList.tsx`. Iremos mapear as tags HTML geradas a partir do Markdown para adotarem classes do Tailwind estritas (Zinc-900 para fundos, borders suaves em tabelas), mantendo o padrão dark/clean sem glassmorphism.
2. **Frontend (Layout):** Refatorar completamente a navegação na rota `agente.tsx`. O Header superior será simplificado (deixaremos apenas o nome do agente ou removeremos caso não necessário) e os atalhos de configuração (Provedores, Telemetria, Bot & MCP) migrarão para o final da Sidebar lateral esquerda, como configurações independentes da lista de histórico.
3. **Backend (System Prompt):** Atualizar o arquivo `supabase/functions/ai-chat/index.ts`, inserindo explicitamente a string `- Master (MPMaster) -> mp_master` no bloco `<identidade_b2b>` das regras da IA.

## Contratos de Dados
- Nenhuma alteração estrutural nas tabelas do Supabase. Apenas adição de 1 linha de texto no Prompt base.

## API / Interface
- `MessageList.tsx`: Deixará de renderizar string pura e usará `<ReactMarkdown>` component mapping para injetar estilização em `table`, `th`, `td`, `a`, e `code`.

## Risco Principal
- A instalação de pacotes como `react-markdown` e `remark-gfm` em projetos Vite/React pode ocasionalmente gerar pequenos warnings de empacotamento ESM vs CJS caso a versão não seja compatível. Usaremos as versões estáveis para evitar quebras de build e faremos a verificação do build no processo final.
