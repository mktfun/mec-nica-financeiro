# 📋 Plano de Execução Técnica — Spec 456: Lançamento Manual e Edição Ágil de Pagamentos de OS

## Fase 1: Backend & Persistência Atômica [DB/BACKEND]
- [x] Task 1.1: Criar a migração `supabase/migrations/20260930000004_canonical_os_payment_launch_and_sync.sql` com a RPC `register_or_update_os_payments` atualizando `patio_os`, `os_import_observations`, `store_cash_vault` e executando o recálculo do pátio de forma idempotente e atômica.
  - *Skill Canônica:* `database`
  - *Verificação:* `apply_migration` executada com sucesso
- [x] Task 1.2: Criar o helper TypeScript `src/lib/osPaymentPersistence.ts` com funções para converter entradas parciais em valores consolidados por categoria (`credit_value`, `debit_value`, `pix_transfer_value`, `cash_value`), montar a string canônica de `payment_method` e acionar a RPC do Supabase com tratamento de erros.
  - *Skill Canônica:* `backend-patterns`
  - *Verificação:* `node --test tests/e2e/tier2_boundary/spec456_os_payment_launch.test.mjs`

## Fase 2: Componentes & Telas de Usuário [FRONTEND]
- [x] Task 2.1: Criar o componente modal `src/components/conciliacao/OsPaymentLaunchModal.tsx` com interface moderna em Dark UI Zinc-950, permitindo edição do Total da OS, adição de múltiplas formas de pagamento, atalho para completar restante e resumo financeiro em tempo real.
  - *Skill Canônica:* `frontend-design-pro`
  - *Verificação:* `npm run build`
- [x] Task 2.2: Atualizar `src/components/conciliacao/StoreOrdensServicoView.tsx` removendo a dependência de `CadastrarTransferenciaOsModal.tsx` e substituindo o botão de cartão de parcelas por um botão destacado "Lançar / Editar Pagamentos" conectado ao `OsPaymentLaunchModal`.
  - *Skill Canônica:* `frontend-design-pro`
  - *Verificação:* `npm run build`
- [x] Task 2.3: Atualizar `src/components/conciliacao/OsDetailModal.tsx` adicionando botão de ação para abrir o `OsPaymentLaunchModal`, permitindo ajustar os pagamentos da OS a partir de qualquer visualização (incluindo `/patio`).
  - *Skill Canônica:* `frontend-design-pro`
  - *Verificação:* `npm run build`
- [x] Task 2.4: Atualizar `src/components/importacoes/MissingPatioOsEditor.tsx` desbloqueando o campo de valor pago e adicionando botão de ação para lançar a forma de pagamento e valor das OSs em serviço na virada de pátio.
  - *Skill Canônica:* `frontend-design-pro`
  - *Verificação:* `npm run build`

## Fase 3: Quality Gate & Testes Automatizados [SECURITY/TEST]
- [x] Task 3.1: Criar a suíte de testes `tests/e2e/tier2_boundary/spec456_os_payment_launch.test.mjs` cobrindo split payments (crédito + pix), recálculo de status, sincronização de deltas para o matcher da Rede e consistência matemática.
  - *Skill Canônica:* `backend-patterns`
  - *Verificação:* `cmd.exe /c "node --test tests/e2e/tier2_boundary/spec456_os_payment_launch.test.mjs"`
- [x] Task 3.2: Executar o Terminal Gate de compilação de produção (`npm run build`) para assegurar 0 erros de TypeScript e empacotamento completo.
  - *Skill Canônica:* `deploy-production`
  - *Verificação:* `cmd.exe /c "npm run build"`
