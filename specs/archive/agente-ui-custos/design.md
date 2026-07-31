# Design: Reestruturação do Agente IA & Nova Conversa (agente-ui-custos)

## Arquitetura Técnica

```text
Usuário (Frontend: agente.tsx)
 │
 ├─ Clica "Nova Conversa"
 │  └─ activeConversationId = null
 │  └─ setMessages([])
 │
 ├─ Digita a primeira mensagem e envia
 │  ├─ [1] INSERT Supabase `conversations` (title: substring da mensagem)
 │  ├─ [2] `appendMessage` na useChat (dispara requisição para Edge Function principal de chat)
 │  └─ [3] Dispara função `generateTitleAsync` em background (client-side)
 │          └─ Chama LLM (Edge Function ou SDK Google) -> UPDATE Supabase `conversations` (title = resumo)
```

## Componentes / Hooks / Funções
- `src/routes/agente.tsx`:
  - **Componente AgentePage**: Adição do botão de `Custos` usando `Link` para `/custos` na seção de Logs no final do Sidebar (junto de Configurações, Log do Agente IA e Log do Motor).
  - **`handleNewConversation`**: Remoção do `supabase.from('conversations').insert(...)`. Agora apenas limpa estados.
  - **`sendMessage`**: Adição da lógica para verificar `!currentConvId`. Caso seja null, faz o `INSERT` ali mesmo antes de seguir o fluxo. Após o fluxo, dispara a chamada assíncrona de titulação se for uma nova conversa.
  - **`generateSmartTitle` (nova função local)**: Executa um micro-prompt chamando um endpoint ou fallback (se as edge functions não tiverem esse endopoint, podemos usar o `ai-chat` com role 'system' ou simplesmente gravar os primeiros 30 caracteres, que já é muito melhor que "Nova Conversa").

## Fluxo de UI
1. O usuário entra em `/agente`. O sidebar possui no final as opções: Configurações, Log do Agente IA, Log do Motor, Custos.
2. O usuário clica em "Nova Conversa". A tela principal fica limpa. O menu não adiciona uma linha de conversa ainda.
3. O usuário digita "Como calcula o CMV?".
4. Ao dar Enter, a conversa é criada no banco inicialmente como "Como calcula o CMV?..." e aparece na lista.
5. Em instantes, a lista se atualiza via Realtime (que já está escutando updates) e o título muda para "Cálculo de CMV" graças ao processamento em background do LLM barato.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1: Nova conversa vazia**: Usuário clica "Nova Conversa" mas não digita nada, depois clica em outra aba → Nenhuma conversa extra salva no banco. Histórico limpo.
- **Cenário 2: Envio de primeira mensagem**: Usuário manda "Quais os juros da rede?". Conversa é criada no ato do envio, mensagem é inserida.
- **Cenário 3: Renomeação Assíncrona**: Após enviar a primeira mensagem, o título vira um resumo descritivo sem bloquear o chat de continuar respondendo ao usuário.
