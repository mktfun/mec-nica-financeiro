# Spec-Plan: Unificar o Matcher Rede × OS, a Seleção Manual e o Diagnóstico (Spec 461)

## Domínio 1: [DB] Banco de Dados & Procedimentos Armazenados (Skill: `database`)

- [x] Completed: Criar migration `supabase/migrations/20261001000002_unify_rede_os_matcher_and_diagnostics.sql`
  - Reimplementar `public.get_rede_os_eligible_candidates` com:
    - Qualificação completa de todas as colunas (eliminando erro 42702 em `payment_method`).
    - Substituição de tabelas temporárias por CTEs para evitar conflitos de sessão (`relation already exists`).
    - Normalização de acentos via `TRANSLATE` para detecção de modalidades `cred` e `deb`.
    - Retorno de linha de base e consumo contábil (`credit_before`, `credit_after`, `consumed_credit`, `debit_before`, `debit_after`, `consumed_debit`).
    - Tratamento de modalidade desconhecida com `unrecognized_modality`.
  - Reimplementar `public.match_stage2_rede_os` com:
    - Verificação de unicidade bidirecional (1:1) prevenindo falsos pareamentos por ordem de loop quando houver múltiplas vendas POS disputando a mesma OS.
    - Normalização de acentos e separação de consumo por modalidade.
    - Registro de amostras e retornos unificados (`matched_count`, `pos_matched`, `matched_pos_count`, `collisions`).
  - Reimplementar `public.auto_match_daily_transactions` com:
    - Captura e propagação de erros em `v_stage2_result` via `stage2_error` (sem converter exceções silenciosamente em zero matches).
    - Retorno duplicado e retrocompatível de chaves (`pos_matched` e `matched_pos_count`, `pix_matched` e `matched_pix_count`).
  - Atualizar `public.link_manual_rede_to_os` e `public.unlink_manual_os_match` com a mesma normalização de acentos para gravação e estorno fidedignos de `consumed_credit` e `consumed_debit`.
  - Verificação Terminal: Executar a migration no Supabase via MCP `execute_sql` ou CLI e testar chamada de `get_rede_os_eligible_candidates` confirmando zero erro 42702.

---

## Domínio 2: [BACKEND] Motor em Memória & Regras de Correspondência (Skill: `backend-patterns`)

- [x] Completed: Refatorar `src/lib/matchers/autoMatchingEngine.ts`
  - Remover soma cega de `credit + debit` no Tier 1 (avaliar estritamente a modalidade correspondente da venda).
  - Remover fallback de Tier 3 por `paid_value` ou `total_value` para transações de cartão.
  - Implementar verificação de ambiguidade bidirecional entre candidatos de maquininha e OSs na filial.
  - Verificação Terminal: `npm run build` passa sem erros de tipagem.

---

## Domínio 3: [FRONTEND-HOOK] Camada de Dados e Tratamento de Erros (Skill: `frontend-design-pro`)

- [x] Completed: Atualizar hook `src/hooks/useManualMatch.ts`
  - Eliminar fallback silencioso para `patio_os` quando a RPC de candidatos retornar erro.
  - Propagar erro da RPC com mensagem descritiva para ativar `isError: true` no TanStack Query.
  - Atualizar interface `StoreOsCandidate` para incluir os campos diagnósticos de decomposição contábil.
  - Verificação Terminal: `npm run build` confirma compatibilidade de tipos.

---

## Domínio 4: [FRONTEND-MODAL] Interface Transparente de Seleção Manual (Skill: `frontend-design-pro`)

- [x] Completed: Refatorar `src/components/conciliacao/ManualMatchOsModal.tsx`
  - Eliminar fallbacks que substituíam `available_card_amount === 0` por saldo ou valor total da OS.
  - Remover o badge ilusório "Match por Valor" e o realce esmeralda/azul para OSs sem delta disponível.
  - Exibir barra diagnóstica de linha de base contábil (`Base`, `Acumulado`, `Incremento`, `Consumido`, `Disponível`).
  - Implementar diálogo de confirmação de segurança para vínculos manuais excepcionais de OSs sem incremento.
  - Renderizar banner de erro recuperável com botão "Tentar Novamente" quando o hook reportar erro de RPC.
  - Verificação Terminal: `npm run build` limpo e verificação de classes semânticas Tailwind Zinc-950.

---

## Domínio 5: [FRONTEND-WIZARD] Assistente de Importação & Revisão (Skill: `frontend-design-pro`)

- [x] Completed: Atualizar `src/components/importacoes/CentralImportWizard.tsx` e `Fase2RedeVsOsReview.tsx`
  - Ler contagens de pareamento com fallbacks seguros para ambas as nomenclaturas de chaves (`matched_pos_count ?? pos_matched`).
  - Identificar se a resposta contém `stage2_error` e registrar aviso no log visual da esteira em vez de mascarar como "nenhuma OS casada".
  - Verificação Terminal: `npm run build` limpo.

---

## Domínio 6: [TEST & VERIFICATION] Testes Automatizados & Quality Gate (Skill: `database` & `security`)

- [x] Completed: Criar suíte de testes de integração `tests/integration/matcher-rede-os-diagnostics.test.mjs`
  - Testar chamada à RPC `get_rede_os_eligible_candidates` com transações reais de crédito e débito acentuadas.
  - Testar concorrência bidirecional com 2 vendas POS de mesmo valor disputando 1 incremento de OS.
  - Validar resposta de `auto_match_daily_transactions` com verificação estrita das chaves de contagem.
  - Executar `npm run build` garantindo zero erros de compilação.
  - Verificação Terminal: `node tests/integration/matcher-rede-os-diagnostics.test.mjs` retorna 100% de aprovação (9/9 testes passando).
