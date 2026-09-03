# Spec Plan: Fluxo Visual Limpo por Etapas e Recalibração do Motor de Matching Rede x OS (365)

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260903000029_recalibrate_match_stage2_rede_os.sql`:
  - [x] Implementar `match_stage2_rede_os(p_target_date date, p_store_id text)` com janela temporal estrita.
  - [x] Implementar cascata de 3 tiers (Tier 1 Cartão, Tier 2 Saldo Pendente, Tier 3 Total na Data Alvo).
  - [x] Implementar exclusão de OSs já pareadas (`match_status <> 'MATCHED'` e `v_matched_os_ids`).
  - [x] Implementar desempate determinístico por prevalência da data alvo e proximidade temporal de horário.
  - [x] Aplicar no banco remoto Supabase via CLI headless (`supabase db query --linked`).

- [x] [FRONTEND] Atualizar `src/components/importacoes/manual/Fase1PatioOsReview.tsx`:
  - [x] Adicionar controle de estado `viewMode: 'drop' | 'review'` e `hasInitialLoaded`.
  - [x] Renderizar estado limpo (Card Dropzone amplo e centralizado) quando sem dados.
  - [x] Ocultar dropzone após importação e exibir workspace completo com botão `[Reimportar]` no cabeçalho.

- [x] [FRONTEND] Atualizar `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`:
  - [x] Adicionar controle de estado `viewMode: 'drop' | 'review'` e `hasInitialLoaded`.
  - [x] Renderizar estado limpo de upload para vendas da Rede quando sem dados.
  - [x] Ocultar dropzone após importação e exibir conferência (vendas casadas, sobras e colisões) com botão `[Reimportar]`.

- [x] [FRONTEND] Atualizar `src/components/importacoes/manual/Fase3OfxReconciliation.tsx`:
  - [x] Adicionar controle de estado `viewMode: 'drop' | 'review'` e `hasInitialLoaded`.
  - [x] Renderizar estado limpo de upload para os 10 arquivos OFX quando sem dados.
  - [x] Ocultar dropzone após importação e exibir conferência de compensações e PIX com botão `[Reimportar]`.

- [x] [FRONTEND] Atualizar `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx`:
  - [x] Adicionar controle de estado `viewMode: 'drop' | 'review'` e `hasInitialLoaded`.
  - [x] Renderizar estado limpo de upload para planilha de contas a pagar com opção de pular direto para conferência.
  - [x] Ocultar dropzone após importação e exibir conferência das saídas e selagem com botão `[Reimportar]`.

- [x] [TEST] Validação e Quality Gate:
  - [x] Executar typecheck e build (`bun run build`).
  - [x] Testar a RPC `match_stage2_rede_os` no banco remoto.
