# Spec Plan: Resolução de PGRST303 e Blindagem de AI Settings (296)

## Tasks

### Fase 1 — Schema e Policies no Banco
- [x] [BACKEND] Criar migration `20260826000006_fix_stores_policy_and_ai_settings_schema.sql` com leitura irrestrita em `stores` e colunas faltantes em `ai_settings`
- [x] [BACKEND] Aplicar migration no Supabase via API Management

### Fase 2 — Refatoração de Resiliência no Frontend
- [x] [FRONTEND] Atualizar `src/hooks/useStores.ts` com recuperação automática contra `PGRST303`
- [x] [FRONTEND] Validar `src/hooks/useAiSettings.ts`

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Testar query em `stores` e `ai_settings` confirmando status 200 sem erros (4/4 testes passaram)
- [x] [TEST] Executar `npm run build` (Build 100% verde)
