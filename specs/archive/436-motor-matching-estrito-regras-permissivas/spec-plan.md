# 📝 Spec Plan — Spec 436: Motor de Matching Estrito & Eliminação de Falsos Positivos

## Tasks de Implementação

### [BACKEND] Motor de Matching Estrito em Memória
- [x] Completed <!-- id: 436-01 --> Refatorar `src/lib/matchers/autoMatchingEngine.ts`:
  - Eliminar os blocos de fallback permissivos (Tier 1.5 de match parcial frouxo, Tier 3 sem validação de nome e Tier 4 cego por valor).
  - Implementar validador de duplo fator estrito para PIX x OS: exigência cumulativa de mesma loja (`store_id`), forma de pagamento PIX na OS (`pix_transfer_value > 0`), delta de valor $\le 0,05$ e correspondência de identidade (`matchClientTokens` forte ou CPF/CNPJ).
  - Bloquear terminantemente adquirentes (`REDE`, `CIELO`, `STONE`, etc.), rendimentos (`REND PAGO`, `AUT APR`), transferências e tarifas de casarem com qualquer OS.
  - *Skill:* `backend-patterns`
  - *Critério de Verificação:* `npm run build` passa sem erros e testes de unidade de matching validam duplo fator.

### [FRONTEND] Saneamento do Wizard de Importação
- [x] Completed <!-- id: 436-02 --> Refatorar `src/components/importacoes/CentralImportWizard.tsx`:
  - Eliminar o loop cego de auto-matching das linhas 1539-1569 (`autoMatchMap`) que atribuía `matched_os_number` sem validação de nome e cruzava transações entre filiais diferentes.
  - Plugar a validação canônica de matching estrito ao registrar transações em `txsToInsert`.
  - *Skill:* `frontend-design-pro` & `backend-patterns`
  - *Critério de Verificação:* `npm run build` passa sem erros e importação de extrato não cria matches indevidos.

### [DB] Blindagem da RPC Autônoma de Fechamento
- [x] Completed <!-- id: 436-03 --> Atualizar a RPC `run_autonomous_reconciliation_loop` no Supabase:
  - Remover a inserção automática de registros em `daily_revenue_adjustments` (Step 3 do loop), impedindo que transações com termos como 'DANIEL', 'ROGERIO', 'RAPHAEL' ou 'APORTE' sejam injetadas no faturamento sem justificação humana.
  - *Skill:* `database`
  - *Critério de Verificação:* Chamada à RPC via SQL executa sem criar linhas espúrias em `daily_revenue_adjustments`.

### [SECURITY/TEST] Saneamento Forense de Dados & Validação Final
- [x] Completed <!-- id: 436-04 --> Executar saneamento no banco de dados e conferência final:
  - Desvincular matches inválidos em `ofx_transactions` para a data `2026-09-22` (remover vínculos espúrios da OS #609, OS #411 e OS #18472).
  - Rodar script de auditoria forense confirmando que apenas transações 100% legítimas dos 4 tipos permitidos possuem match.
  - Rodar o Terminal Gate (`npm run build`).
  - *Skill:* `security` & `database`
  - *Critério de Verificação:* Terminal Gate limpo com 0 erros de compilação e relatório forense comprovando zero matches espúrios no banco.
