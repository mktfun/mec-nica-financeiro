# Spec Plan: Paridade de Elegibilidade entre Matcher Automático e Manual e Desvinculação Consistente (Spec 466 — Revisão Final)

## Tasks de Execução Sequencial

### [TEST-SETUP / ISOLAMENTO]
- [x] Task 1: Criar suíte de testes de integração no banco descartável cobrindo os 8 cenários determinísticos
  - **Arquivo:** `tests/integration/matcher-eligibility-parity.test.mjs`
  - **Skill:** `backend-patterns`
  - **Critério de Verificação:** Executar testes em escopo descartável (`test-store-*`, `2099-xx-xx`):
    1. **Paridade Jabaquara OS 443:** OS 100% paga com `match_status = 'MATCHED'` residual e sem POS vinculado é pareada 1:1 por `match_stage2_rede_os` e aceita por `get_rede_os_eligible_candidates`.
    2. **Isolamento por Loja:** Loja A vinculou OS 443; Loja B tem OS 443 desvinculada e vincula normalmente sem interferência.
    3. **Preservação de Vínculos Válidos Existentes:** OS já vinculada não é sobrescrita nem consumida duplamente.
    4. **Vínculo Órfão em `conciliation_matches`:** Registro em `conciliation_matches` apontando para POS inexistente ou desvinculada é ignorado e não bloqueia a OS.
    5. **Baixa Parcial e Desvinculação Repetida:** OS em aberto que recebe baixa parcial grava o valor efetivo em `divergence_amount`; desvinculação restaura o saldo exato pré-vínculo; segunda desvinculação repetida é no-op seguro e idempotente.
    6. **Desvinculação Informativa e Liberação Estrita de Modalidade:** OS já quitada antes do vínculo mantém seu `paid_value` 100% preservado; venda de crédito estorna apenas `consumed_credit`; venda de débito estorna apenas `consumed_debit`; status transiciona para `'pending'`.
    7. **Detecção de Colisões Bidirecionais:** Bloqueio de auto-match em casos de ambiguidade (múltiplas OSs ou múltiplos POSs).
    8. **Ciclo Completo da Spec 465:** Valida que o fluxo de importação → incremento real → match → purge → reimportação da Spec 465 permanece íntegro.

### [DATABASE / DDL]
- [x] Task 2: Criar migration canônica de paridade Rede × OS (atualizando as 4 funções existentes in-place)
  - **Arquivo:** `supabase/migrations/20261001000005_paridade_elegibilidade_matcher_e_desvinculo.sql`
  - **Skill:** `database`
  - **Critério de Verificação:**
    - Atualiza `match_stage2_rede_os`: remove `COALESCE(p.match_status, '') <> 'MATCHED'`, substitui por verificação de vínculos reais e indexação por `(store_id, os_number)`.
    - Atualiza `get_rede_os_eligible_candidates`: alinha fórmula de disponibilidade e verificação de vínculos reais anti-órfão.
    - Atualiza `link_manual_rede_to_os`: grava em `conciliation_matches` o `status` (`'baixa_aplicada'` vs `'vinculo_informativo'`) e `divergence_amount` (`v_actually_applied`).
    - Atualiza `unlink_manual_os_match`: na ausência de `'baixa_aplicada'`, não deduz valores do pátio; em baixa parcial reverte estritamente `divergence_amount`; libera exclusivamente a modalidade correta; define `match_status = 'pending'`; garante idempotência.
    - Preserva integralmente o rollback canônico em `specs/466-paridade-elegibilidade-rede-os-e-desvinculo/rollback_20261001000005.sql`.

### [DATABASE / VALIDAÇÃO EM BANCO DESCARTÁVEL]
- [x] Task 3: Executar funções SQL reais no banco descartável antes de qualquer consideração para produção
  - **Skill:** `database`
  - **Critério de Verificação:** `node --test tests/integration/matcher-eligibility-parity.test.mjs` executa com 100% de aprovação no ambiente descartável (`test-store-*`, `2099-xx-xx`).
  - **Gate Rígido:** Se o banco descartável estiver indisponível ou inacessível, o status será marcado categoricamente como **NÃO VERIFICADO** e o apply será interrompido.

### [INTEGRAÇÃO & QUALITY GATE]
- [x] Task 4: Executar Quality Gate completo via terminal (Todas as suítes de regressão + Build Gate)
  - **Skill:** `sdd-apply`
  - **Critério de Verificação:**
    ```powershell
    node --test tests/integration/os-payment-import-baseline.test.mjs tests/integration/os-import-reset-reimport.test.mjs tests/integration/matcher-rede-os-diagnostics.test.mjs tests/integration/matcher-eligibility-parity.test.mjs
    npm run build
    ```
    Saída com código de retorno 0 em todos os testes e compilação limpa do Vite/TypeScript.

### [FINALIZAÇÃO & APRESENTAÇÃO DE DIFF]
- [/] Task 5: Apresentar relatório de diff cirúrgico e resultados dos gates para aprovação humana
  - **Critério de Verificação:** Apresentação clara do diff restrito às 4 funções e aos testes.
  - **Travas Ativas:** ZERO deploy em produção, ZERO commits, ZERO push. Hard stop imediato.

