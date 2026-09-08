# Proposal: Matching Estrito de Saídas OFX x Contas a Pagar (Loja a Loja) & Isolamento de Órfãs (373)

## 1. Sumário Executivo & Diagnóstico do Estado Atual

### 1.1 A Preocupação e Diretriz do Usuário
O usuário estabeleceu a regra de ouro contábil da operação:
> *"O match não tem que pegar e categorizar o que ele acha que é cada coisa. O Contas que importo é exatamente pra isso: bater saídas OFX x Contas (conta por conta de cada loja), pras que no OFX forem órfãs (que não têm match), possam ser justificadas e conciliadas corretamente... Espero que no sistema já esteja sendo feito exatamente isso."*

Proposals anteriores (como 327 e 360) sugeriram que o sistema ou a IA deveria "adivinhar" e auto-categorizar débitos bancários (ex: inferir que um débito bancário contendo "SISPAG" é automaticamente Salários, ou que saques são Suprimento de Caixa, ou supor categorias sem lastro documental). 
**Essa abordagem de "adivinhação" é rejeitada categoricamente.** 

A fonte primária e auditada de despesas da holding é a planilha extraída do ERP (`BuscaContasAPagar.xls`), onde cada título a pagar possui sua filial proprietária (`Empresa`), fornecedor, valor, código de barras/documento e vencimento.

---

### 1.2 Auditoria Forense: O que o Sistema JÁ FAZ vs Onde Estão os Gaps

Uma varredura completa na base de código e no banco de dados revelou o seguinte diagnóstico:

#### ✅ O que JÁ ESTÁ em conformidade no sistema:
1. **Segregação por Filial na Ingestão:** 
   O parser `contasPagarParser.ts` já mapeia a coluna `Empresa` de cada linha do `BuscaContasAPagar.xls` para o `store_id` correspondente das 10 filiais (`st-01` a `st-09` e Mauá).
2. **Identificação de Filial nos Extratos OFX:**
   Cada arquivo de extrato bancário é associado à sua respectiva filial (`store_id`) por meio do mapeamento canônico de Agência e Conta Corrente Itaú (`store_file_mappings`).
3. **Estrutura de Rastreamento 1:1 no PostgreSQL:**
   - `ofx_transactions.matched_bill_id` aponta para o ID do título correspondente em `daily_manual_bills`.
   - `daily_manual_bills.matched_ofx_id` aponta para o ID do débito correspondente em `ofx_transactions`.
4. **Isolamento de Órfãs e RPC de Resolução:**
   A RPC `get_daily_reconciliation_summary` já contabiliza `saidas_justificadas` (`matched_bill_id IS NOT NULL OR manual_category IS NOT NULL`) e `saidas_orfas` (`matched_bill_id IS NULL AND manual_category IS NULL`), e a RPC `resolve_orphan_saida_ofx` permite vincular a conta existente, lançar como despesa extra da loja, ou justificar como movimentação holding não operacional.

#### ❌ Os Gaps e Inconsistências que precisamos sanar:
1. **Gap de Persistência no Wizard Central (`CentralImportWizard.tsx`):**
   Ao importar a planilha de Contas a Pagar no `CentralImportWizard`, o hook `useContasAPagarImport` salva os títulos no banco em `daily_manual_bills`, **mas NUNCA invoca a RPC `auto_match_saidas`**. O matcher em memória roda apenas no navegador, mas o vínculo `matched_bill_id` não é persistido no PostgreSQL. Como resultado, todos os débitos bancários permanecem com `matched_bill_id = NULL`, fazendo com que cheguem na tela de conciliação como se fossem todos órfãos!
2. **Vulnerabilidade de Match Cruzado entre Lojas na RPC `auto_match_saidas`:**
   Na Camada 4 da migration `20260831000009_enhanced_auto_match_saidas.sql`, o matching por valor único no dia não restringe `o.store_id = bill_rec.store_id`. Se a Loja Mauá tiver uma conta de R$ 150,00 e a Loja Santo André tiver um débito de R$ 150,00, a RPC poderia vinculá-los entre lojas distintas. **O matching DEVE ser estritamente intra-loja (`o.store_id = bill_rec.store_id`), permitindo cross-store apenas se a conta pertencer expressamente à Matriz (`store_id IS NULL` ou `master`).**
3. **Bloqueio Definitivo de Auto-Categorização Cega de Saídas:**
   Eliminar quaisquer tentativas do backend ou do frontend de auto-atribuir `manual_category` a débitos bancários de saída sem que haja vínculo comprovado com `daily_manual_bills` ou ação deliberada do operador.

---

## 2. Solução Proposta

### 2.1 Princípio Norteador
> **"Nenhum débito bancário é categorizado no vácuo. Débito OFX bate com Conta da mesma Loja. O que sobrar sem conta é Órfão e exige decisão humana informada."**

