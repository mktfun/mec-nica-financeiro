# Walkthrough: Segregação de Devoluções Rede e Âncora Temporal de OS no Pátio (Spec 240)

## 🎯 O que foi implementado

Implementamos duas correções estruturais críticas no motor de conciliação financeira:

---

### 1. 💳 Segregação Contábil de Devoluções/Estornos da Maquininha Rede (Pilar 5)
- **Tabela `pos_transactions`:** Adicionada coluna `transaction_type text NOT NULL DEFAULT 'venda' CHECK (transaction_type IN ('venda', 'devolucao'))`.
- **RPC `get_store_pos_triple_reconciliation(p_date)`:**
  - Estornos e devoluções são excluídos de `rede_liquido` e `total_nao_entrou` (Pilar 1).
  - Retorna `total_devolucoes` consolidado e `rede_devolucoes` loja a loja.
- **RPC `get_daily_reconciliation_summary(p_date)`:**
  - As devoluções são somadas diretamente a `v_subtotal_contas` no Pilar 5 (Contas do Dia / Contas a Pagar).
- **Parsers & Hooks:**
  - `redeParser.ts` e `useTransactions.ts` detectam estornos por valor negativo (`net_amount < 0`) e por palavras-chave (`devolu|estorn|cancel|chargeback|reversal`).
- **UI:**
  - `ResumoDiaPanel.tsx`: Sub-linha `Devoluções REDE: - R$ X` no Pilar 5.
  - `MaquininhasDetailModal.tsx`: 5º KPI Card `Devoluções / Estornos` (badge Pilar 5) e indicador na tabela.

---

### 2. ⏳ Janela Temporal & Isolamento Retroativo de OS no Pátio (`patio_os`)
- **Tabela `patio_os`:** Adicionada coluna `last_payment_date date` com índice para consultas históricas.
- **`useImportProcessor.ts` & `CentralImportWizard.tsx`:** Ao importar OSs com pagamentos ou registrar deltas (`delta_paid > 0`), grava `last_payment_date = targetDate`.
- **RPCs `get_daily_reconciliation_summary` & `get_store_pos_triple_reconciliation`:**
  - Na apuração do saldo pendente do pátio (`total_value - paid_value`), se `last_payment_date > p_date` (pagamento realizado no futuro), o pagamento é desconsiderado naquela data retroativa, mantendo o saldo devedor intacto no passado.

---

## 🧪 Validação
- Migrations `20260819000000_fix_devolucoes_rede_temporal.sql` e `20260819000001_fix_rpcs_devolucoes_temporal.sql` aplicadas e testadas com sucesso no PostgreSQL via Supabase API.
- `npm run build` compilado com sucesso (código 0).
- Grafo de dependências (`graphify update`) atualizado.
