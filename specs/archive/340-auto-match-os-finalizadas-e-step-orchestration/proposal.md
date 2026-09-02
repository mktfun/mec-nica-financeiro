# Proposal: Motor de Auto-Match com OSs Finalizadas, Direcionamento de Transações Corporativas e Orquestração Linear Determinística de Steps (340)

## Problema
1. **Falso Órfão de PIX e Cartões REDE no Step 1:**
   - 24 transações do dia 01/09/2026 (12 PIX e 12 Cartões REDE) não foram casadas pela RPC `auto_match_daily_transactions` porque o filtro SQL exigia estritamente `status ILIKE '%aberto%'` ou `status = 'PENDENTE'`.
   - No entanto, quando os relatórios do pátio são importados, as OSs liquidadas pelos clientes no dia (ex: Francisco Prado R$ 3.332, Wellington R$ 385, Enio Vinicius R$ 900, Leonardo R$ 3.000, Planalto R$ 1.812, Piraporinha R$ 5.300, etc.) chegam com `status = 'finalizado'` / `'finalizada'` e com `pix_transfer_value` ou `credit_value`/`debit_value` preenchidos. O motor ignorava essas OSs.
2. **Poluição de Transações Corporativas no Step 1:**
   - Transações bancárias como `EMPREST CAPITAL DE GIRO R$ 100.000,00`, `RECEBIMENTOS EMPORIO DO OLEO R$ 1.000,00` e `PAGTO ITAU SEGUROS R$ 11.208,87` são aportes, transferências e seguros (não são serviços de oficina) e apareciam no Step 1 em vez de serem direcionadas para o Step 2 (Justificativas).
3. **Pulo Inconsistente de Steps e Flash da Tela de Sucesso:**
   - Ao clicar em "Processar e Conciliar com IA" no Step 3, o `CentralImportWizard.tsx` setava `step = 8` (renderizando a tela final de sucesso) e, ao terminar a gravação assíncrona, setava `step = 4` (Step 1 do Wizard), gerando um flash de meio segundo da tela de sucesso que desaparecia sozinha.

## Solução Proposta (Foco em Reuso e Correção)
1. **Aperfeiçoamento da RPC `auto_match_daily_transactions` (`supabase/migrations/20260901000015_...sql`):**
   - Ampliar o escopo de casamento em `patio_os`:
     - Casar PIX e REDE contra OSs em aberto E OSs com `pix_transfer_value` / `credit_value` / `debit_value` correspondentes da mesma filial, independentemente do status textual ser `'em_aberto'`, `'pago_parcial'` ou `'finalizado'`.
     - Marcar `ofx_transactions` e `pos_transactions` com `matched_os_number`.
   - **Auto-Classificação de Transações Não-OS (Corporativas):**
     - Transações bancárias com termos como `EMPREST`, `CAPITAL DE GIRO`, `SEGURO`, `ITAU SEGUROS`, `TRANSFERENCIA`, `EMPORIO DO OLEO`, `APLIC`, `RESG`, `REND` recebem automaticamente `manual_category = 'OUTROS'` ou categoria correspondente e são excluídas da fila do Step 1 (Vínculo de OS), ficando prontas e pré-preenchidas para o Step 2 (Justificativas de Entradas).
2. **Eliminação do Flash do Step 8 e Orquestração Linear:**
   - No `handleConfirm` em `CentralImportWizard.tsx`:
     - Não acionar `setStep(8)`.
     - Manter o modal/overlay de progresso de gravação e, ao finalizar, transicionar suavemente diretamente para o Step 1 (`setStep(4)`).
     - Garantir que a navegação seja 100% controlada pelo usuário através dos botões de rodapé.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Reutilizadas:**
  - `public.auto_match_daily_transactions(p_date text)` (reaproveitada e expandida com suporte a OSs finalizadas com PIX/Cartão e detecção corporativa).
  - `patio_os`, `pos_transactions`, `ofx_transactions`, `conciliation_matches`, `daily_manual_bills`.
- **Componentes Frontend Reutilizados:**
  - `CentralImportWizard.tsx` (orquestração de steps e transições).
  - `Step1UnregisteredPayments.tsx` (tabela de vinculação manual residual).
  - `Step2NonRevenueJustifications.tsx` (justificativas com pré-categorização).

## Contratos de Dados & SQL (Supabase)
- **RPC `auto_match_daily_transactions(p_date text)`:**
  - Pareamento PIX: `ofx_transactions.amount` $\approx$ `patio_os.pix_transfer_value` OU `(total_value - paid_value)` OU texto OS.
  - Pareamento REDE: `pos_transactions.net_amount` ou `gross_amount` $\approx$ `patio_os.credit_value` / `debit_value` / `total_value`.
  - Auto-Tagging de Não-OS: `manual_category = 'OUTROS'` em `ofx_transactions` para aportes e seguros.

## API & Componentes (Frontend)
- `CentralImportWizard.tsx`:
  - `handleConfirm`: Remove `setStep(8)`.
  - `fetchRealUnmatchedTransactions`: Ignora transações marcadas com `manual_category` corporativa.

## Risco Principal e Mitigação
- **Risco:** Casar erroneamente duas transações de mesmo valor com a mesma OS.
- **Mitigação:** Cada match atualiza `matched_os_number` no registro correspondente e consome o saldo da OS de forma estritamente determinística por filial e lote.
