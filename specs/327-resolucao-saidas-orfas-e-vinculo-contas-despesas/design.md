# SDD Design: 327-resolucao-saidas-orfas-e-vinculo-contas-despesas

## 1. Arquitetura de Dados & Contratos

### 1.1 Tabelas Existentes Envolvidas (Zero Novas Tabelas)
- **`ofx_transactions`**:
  - `id`: UUID (PK)
  - `amount`: NUMERIC (negativo para saídas bancárias / débitos)
  - `description`: TEXT (descrição crua do extrato bancário)
  - `matched_bill_id`: UUID (FK para `daily_manual_bills.id`)
  - `manual_category`: TEXT (categoria contábil: `Folha de Pagamento`, `Suprimento de Caixa`, `Tarifas & Encargos`, etc.)
  - `justification`: TEXT (justificativa da saída)
  - `contabilizar_no_subtotal`: BOOLEAN (se afeta o cálculo do `dif_saidas` e DRE da loja)
  - `is_reconciled`: BOOLEAN
  - `store_id`: UUID
  - `target_date`: DATE
- **`daily_manual_bills`**:
  - `id`: UUID (PK)
  - `store_id`: UUID
  - `bill_date`: DATE
  - `supplier_name`: TEXT
  - `amount`: NUMERIC
  - `status`: TEXT (`pending`, `paid`, `conciliated`)
  - `source`: TEXT (`manual`, `excel`, `import`)

---

## 2. Regras de Negócio & Algoritmo de Matching

### 2.1 Fase 0 de Saídas: Auto-Categorização de Débitos Operacionais Recorrentes
Transações com `amount < 0` e `matched_bill_id IS NULL` passam por regras determinísticas baseadas em padrões canônicos:

| Padrão no Extrato Bancário (`description`) | Categoria Atribuída (`manual_category`) | `contabilizar_no_subtotal` | Justificativa Padrão |
| :--- | :--- | :--- | :--- |
| `*SISPAG SALARIOS*`, `*FOLHA PAGTO*`, `*PAGTO SALARIO*` | `Folha de Pagamento / Salários` | `true` | Folha de pagamento de funcionários |
| `*SAQUE DIN ATM*`, `*SAQUE LOT*`, `*SAQUE BANCO24H*` | `Suprimento de Caixa / Saque Loja` | `false` | Saque em espécie para troco/caixa da filial (não duplica cofre) |
| `*BRASICAR*`, `*PAGTO HD*`, `*MHE*`, `*TRANSF ENTRE CONTAS*` | `Transferência Intercompany` | `false` | Transferência de recursos entre lojas do grupo |
| `*TARIFA*`, `*IOF*`, `*DEBITO SEGURO*`, `*MANUT CONTA*` | `Tarifas & Encargos Bancários` | `true` | Custo bancário / operacional institucional |
| `*BLOQUEIO JUDICIAL*`, `*BLOQUEIO PIX*` | `Bloqueio & Contingência` | `false` | Retenção cautelar sem impacto na operação da filial |

### 2.2 Fase 1 de Saídas: Casamento Inteligente com `daily_manual_bills`
Para débitos de fornecedores (ex: `BOLETO PAGO ...`, `DEBITO ELETRONICO ...`, `PAGAMENTO PIX ...`):
1. **Critério 1 - Exatidão de Valor:** `ABS(ABS(ofx.amount) - bill.amount) <= 0.05`
2. **Critério 2 - Mesma Loja & Janela Temporal:** `ofx.store_id = bill.store_id` e `ofx.target_date BETWEEN bill.bill_date - 2 AND bill.bill_date + 2`
3. **Critério 3 - Correspondência Textual (Fuzzy/Substring):**
   - Extrai o cedente da descrição do OFX (ex: `SUPRALIMP`, `ROYCE`, `NOVA DANIEL`, `MARCIO CASTRO`).
   - Normaliza caracteres (remove acentos, espaços duplos e pontuação) e compara com `bill.supplier_name`.
   - Se score de similaridade >= 0.6 ou substring contida: marca casamento com alta confiança (`confidence = 0.95`).
4. **Atualização ao Casar:**
   - `ofx.matched_bill_id = bill.id`
   - `ofx.is_reconciled = true`
   - `bill.status = 'paid'`

---

## 3. Arquitetura de Componentes Frontend & Fluxo de UI

### 3.1 Correção da Persistência no Wizard (`CentralImportWizard.tsx`)
No Step 8 (gravação final no Supabase):
- Ao iterar sobre `matchedExpenses` gerados por `executeExpenseAutoMatching`:
  - Mapear `matched_bill_id` e categoria manual no objeto enviado para inserção/atualização em `ofx_transactions`.
  - Atualizar o status da respectiva conta em `daily_manual_bills` para `'paid'` e vincular o id da transação OFX.

### 3.2 Melhorias em `Step2NonRevenueJustifications.tsx` & `StoreExtratoBancarioView.tsx`
- **Barra Superior de Ações Rápidas (Sticky Header):**
  - Card Resumo: `Total de Saídas Órfãs: 19 | R$ 42.150,00`
  - Botão 1: `[⚡ Auto-Justificar Operacionais (N)]` (Ícone `Zap`, badge com quantidade de transações que casam com Salários/Saques/Tarifas).
  - Botão 2: `[🔗 Confirmar Casamentos de Boletos (M)]` (Ícone `Link`, badge com quantidade de casamentos sugeridos com `daily_manual_bills`).
- **Card Individual Otimizado:**
  - Visão compacta colapsável com destaque de valor em vermelho (`text-rose-400`).
  - Dropdown com auto-complete de contas a pagar da mesma loja e data, caso o usuário queira vincular uma conta manualmente sem recadastrar.
  - Tag visual indicando se a saída será `[Contabilizada na Loja]` ou `[Não Afeta Subtotal (Neutro)]`.

---

## 4. Análise de Riscos & Prevenção de Regressão

| Risco | Probabilidade | Impacto | Mitigação Arquitetural |
| :--- | :--- | :--- | :--- |
| **Duplicação de despesas na DRE** | Média | Alta | Casar diretamente com `daily_manual_bills` existente em vez de criar novas contas manuais duplicadas. |
| **Distorção no `dif_saidas` da filial** | Baixa | Crítica | Definir `contabilizar_no_subtotal = false` para saques em dinheiro e transferências intercompany. |
| **Conflito de concorrência com wizard** | Baixa | Média | Usar mutação idempotente `upsert` com base no `ofx.id`. |

---

## 5. Visual QA & Critérios de Aceite
1. Todas as 19 saídas órfãs da amostra devem ser resolvidas ou sugeridas para resolução em 1 clique:
   - Salários (6): Auto-categorizados com 1 clique.
   - Saques ATM (5): Auto-categorizados como Suprimento de Caixa com 1 clique.
   - Intercompany (3): Auto-categorizados como Transferência Intercompany com 1 clique.
   - Tarifas e Bloqueios (2): Auto-categorizados com 1 clique.
   - Boletos (3): Vinculados com 1 clique aos fornecedores da planilha (`daily_manual_bills`).
2. O contador de Saídas Órfãs cai de 19 para 0 após o processamento.
3. Dark UI Zinc-950 mantido rigorosamente em todos os modais e cards.
