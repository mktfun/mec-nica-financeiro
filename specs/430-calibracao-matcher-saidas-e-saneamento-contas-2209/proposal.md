# SDD Proposal — Spec 430: Calibração do Matcher de Saídas, Correção do 400 Bad Request e Conciliação Loja a Loja 22/09

## 1. Problema Diagnosticado

Durante a conciliação do dia **22/09/2026**, foram identificadas três anomalias críticas no motor de saídas e despesas:

1. **Matching Falso / Aleatório por Valor Cego (Anti-Pattern):**
   - A transação de saída de **-R$ 5.000,00** de *LUIS HENRIQUE ALVES DA SILVA* (em Piraporinha / `st-05`) foi vinculada automaticamente à conta *CARTAO DANIEL* (código 5624 da Matriz / Holding).
   - **Causa-Raiz:** Na RPC `auto_match_saidas` (Camadas 2, 3 e 4) e no helper `expenseMatcher.ts` (linhas 487-516), quando duas despesas possuem o mesmo valor monetário (ex: R$ 5.000,00), o algoritmo selecionava o primeiro título disponível via `LIMIT 1` mesmo sem nenhuma correspondência textual no nome do favorecido, razão social ou CNPJ (`LUIS HENRIQUE` $\neq$ `CARTAO DANIEL`).

2. **Impossibilidade de Corrigir Justificativa / Badge Conflitante na UI:**
   - Ao tentar reclassificar a transação de Luis Henrique para a categoria manual *"Pró-labore"*, a tela continuava exibindo *"Conta: CARTAO DANIEL"*.
   - **Causa-Raiz:** A rotina de categorização atualizava `manual_category = 'Pró-labore'`, mas **não limpava `matched_bill_id`**. Como o componente [`StoreExtratoBancarioView.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/StoreExtratoBancarioView.tsx#L1052) dá precedência absoluta ao `matchedBill` sobre a categoria manual, o vínculo incorreto permanecia visível. Além disso, despesas manuais avulsas (não presentes na planilha de contas) não estavam sendo inseridas em `daily_manual_bills` para somar no subtotal de contas a cobrir.

3. **Crash HTTP 400 Bad Request no Console:**
   - A requisição `GET .../daily_manual_bills?select=amount,status&date=eq.2026-09-22&status=neq.ignored` falha sistematicamente com erro 400.
   - **Causa-Raiz:** Em [`useBackendConciliacao.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useBackendConciliacao.ts#L311-L314), a query referencia a coluna inexistente `status` em vez de `match_status`.

4. **Descompasso Estrutural de Saídas nas Lojas (Ex: Mauá e Kennedy com Saídas R$ 0,00):**
   - O arquivo `BuscaContasAPagar.xls` de 22/09 lista 158 contas somando **R$ 116.209,60**, distribuídas por filial (`ReiDoOleoMaua`: R$ 10.175,97, `MPkennedy`: R$ 9.877,37, etc.).
   - A auditoria dos OFXs revelou que a fatura integral do cartão C6 (**R$ 116.209,60**) foi debitada em um **único boleto consolidado na conta da BRASICAR (`brasicar.ofx`)**.
   - Como o desembolso bancário ocorreu centralizado, as outras filiais não possuem débitos individuais nos seus OFXs para essas contas, gerando diferenças a justificar nas lojas se não houver pareamento de despesa centralizada.

---

## 2. Solução Proposta

1. **Calibração Rigorosa do Matcher de Saídas (`expenseMatcher.ts` & RPC `auto_match_saidas`):**
   - Proibir terminantemente o match por valor único quando não houver correspondência semântica de tokens de favorecido (mínimo 3 caracteres coincidentes ou CNPJ/CPF válido) ou código de documento idêntico.
   - Eliminar o `LIMIT 1` cego em valores monetários sem validação de nome na Camada 3 (Master) e Camada 4 (Global).

2. **Fluxo de Desvinculação e Nova Justificativa Manual:**
   - Ao alterar a justificativa de uma transação para categoria avulsa (ex: Pró-labore), anular imediatamente `matched_bill_id = NULL` na transação do OFX e liberar a conta anterior (`daily_manual_bills.matched_ofx_id = NULL`).
   - Se a saída justificada for um desembolso operacional real sem título prévio no ERP (ex: Pró-labore em dinheiro/pix), criar o registro em `daily_manual_bills` com `contabilizar_no_subtotal = true` para alimentar o subtotal de contas.

3. **Correção do Bug 400 Bad Request:**
   - Corrigir a query em `useBackendConciliacao.ts` substituindo `status` por `match_status`.

4. **Motor de Reconhecimento de Fatura Centralizada / Intercompany:**
   - Tratar pagamentos consolidados de cartão corporativo (ex: Boleto C6 de R$ 116.209,60 na Brasicar) permitindo vincular o lote de despesas rateadas das filiais sem acusar falsos débitos órfãos em Mauá e Kennedy.

---

## 3. Skills Especializadas Aplicadas

- `skills/backend-patterns/SKILL.md`: Transações atômicas no Supabase, tipagem de Server Actions e consultas resilientes.
- `skills/database/SKILL.md`: Calibração SQL idempotente na RPC `auto_match_saidas` e integridade relacional entre `ofx_transactions` e `daily_manual_bills`.
- `skills/frontend-design-pro/SKILL.md`: Consistência visual e priorização correta de badges semânticos no extrato bancário.

---

## 4. Contratos de Dados Afetados

- **RPC `auto_match_saidas(p_date text)`:**
  - Cláusula estrita de similaridade de texto no `WHERE` das Camadas 2 e 3.
- **Tabela `daily_manual_bills`:**
  - Ajuste de queries de leitura para utilizar `match_status`.
- **Tabela `ofx_transactions`:**
  - Desassociação atômica de `matched_bill_id` quando houver categorização manual explícita.

---

## 5. Arquivos Afetados

### [Arquivos Existentes Modificados]
- `src/hooks/useBackendConciliacao.ts`: Correção do select `status` -> `match_status`.
- `src/lib/expenseMatcher.ts`: Blindagem anti-match aleatório (exigir token matching).
- `src/hooks/useCategorizeOrphan.ts`: Desvincular `matched_bill_id` e gerar registro em `daily_manual_bills` quando aplicável.
- `src/components/conciliacao/StoreExtratoBancarioView.tsx`: Limpeza e coerência de badges de conta vinculada vs categoria manual.
- Migration SQL: Atualização de `public.auto_match_saidas(text)`.

---

## 6. Plano de Rollback

Caso ocorram regressões no batimento de saídas, a RPC e os componentes podem ser restaurados ao commit anterior sem impacto nos dados já conciliados de dias anteriores.

---

## 7. Risco Principal e Mitigação

- **Risco:** Contas legítimas com nomes ligeiramente abreviados deixarem de casar automaticamente.
- **Mitigação:** Preservar a tolerância de primeiros tokens (3+ letras) e códigos externos (FITID / documento), exigindo aprovação manual apenas para casos totalmente divergentes (como Henrique vs Daniel).