### 2.2 Pilares da Implementação:
1. **Chamada Compulsória de `auto_match_saidas` na Ingestão:**
   - No hook `useContasAPagarImport.ts` (ao salvar contas) e no `CentralImportWizard.tsx` (ao finalizar o lote), disparar imediatamente a RPC `auto_match_saidas(p_date)` no Supabase, garantindo que o banco de dados já persista o batimento atômico.
2. **Blindagem Estrita da RPC `auto_match_saidas` (Intra-Loja Prioritário):**
   - **Camada 1 (Código / FITID):** Mesma loja ou código de documento/boleto idêntico.
   - **Camada 2 (Valor Exato + Mesma Filial):** $\text{Diferença} \le \text{R\$} 0,05$ e `o.store_id = bill_rec.store_id`.
   - **Camada 3 (Valor Exato + Favorecido/Título Similar na Mesma Filial):** Compara tokens do favorecido (`recipient_name` vs `counterpart_name`) na mesma loja.
   - **Camada 4 (Contas da Matriz / Compartilhadas):** Apenas contas com `store_id IS NULL` ou `master` podem ser batidas com débitos de filiais quando o favorecido/valor coincidir.
   - **Proibição de Match Cruzado Cego:** Filial A NUNCA abate conta de Filial B.
3. **Isolamento Limpo da Fila de Saídas Órfãs:**
   - Débitos de saída que não encontraram título em `daily_manual_bills` permanecem com `matched_bill_id = NULL` e `manual_category = NULL`.
   - Na tela da loja (`StoreExtratoBancarioView.tsx`) e na Fase 4 (`Fase4ContasVsSaidasReview.tsx`), o operador visualiza com clareza:
     - **Títulos Conciliados:** Débito no banco $\leftrightarrow$ Título do ERP daquela loja.
     - **Débitos Órfãos:** Saídas bancárias não provisionadas na planilha daquela loja, prontas para justificativa controlada (`[Vincular a Conta Existente]`, `[Lançar como Despesa Extra da Loja]`, ou `[Apenas Justificar (Holding/Não Operacional)]`).

---

## 3. Contratos de Dados & SQL

### 3.1 Tabela `public.ofx_transactions` (Campos de Conciliação de Saída)
- `id` (UUID): Chave primária.
- `store_id` (TEXT): Identificador canônico da filial.
- `target_date` (DATE): Data contábil do fechamento.
- `type` (TEXT): `'out'` para débitos/saídas bancárias.
- `amount` (NUMERIC): Valor positivo do débito bancário.
- `matched_bill_id` (UUID NULL): FK para `daily_manual_bills(id)`. **Preenchido estritamente quando há batimento com conta.**
- `manual_category` (TEXT NULL): Categoria atribuída na justificativa humana (ex: `'Despesa Extra'`, `'Transferência Intercompany'`, `'Tarifa Bancária'`).
- `contabilizar_no_subtotal` (BOOLEAN): `true` se afeta o subtotal de despesas da loja/holding; `false` se for neutro (transferências entre contas).

### 3.2 Tabela `public.daily_manual_bills` (Contas a Pagar Importadas do ERP)
- `id` (UUID): Chave primária.
- `date` (DATE): Data de competência/pagamento.
- `store_id` (TEXT NULL): Loja dona da despesa (ou NULL para despesa da Matriz).
- `amount` (NUMERIC): Valor da fatura/título.
- `recipient_name` (TEXT): Razão social / Favorecido do título.
- `title` (TEXT): Descrição do boleto/título.
- `external_code` (TEXT NULL): Código do título no ERP ou código de barras.
- `matched_ofx_id` (UUID NULL): FK para `ofx_transactions(id)`. **Preenchido quando o débito bancário quita este título.**
- `is_extra` (BOOLEAN DEFAULT false): `true` quando o débito foi justificado como despesa extra da loja não constante na planilha original.

### 3.3 RPC: `public.auto_match_saidas(p_date date)`
Executa o batimento atômico multi-camadas no banco de dados:
```sql
CREATE OR REPLACE FUNCTION public.auto_match_saidas(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
```

---

## 4. Risco Principal e Mitigação

- **Risco Principal:** Divergência de centavos entre o valor da planilha de contas (ex: R$ 1.500,00) e o débito no extrato com encargos/juros bancários (ex: R$ 1.503,42), impedindo o match exato e gerando falso órfão.
- **Mitigação:** Heurística de tolerância controlada: match exato ($\le \text{R\$} 0,05$) prioritário; e para o mesmo favorecido na mesma loja, tolerância de até R$ 5,00 para juros/taxas bancárias documentadas, sem cruzar filiais distintas.
