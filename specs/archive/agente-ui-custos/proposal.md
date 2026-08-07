# Proposal: ReestruturaçÁo do Agente IA & Nova Conversa (agente-ui-custos)

## Problema
O layout e comportamento atual da "Central IAS" na tela do Agente (`agente.tsx`) apresentam três pontos de atrito:
1. **Lugar Incorreto de Custos**: A tela de acompanhamento de custos de IA (`Custos.tsx`) está avulsa, quando na verdade ela pertence ao hub do Agente IA (junto de Configurações, Log do Agente IA e Log do Motor).
2. **CriaçÁo Prematura de Conversas**: O botÁo "Nova Conversa" cria instantaneamente um registro vazio no banco de dados e joga a interface num estado em branco, poluindo o histórico com conversas sem mensagens.
3. **Falta de Títulos Inteligentes**: As conversas sÁo nomeadas genericamente. É necessário um título inteligente que resuma a intençÁo da primeira mensagem usando um LLM de baixo custo (ex: `gemini-1.5-flash` ou `gpt-4o-mini`).

## SoluçÁo Proposta
- **UI do Agente**: Adicionar o link de "Custos" no rodapé do Sidebar do `agente.tsx`. O componente `CustosPage` poderá continuar sendo uma rota (ex: `/custos` ou `/logs/custos`), mas seu acesso primário será via este menu.
- **RefatoraçÁo de "Nova Conversa"**:
  - O botÁo limpará o estado local (`activeConversationId = null` e `messages = []`), **sem** tocar no banco.
  - A inserçÁo no banco de dados (`INSERT` em `conversations`) só acontecerá **após** o usuário enviar a primeira mensagem.
- **GeraçÁo de Título Automática**:
  - Na primeira mensagem, o cliente criará a conversa com o título temporário "Nova Conversa" e enviará o prompt para a Edge Function de chat.
  - Em paralelo (background), faremos uma requisiçÁo separada para um micro-prompt (ex: "Resuma em 4 palavras: [mensagem]") para atualizar a linha da tabela `conversations` com o título gerado.

## Contratos de Dados
- **Tabela `conversations`**: Nenhuma alteraçÁo de schema.
- As chamadas de mutaçÁo para `conversations` ocorrerÁo apenas durante o envio da primeira mensagem.

## Interfaces Afetadas
- `src/routes/agente.tsx`: Sidebar atualizado (inclusÁo do link "Custos").
- `src/routes/agente.tsx`: ModificaçÁo do `handleNewConversation` e `sendMessage`.
- `src/routes/custos.tsx`: Continua o mesmo, ou será renderizado condicionalmente se desejarmos manter tudo em uma rota.

## Features Existentes Impactadas
- O Sidebar do `agente.tsx` (linhas 368-390).
- PaginaçÁo do Histórico (linhas 357-363) já tem limitaçÁo de 5 com botÁo "Ver mais", apenas manteremos e garantiremos que o CSS esteja fluido.

## Risco Principal
- A requisiçÁo assíncrona para renomear o título pode falhar. Caso falhe, deve haver um *fallback* gracioso mantendo o título como um trecho da primeira mensagem (ex: os primeiros 20 caracteres) em vez de falhar a resposta principal do Chat.
