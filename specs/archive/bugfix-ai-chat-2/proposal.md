# Proposal: CorreçÁo de Erro Interno (s is not a function) no AI SDK (bugfix-ai-chat-2)

## Problema
O usuário reportou que a mensagem enviada fica duplicada na tela e o console do navegador exibe um erro fatal interno na minificaçÁo do React/Vercel AI SDK: `Uncaught (in promise) TypeError: s is not a function at m`. Como resultado, a resposta de IA nunca aparece e o componente de chat trava.

Este erro ocorre porque a biblioteca `@ai-sdk/react` repassa os cabeçalhos de requisiçÁo (`options.headers`) para a funçÁo `fetch` customizada usando uma instância nativa da classe `Headers`. No código atual, tentamos espalhar (`spread`) esse objeto de cabeçalhos (`{ ...options?.headers }`), o que, em JavaScript, destrói o objeto `Headers` transformando-o em `{}` (vazio). Consequentemente:
1. O cabeçalho `Content-Type: application/json` e outros headers de protocolo do Vercel AI SDK sÁo perdidos.
2. O parser interno de stream da biblioteca falha inesperadamente pois recebe uma resposta HTTP diferente do esperado.
3. Isso causa um erro de _runtime_ do tipo "is not a function" dentro dos internals da SDK ao tentar ler a resposta ou lidar com a falha sem os devidos tratamentos de fluxo.

Adicionalmente, se o `append()` da mensagem for enviado sem um `id` explícito, o SDK pode engasgar em updates otimistas, o que explica a duplicidade de mensagens renderizadas temporariamente na interface quando uma requisiçÁo falha.

## SoluçÁo Proposta
1. **Refatorar o Interceptador `fetch`:** Modificaremos a funçÁo `fetch` customizada no hook `useChat` para mesclar cabeçalhos corretamente instanciando `new Headers(options?.headers)` e entÁo chamando `headers.set('Authorization', ...)`, assim como a documentaçÁo do `@ai-sdk/react` exige e como estava no código legacy antes da refatoraçÁo.
2. **Fornecer IDs Explícitos:** Passaremos um UUID explícito gerado via `crypto.randomUUID()` dentro do objeto enviado para o `append()`, o que estabiliza o mapeamento de estado otimista do React no `useChat`.

## Contratos de Dados
- Nenhuma alteraçÁo nos contratos de dados, tabelas ou Edge Functions do Supabase.

## API / Interface
- A interface e layout do usuário nÁo terÁo mudanças, mantendo-se minimalista conforme aprovado na refatoraçÁo anterior.

## Features Existentes Impactadas
- Tela `/agente` (RefatoraçÁo de código).

## Risco Principal
- Caso o SDK requeira alguma propriedade adicional ignorada no `append`, ele pode nÁo engatilhar o stream. Forneceremos todos os atributos base (id, role, content).
