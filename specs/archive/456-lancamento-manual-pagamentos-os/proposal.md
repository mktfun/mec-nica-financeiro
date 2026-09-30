# 💡 Proposta de Engenharia — Spec 456: Lançamento Manual e Edição Ágil de Pagamentos de OS

## 1. Problema Diagnosticado

Nas telas de conciliação diária de loja (`StoreOrdensServicoView.tsx`), nos modais de detalhes de Ordem de Serviço (`OsDetailModal.tsx` na tela `/patio`) e na virada de pátio/importação (`MissingPatioOsEditor.tsx`), os operadores encontram graves limitações para registrar e ajustar os pagamentos reais das Ordens de Serviço:

1. **Bloqueio de Valores e Falta de Edição de Pagamentos:**
   - Em `MissingPatioOsEditor.tsx` (Veículos em Serviço no Pátio / Carryover na virada de pátio), o campo "Valor Pago" está bloqueado de forma rígida com classe `cursor-not-allowed select-none` e um tooltip de "🔒 Valor Pago Protegido", impedindo que pagamentos ocorridos na filial sejam inseridos.
   - Em `OsDetailModal.tsx` (aberto pelo Pátio `/patio` e pelas telas de conciliação), os valores são estritamente somente-leitura, contendo apenas o botão binário "Marcar como ENTROU (Baixa Manual)", sem possibilidade de lançar ou retificar valores por forma de pagamento.

2. **Fluxo Inadequado de Parcelas em vez de Pagamentos de OS:**
   - Em `StoreOrdensServicoView.tsx`, existe um botão roxo com ícone `CreditCard` que abre o modal `CadastrarTransferenciaOsModal.tsx` exigindo desdobramento em parcelas com vencimentos futuros de transferência em conta. Esse fluxo é inadequado para o dia a dia da loja física e não atende à necessidade real do operador de lançar os pagamentos que liquidaram a OS.
   - O botão "Editar" na linha dessa mesma tela edita apenas os campos brutos `total_value` e `paid_value` e um único dropdown genérico de forma, mas **NÃO popula** as colunas numéricas categorizadas (`credit_value`, `debit_value`, `pix_transfer_value`, `cash_value`).

3. **Quebra na Conciliação e no Matcher Automático:**
   - Os motores de matching automático (`autoMatchingEngine.ts`) e a RPC canônica da maquininha Rede (`get_rede_os_eligible_candidates` / `match_stage2_rede_os`) dependem compulsoriamente das colunas discriminadas (`credit_value`, `debit_value`, `pix_transfer_value`) e dos registros em `os_import_observations` (`delta_credit`, `delta_debit`, `delta_pix`).
   - Quando um operador ajusta ou cria uma OS manualmente, a ausência dessas colunas impede que o sistema cruze a venda da maquininha ou o extrato PIX com a OS. A transação fica pendente/órfã mesmo tendo o valor exato no total pago.

---

## 2. Solução Proposta

Criar um fluxo canônico, rápido e intuitivo para lançamento e edição de pagamentos de OSs, com as seguintes ações arquiteturais:

1. **Novo Modal Canônico de Lançamento e Edição de Pagamentos (`OsPaymentLaunchModal.tsx`):**
   - Modal com suporte a pagamentos simples e mistos (ex.: R$ 1.000,00 no Crédito + R$ 497,34 no PIX).
   - Permite retificar o **Valor Total da OS** (`total_value`).
   - Permite adicionar, editar e remover lançamentos por forma de pagamento (`Cartão Crédito`, `Cartão Débito`, `PIX`, `Dinheiro`, `Transferência`, `Boleto`).
   - Atalho "Completar Restante" com um clique para preencher o saldo em aberto.
   - Resumo financeiro em tempo real (Total OS, Total Pago, Saldo em Aberto, Status projetado).

2. **RPC Atômica no Banco de Dados (`register_or_update_os_payments`):**
   - Persiste em `patio_os`:
     - Atualiza colunas discriminadas: `credit_value`, `debit_value`, `pix_transfer_value`, `cash_value`.
     - Atualiza `paid_value` como a soma exata das parcelas pagas.
     - Atualiza `total_value`.
     - Formata `payment_method` na convenção canônica (ex.: `"Credito: 1000.00; PIX: 497.34"`).
     - Atualiza `status` (`finalizado`, `pago_parcial`, `em_aberto`).
     - Atualiza `last_payment_date`.
   - Sincroniza `os_import_observations` (se houver data de conciliação / filial informada):
     - Atualiza `credit_after`, `delta_credit`, `debit_after`, `delta_debit`, `pix_after`, `delta_pix`, `paid_after`, `delta_paid`, garantindo que o Matcher Automático e a tela de Vínculo Manual reconheçam a OS como 100% elegível imediatamente.
   - Sincroniza `store_cash_vault` para valores em dinheiro na data.
   - Executa `recompute_patio_for_date_and_store` para atualizar `reconciliations` e `daily_snapshots`.

3. **Substituição e Unificação nos Pontos de Acesso:**
   - **`StoreOrdensServicoView.tsx`:** Remover a dependência de `CadastrarTransferenciaOsModal` e substituir o botão de cartão de parcelas por um botão visível e destacado de "Lançar / Editar Pagamentos" que abre o `OsPaymentLaunchModal`.
   - **`OsDetailModal.tsx`:** Adicionar botão de ação "Lançar / Editar Pagamento" permitindo abrir o modal a partir do Pátio (`/patio`) e de qualquer visualização de conciliação.
   - **`MissingPatioOsEditor.tsx`:** Desbloquear o campo de pagamento e incluir botão "Lançar" para registrar a forma e o valor na virada de pátio.

