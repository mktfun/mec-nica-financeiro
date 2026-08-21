# Arquivamento & Registro Final da Spec 248
## Gestão de Dinheiro em Cofre/Trânsito com Botão de Baixa & Redesign Amplo 2XL do Modal de Saldos

---

### 1. 🎯 Contexto e Objetivos Atingidos
1. **Regra Contábil no PostgreSQL / Supabase:**
   * Todas as regras de negócio de consolidação contábil, saldo de bancos OFX, dinheiro físico em trânsito (`store_cash_vault`) e cartões a compensar (`get_store_pos_triple_reconciliation`) foram migradas e centralizadas na RPC `get_daily_reconciliation_summary(p_date)`.
   * Removidas todas as lógicas manuais ou condicionais ad-hoc do frontend.

2. **Tabela `store_cash_vault`:**
   * Criada tabela para controle de custódia física de dinheiro nas filiais (`status IN ('em_transito', 'depositado', 'cancelado')`).
   * Registrado o dinheiro em trânsito de R$ 1.900,00 da filial Rudge Ramos (OS #8736).
   * O dinheiro persiste somando no patrimônio do cofre nos dias subsequentes até o momento do depósito.

3. **Botão de Baixa de Depósito no Modal:**
   * Implementado o botão **`[ Dar Baixa 💸 ]`** na linha da filial correspondente dentro de `SaldoBancosDetailModal`.
   * Ao clicar e confirmar, a mutação no Supabase marca o status como `depositado` e registra `deposited_at = now()`, invalidando o cache do React Query instantaneamente.

4. **Redesign Amplo (2XL — 1152px) & Tokens do Design System:**
   * Corrigido o modal que abria espremido em tamanho de celular (`size="md"` / 448px) para o padrão visual amplo `size="2xl"` (1152px).
   * Migradas todas as cores e bordas para as variáveis oficiais da aplicação (`var(--bg-surface-elevated)`, `var(--border-subtle)`, `var(--bg-canvas)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--color-primary)`).
   * Card 1 do Pilar de Saldos reestilizado com tipografia tabular-nums, espaçamento respirado e indicadores nítidos.

---

### 2. 🗄️ Arquivos Alterados e Criados

* `supabase/migrations/20260821000001_complete_rpc_clean_accounting.sql`: Migração base da RPC limpa.
* `supabase/migrations/20260821000002_store_cash_vault.sql`: Tabela `store_cash_vault` e atualização da RPC com persistência de cofre e baixa.
* `src/components/conciliacao/SaldoBancosDetailModal.tsx`: Modal amplo 2XL com tabela arejada, tokens oficiais e botão de baixa de depósito.
* `src/components/conciliacao/ResumoDiaPanel.tsx`: Card do Pilar 1 integrado ao Design System.

---

### 3. 🧪 Validações Realizadas
* Execução de migration no Supabase via Management API: HTTP 201 (Sucesso).
* Build do projeto via `npm run build`: Código 0 (Sucesso).
* Commit e push para o repositório GitHub `origin/main`.
