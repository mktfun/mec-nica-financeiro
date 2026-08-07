# Proposal: Fix AI Chat Edge Function Crash (061-fix-ai-chat-settings)

## Problema
Quando novos usuários (com um token recém-gerado, sem configurações de I.A. salvas no banco de dados) tentam usar o Chat de Inteligência Artificial, o Agente responde imediatamente com o erro "An error occurred." no frontend (acompanhado por HTTP 400).
A causa raiz é que a *Edge Function* `ai-chat` tenta buscar as preferências do usuário na tabela `ai_settings` utilizando o método `.single()`. Quando nÁo há registros para esse usuário, o Supabase lança um erro `PGRST116` (nenhuma linha retornada), interrompendo a funçÁo antes mesmo de invocar o LLM.

## SoluçÁo Proposta
Modificar a *Edge Function* `ai-chat` para que a ausência de configurações nÁo quebre a execuçÁo. Usaremos o método `.maybeSingle()` em vez de `.single()`. Caso o usuário nÁo tenha configurações salvas, o sistema assumirá os valores padrÁo (fallback para Google Gemini Flash com a chave de API de ambiente).

## Contratos de Dados
- **Tabelas Envolvidas**: Nenhuma alteraçÁo estrutural no schema. Apenas a forma de leitura da tabela `ai_settings` será ajustada.
- Mutações: Nenhuma (Leitura gracefully fallback).

## API / Interface
- **Edge Function (`ai-chat/index.ts`)**: 
  - Mudança da query do banco: `supabaseClient.from('ai_settings').select('*').eq('user_id', user.id).single()` -> `.maybeSingle()`.
  - Tratamento das chaves nulas no Deno.env fallback para garantir que o Gemini inicie com a chave de sistema quando `settings.api_key` for `undefined`.

## Features Existentes Impactadas
(ref a spec/global/features.md — Agente de Inteligência Artificial)
- NÁo impacta os usuários atuais que já possuem configurações. Permite acesso de novos usuários usando o saldo central da plataforma.

## Risco Principal
- Caso a variável de ambiente principal `GOOGLE_API_KEY` também nÁo esteja definida na nuvem do Supabase, a funçÁo pode falhar posteriormente com um erro de autenticaçÁo na API do Google (mas de forma explícita). Isso nÁo é novidade, o fallback requer a key de ambiente.