---

## 3. Skills Especializadas Aplicadas

- `frontend-design-pro`: Padrões de Dark UI Zinc-950, superfícies elevadas, tipografia mono tabular para valores monetários, badges semânticos e conformidade com os princípios de Rauno Freiberg.
- `lazyweb`: Pesquisa competitiva de UX de modais de split payment e pagamento de transações financeiras (referência validada: Monarch Money siteId 242533).
- `backend-patterns`: Mutações atômicas, tipagem estrita de inputs e invalidação seletiva de cache com TanStack Query.
- `database`: Migração PostgreSQL idempotente (`register_or_update_os_payments`), RLS multi-tenant e recálculo sincronizado de pátio.

---

## 4. Contratos de Dados & Interfaces

### 4.1. RPC PostgreSQL: `register_or_update_os_payments`
```sql
CREATE OR REPLACE FUNCTION public.register_or_update_os_payments(
    p_os_id UUID,
    p_total_value NUMERIC,
    p_credit_value NUMERIC DEFAULT 0,
    p_debit_value NUMERIC DEFAULT 0,
    p_pix_transfer_value NUMERIC DEFAULT 0,
    p_cash_value NUMERIC DEFAULT 0,
    p_other_value NUMERIC DEFAULT 0,
    p_payment_method_text TEXT DEFAULT NULL,
    p_target_date DATE DEFAULT NULL
)
RETURNS JSONB
```

### 4.2. Tipagem TypeScript do Payload de Lançamento
```typescript
export interface OsPaymentEntry {
  category: 'credito' | 'debito' | 'pix' | 'dinheiro' | 'transferencia' | 'boleto' | 'outro';
  label: string;
  value: number;
}

export interface RegisterOsPaymentInput {
  osId: string;
  storeId: string;
  osNumber: string;
  totalValue: number;
  entries: OsPaymentEntry[];
  targetDate?: string;
}
```

---

## 5. Arquivos Afetados & Blast Radius

| Arquivo | Ação | Justificativa |
|---|:---:|---|
| `supabase/migrations/20260930000004_canonical_os_payment_launch_and_sync.sql` | **CRIAR** | RPC atômica para persistência no `patio_os`, `os_import_observations`, `store_cash_vault` e recálculo de pátio. |
| `src/lib/osPaymentPersistence.ts` | **CRIAR** | Helper frontend com regras de consolidação de entradas, formatação de string canônica e chamada da RPC/Supabase. |
| `src/components/conciliacao/OsPaymentLaunchModal.tsx` | **CRIAR** | Modal interativo de edição do total da OS e adição/remoção de formas de pagamento. |
| `src/components/conciliacao/StoreOrdensServicoView.tsx` | **EDITAR** | Substituir o botão de cartão de parcelas (`CadastrarTransferenciaOsModal`) pelo `OsPaymentLaunchModal`. |
| `src/components/conciliacao/OsDetailModal.tsx` | **EDITAR** | Adicionar botão para abrir o `OsPaymentLaunchModal` a partir do Pátio e da conciliação. |
| `src/components/importacoes/MissingPatioOsEditor.tsx` | **EDITAR** | Desbloquear edição de valor pago e integrar o lançamento de formas de pagamento. |
| `tests/e2e/tier2_boundary/spec456_os_payment_launch.test.mjs` | **CRIAR** | Testes de unidade/limites para cálculo de split payments, formatação e elegibilidade no matcher. |

---

## 6. Evidência e Decisão

- `StoreOrdensServicoView.tsx:L695-705` (`setTransferModalData` / `CadastrarTransferenciaOsModal`):
  - **Decisão:** Substituir pelo `OsPaymentLaunchModal`.
  - **Motivo:** O usuário indicou explicitamente que a tela de parcelas com cartão não tem utilidade operacional e pediu a substituição por um fluxo para editar e salvar pagamentos da OS.
- `MissingPatioOsEditor.tsx:L281-293` (campo protegido de valor pago):
  - **Decisão:** Editar para desbloquear o valor e permitir lançar a forma de pagamento.
  - **Motivo:** O bloqueio impedia o ajuste de valores de OSs herdadas no pátio.
- `OsDetailModal.tsx:L198-220` (ações da OS):
  - **Decisão:** Editar adicionando o botão "Lançar / Editar Pagamento".
  - **Motivo:** Centraliza a capacidade de ajuste em qualquer tela onde a OS seja detalhada.

---

## 7. Plano de Rollback

Caso ocorra qualquer divergência ou inconsistência:
1. Reverter os arquivos modificados via Git (`StoreOrdensServicoView.tsx`, `OsDetailModal.tsx`, `MissingPatioOsEditor.tsx`).
2. Remover os arquivos novos criados em `src/components/conciliacao/OsPaymentLaunchModal.tsx` e `src/lib/osPaymentPersistence.ts`.
3. Executar `DROP FUNCTION IF EXISTS public.register_or_update_os_payments;` no banco.
4. Nenhuma OS histórica ou transação pré-existente sofre perda de dados.

---

## 8. Risco Principal & Mitigação

- **Risco:** O operador alterar o total da OS ou os pagamentos de uma OS já conciliada com venda de cartão da maquininha ou extrato bancário, desfazendo conciliações anteriores.
- **Mitigação:** Se a OS já possuir vínculos ativos com `pos_transactions` ou `transactions`, o modal exibirá um alerta informativo de proteção (`badge warning`), e a atualização preservará os vínculos já consumidos em `consumed_credit` / `consumed_debit`.
