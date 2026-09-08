# SDD Proposal: 327-resolucao-saidas-orfas-e-vinculo-contas-despesas

## 1. Sumário Executivo & Diagnóstico Forense

### 1.1 O Problema
Ao rodar a conciliação diária, o sistema apresenta um número desproporcional de transações sem conciliação: **19 Saídas Órfãs** contra apenas **5 Entradas Órfãs**. 
A investigação forense revelou três causas-raiz combinadas que geram esse afunilamento:
1. **Desconexão de Persistência no Wizard (`CentralImportWizard.tsx`):**
   No Step 2 do Wizard de Importação, a função `executeExpenseAutoMatching` roda em memória e sugere casamentos entre débitos bancários e contas a pagar (`daily_manual_bills`). Contudo, no Step 8 (gravação final no Supabase em `CentralImportWizard.tsx`), a montagem do array de inserção (`txsToInsert`) **descarta sumariamente o campo `matched_bill_id`**. 100% dos débitos são gravados com `matched_bill_id = NULL`, forçando todas as despesas a chegarem órfãs na tela de conciliação diária.
2. **Cegueira da RPC `auto_match_daily_transactions` para Saídas Operacionais Recorrentes:**
   A FASE 0 da RPC `auto_match_daily_transactions` possui auto-tagging corporativo apenas para transações de ENTRADA (`type = 'in'`). Para SAÍDAS (`type = 'out'`), a RPC ignora as transações que compõem a rotina diária das lojas:
   - **SISPAG SALARIOS** (ex: 6 transações na amostra somando > R$ 28.000): Folha de pagamento não consta na planilha de fornecedores de autopeças (`BuscaContasAPagar.xls`) e deve ser auto-categorizada como `Folha de Pagamento / Salários` (`contabilizar_no_subtotal = true`).
   - **SAQUE DIN ATM / SAQUE LOT** (ex: 5 transações na amostra): Saques em caixas eletrônicos para suprimento de troco/caixa da loja física. Devem ser categorizados como `Suprimento de Caixa / Saque Loja` com `contabilizar_no_subtotal = false` (para evitar duplicidade matemática com o dinheiro apurado no cofre físico).
   - **PAGAMENTOS BRASICAR / HD / MHE / TRANSF ENTRE CONTAS**: Movimentações intercompany entre filiais e matriz, devendo ser marcadas como `Transferência Intercompany` com `contabilizar_no_subtotal = false`.
   - **TARIFAS / IOF / DÉBITO SEGURO / BLOQUEIO PIX**: Despesas bancárias institucionais que devem ser auto-justificadas como `Tarifas & Encargos Bancários` (`contabilizar_no_subtotal = true`).
   - **Boletos com divergência textual ou temporal** (ex: `BOLETO PAGO SUPRALIMP`, `ROYCE`, `NOVA DANIEL`, `MARCIO CASTRO`): Constavam na planilha de contas a pagar, mas a RPC não casava por divergência estrita de string entre o cedente bancário e a razão social da planilha.
3. **Fadiga de UX no Step de Justificativas (`Step2NonRevenueJustifications.tsx`):**
   A tela exibe 19 cards abertos de uma vez só, exigindo 19 cliques manuais e roundtrips individuais ao Supabase. Não há barra de ações em lote (`[⚡ Auto-Categorizar Operacionais]` e `[🔗 Confirmar Vínculos Sugeridos]`), nem busca rápida integrada às contas da loja.

---

## 2. Objetivos & Requisitos

### 2.1 Requisitos Funcionais (RF)
- **RF-01 (Persistência no Wizard):** Garantir que o `CentralImportWizard.tsx` persista no Supabase (`ofx_transactions.matched_bill_id` e flag de conciliação) todos os vínculos gerados pelo matcher em memória.
- **RF-02 (Expansão da RPC `auto_match_daily_transactions` / `auto_match_saidas`):** 
  - Adicionar FASE 0-SAÍDAS para auto-categorização inteligente de débitos bancários recorrentes (`SISPAG SALARIOS`, `SAQUE DIN ATM`, `PAGAMENTOS ENTRE FILIAIS`, `TARIFAS/IOF/SEGUROS`).
  - Reforçar o matching de boletos por tolerância exata de valor (R$ 0,05) e fuzzy matching de texto (ex: `SUPRALIMP`, `ROYCE`, `NOVA DANIEL`, `MARCIO CASTRO`).
- **RF-03 (Ações em Lote na UI de Saídas Órfãs):**
  - Adicionar na interface de justificativas de saídas (`Step2NonRevenueJustifications.tsx` e `StoreExtratoBancarioView.tsx`) a barra superior com contadores inteligentes e 2 botões de ação em lote:
    - `[⚡ Auto-Justificar Operacionais (N)]`: resolve salários, saques, tarifas e intercompany em 1 clique.
    - `[🔗 Confirmar Casamentos de Boletos (M)]`: vincula com 1 clique todas as despesas com match de alta confiança sugeridas com `daily_manual_bills`.
- **RF-04 (Vínculo Manual com Busca Rápida):**
  - Nos cards individuais que restarem órfãos, disponibilizar seletor tipo busca rápida de contas a pagar da mesma loja/data (`daily_manual_bills`), permitindo vincular com 1 clique ou criar nova categoria.
- **RF-05 (Anti-Duplicação Contábil & Fórmulas dos 5 Pilares):**
  - Definir rigorosamente `contabilizar_no_subtotal`:
    - `true` para despesas reais da loja (Salários, Boletos, Tarifas, Manutenção).
    - `false` para movimentações financeiras neutras (Saques para suprimento de cofre, Transferências entre contas/lojas), prevenindo furos no `dif_saidas` e saldo da matriz.

---

## 3. Análise de Reuso & Não-Proliferação de Código
- **Zero Tabelas Novas:** Reutilização total das tabelas existentes: `ofx_transactions` e `daily_manual_bills`.
- **Zero RPCs Concorrentes:** Refatoração in-place da migration da RPC existente `auto_match_daily_transactions` e `auto_match_saidas`.
- **Zero Telas Paralelas:** Refatoração e enriquecimento dos componentes existentes `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx` e `src/components/conciliacao/StoreExtratoBancarioView.tsx`.
- **Design System:** Rigoroso padrão Dark UI Zinc-950, ícones Lucide e feedback tátil shadcn/ui.
