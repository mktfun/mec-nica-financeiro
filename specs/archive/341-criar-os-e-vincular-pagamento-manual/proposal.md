# Proposal: Criação de Nova OS com Baixa e Vínculo de Pagamento Manual no Wizard (341)

## Problema
No Step 1 do Wizard de Fechamento Diário (*Vínculo de Pagamentos sem OS*), quando sobram transações de PIX (OFX) ou Vendas de Cartão (REDE) que não casaram automaticamente com nenhuma Ordem de Serviço (porque a OS ainda não havia sido importada da planilha ou foi aberta avulsa na oficina), o operador precisa associar o pagamento a um serviço real.

Atualmente, o modal `ManualMatchOsModal` permite apenas pesquisar e vincular a OSs que já existam previamente em `patio_os`. Caso a OS não conste no banco de dados, o operador ficava travado sem poder criar a OS na hora, e também faltava garantia explícita de que, ao vincular, o valor do pagamento fosse adicionado exatamente à coluna correta de forma de pagamento (`pix_transfer_value`, `credit_value`, `debit_value`) atualizando o `paid_value` e o `status` da OS para abater o saldo corretamente.

## Solução Proposta (Foco em Reuso e Extensão)
1. **[BACKEND] Nova RPC Atômica `create_and_link_manual_os` (Migration 16):**
   - Cria a OS em `patio_os` na filial escolhida (se ainda não existir) com Número da OS, Cliente, Placa, Valor Total e Forma de Pagamento.
   - Aplica o pagamento da transação diretamente na coluna correspondente (`pix_transfer_value` para PIX, `credit_value` ou `debit_value` para Cartão).
   - Recalcula atomicamente `paid_value = LEAST(total_value, COALESCE(paid_value, 0) + link_amount)`.
   - Atualiza `status = CASE WHEN paid_value >= (total_value - 0.05) THEN 'finalizada' ELSE 'pago_parcial' END`.
   - Atualiza `matched_os_number` em `pos_transactions` ou `ofx_transactions`.
   - Registra o vínculo em `conciliation_matches`.

2. **[BACKEND] Reforço das RPCs Existentes `link_manual_pix_to_os` e `link_manual_rede_to_os`:**
   - Garantir que, ao vincular a uma OS já existente, os saldos e colunas de pagamento sejam recalculados e atualizados com a mesma precisão matemática.

3. **[FRONTEND] Extensão de `ManualMatchOsModal.tsx` com Sistema Dual de Abas [MODIFY]:**
   - **Aba 1 (🔍 Buscar OS Existente):** Mantém a pesquisa inteligente existente com score de similaridade e match por nome e valor.
   - **Aba 2 (➕ Criar Nova OS na Loja):** Formulário completo e elegante em Dark UI (Zinc-950) com:
     - Filial (Select com lista de lojas ativas, pré-selecionando a filial da transação).
     - Nº da OS (Input de texto/número obrigatório).
     - Nome do Cliente (Input de texto, pré-populado com a contraparte do PIX se disponível).
     - Placa do Veículo (Input de texto com auto-uppercase).
     - Valor Total da OS (Input monetário, pré-populado com o valor do pagamento por padrão).
     - Forma de Pagamento (Select 'PIX', 'Cartão Crédito', 'Cartão Débito').
     - Botão *"Criar OS e Vincular Pagamento"*.

4. **[FRONTEND] Extensão de `useManualMatch.ts` [MODIFY]:**
   - Adicionar método `createAndLinkOs` e invalidar caches de queries do TanStack (`patio_os`, `available_store_os`, `reconciliation_views`, `daily-reconciliation-summary`).

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Reutilizadas:**
  - Tabela `public.patio_os`: Reutilizada integralmente com suas colunas canônicas (`store_id`, `store_name`, `os_number`, `client_name`, `plate`, `total_value`, `paid_value`, `pix_transfer_value`, `credit_value`, `debit_value`, `cash_value`, `payment_method`, `status`, `match_status`).
  - RPCs `link_manual_pix_to_os` e `link_manual_rede_to_os` em `supabase/migrations/20260831000007_create_link_manual_pix_and_rede_rpcs.sql`: Serão aprimoradas para consistência matemática total.
- **Componentes / Hooks Existentes Reutilizados:**
  - Componente `ManualMatchOsModal.tsx`: Será estendido com a aba de criação sem alterar suas props públicas.
  - Componente `Step1UnregisteredPayments.tsx`: Mantém seu layout de grid e filtros, recebendo o feedback de sucesso imediato.
  - Hook `useManualMatch.ts`: Estendido com a mutation `createAndLinkOs`.

---

## Contratos de Dados & SQL (Supabase)

```sql
CREATE OR REPLACE FUNCTION public.create_and_link_manual_os(
    p_transaction_type TEXT, -- 'pix' | 'rede' | 'ofx'
    p_transaction_id UUID,
    p_store_id TEXT,
    p_os_number TEXT,
    p_client_name TEXT,
    p_plate TEXT,
    p_total_value NUMERIC,
    p_payment_method TEXT DEFAULT NULL,
    p_link_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB;
```

---

## Risco Principal e Mitigação
- **Risco:** Criar uma OS duplicada caso o operador digite o mesmo número de OS que já existe na filial.
- **Mitigação:** A RPC `create_and_link_manual_os` verifica primeiro se a OS já existe para aquele `store_id`. Se já existir, ela reaproveita o registro existente e apenas abate o novo pagamento, atualizando os saldos sem criar linhas duplicadas.
