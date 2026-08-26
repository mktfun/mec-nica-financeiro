# Design: Resolução de PGRST303 e Blindagem de AI Settings (296)

## Arquitetura de Resiliência de Auth & Stores

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE RECUPERAÇÃO DE SESSÃO / STORES                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. REQUISIÇÃO (useStores)                                                              │
│    - Tenta buscar lojas no Supabase                                                    │
│                                │                                                       │
│                                ▼                                                       │
│ 2. SE ERRO PGRST303 (JWT Future / Skew)                                                │
│    - Executa supabase.auth.refreshSession() silenciosamente                           │
│    - Policy pública de leitura garante retorno imediato das 10 lojas                   │
│                                │                                                       │
│                                ▼                                                       │
│ 3. TABELA AI_SETTINGS                                                                  │
│    - Colunas provider, model, api_key, user_id adicionadas                             │
│    - Retorno 200 OK sem 400 no console                                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Cenários de Teste

- **Cenário 1 (Busca de Stores):**
  - Carregar a rota `/conciliacao` com token anon ou autenticado.
  - *Resultado:* 10 lojas retornadas com HTTP 200, zero `PGRST303`.
- **Cenário 2 (Consulta de AI Settings):**
  - Consultar `ai_settings` pelo `user_id`.
  - *Resultado:* Retorna 200 OK com campos `provider`, `model`, `api_key`, `bot_url`, `bot_api_key`.
