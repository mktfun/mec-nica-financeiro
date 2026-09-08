# Proposal: Correção Canônica de Conciliado vs OFX por Filial e Desreversão de Lotes (376)

## 1. Problema
Após o fechamento e importação de **08/09/2026**, os operadores identificaram três discrepâncias graves que quebram a confiabilidade da conciliação por filial:

1. **Saídas 100% Conciliadas Falsas (Ocultação de Débitos Órfãos):**
   - Na filial Jabaquara (`st-02`), o extrato bancário possui um débito pendente de **R$ 4.477,44** (`SISPAG SALARIOS`), sem nenhuma fatura vinculada e sem justificativa.
   - Contudo, o card da filial na tela de conciliação exibe:
     - `Saídas OFX: R$ 6.444,76`
     - `Contas / Boletos: R$ 6.444,76`
     - `Dif. a Justificar: 100% Conciliado R$ 0,00`.
   - **Causa Raiz**: A RPC `get_daily_reconciliation_summary` utilizava a fórmula matemática:
     `contas_conciliadas = LEAST(ofx_saidas_total, contas_loja_total)`.
     Como o ERP tinha faturas cadastradas (`contas_loja_total`) de R$ 8.194,76, o `LEAST(6444.76, 8194.76)` retornava R$ 6.444,76, assumindo cegamente que **100% dos débitos bancários estavam conciliados**, mascarando débitos pendentes e deixando o operador sem saber onde agir.

2. **Entradas Conciliadas Maiores que o Extrato Bancário (Dupla Contagem de Cartões):**
   - Na filial Dom Pedro (`st-01`), o extrato tem R$ 1.352,47 em créditos (Rede R$ 972,36 + PIX R$ 380,00 + Rendimento R$ 0,11).
   - O card exibia:
     - `OFX Entradas: R$ 1.352,47`
     - `Conciliado: R$ 2.324,72`
     - `Dif. a Justificar: Crédito Órfão -R$ 972,25` (Conciliado quase o dobro do extrato!).
   - **Causa Raiz**: A RPC `auto_match_daily_transactions` não filtrava transações de adquirentes (`counterpart_name ILIKE '%REDE%'` / `bank_name ILIKE '%REDE%'`) ao buscar depósitos de PIX para vincular a Ordens de Serviço. O crédito da Rede de R$ 972,36 foi casado com a OS #578 e carimbado com `matched_os_number = '578'` e `manual_category = 'PIX / Recebimento OS'`.
   - Na RPC `get_daily_reconciliation_summary`, a transação foi somada uma vez em `ofx_maquininhas` (R$ 972,36) e uma segunda vez em `pix_total` (R$ 1.352,36), inflando o Conciliado para R$ 2.324,72. O mesmo ocorreu em Jabaquara (crédito Rede de R$ 1.401,60 casado indevidamente com a OS #401).

3. **Lotes SISPAG Não Pareados por Falha de Subconjunto (Subset Sum):**
   - Em filiais como Jabaquara, Jorge Beretta, Piraporinha e Rudge Ramos, o banco debitou um lote consolidado de SISPAG (ex.: Jabaquara R$ 4.477,44).
   - A loja possuía 3 funcionários (Vanessa R$ 2.438,78 + Gustavo R$ 2.038,66 + João Vitor R$ 1.750,00 = R$ 6.227,44).
   - Como a RPC anterior somava cegamente **todos** os títulos da loja, 6.227,44 não batia com 4.477,44 e o lote ficava órfão, enquanto o subconjunto exato `{Vanessa, Gustavo}` soma exatamente R$ 4.477,44.

---

## 2. Solução Proposta (Foco em Reuso e Correção Canônica)

### A. Equação Canônica de Saídas Conciliadas e Diferenças
Reestruturar a CTE `ofx_saidas_agg` e o cálculo de `contas_conciliadas` e `dif_saidas` na RPC `get_daily_reconciliation_summary`:
- **`saidas_conciliadas` (ou `contas_conciliadas`)**: Deve refletir **estritamente os débitos bancários da filial que possuem lastro**:
  ```sql
  COALESCE(SUM(CASE 
      WHEN matched_bill_id IS NOT NULL 
        OR manual_category IS NOT NULL 
        OR match_status IN ('matched', 'matched_batch', 'intercompany_paired', 'auto_cancelled')
      THEN amount ELSE 0 END), 0)
  ```
- **`dif_saidas` (Débitos Órfãos a Justificar)**:
  ```sql
  ofx_saidas_total - saidas_conciliadas
  ```
- Se a filial tem um débito de R$ 4.477,44 pendente, o card passará a exibir com fidelidade pericial:
  - `Saídas OFX: R$ 6.444,76`
  - `Contas / Boletos: R$ 1.967,32`
  - `Dif. a Justificar: Débito Órfão -R$ 4.477,44`
  - Status da filial: `divergence` (indicando com precisão que há R$ 4.477,44 pendente de ação do operador).

### B. Blindagem Anti-Sequestro de Cartão por PIX & Descontaminação
1. **No Backend (`public.auto_match_daily_transactions`)**:
   - Inserir cláusula de exclusão explícita na busca de candidatos a PIX:
     ```sql
     AND NOT (
         COALESCE(counterpart_name, '') ILIKE '%REDE%'
         OR COALESCE(counterpart_name, '') ILIKE '%CARD%'
         OR COALESCE(counterpart_name, '') ILIKE '%CIELO%'
         OR COALESCE(counterpart_name, '') ILIKE '%STONE%'
         OR COALESCE(counterpart_name, '') ILIKE '%PAGSEGURO%'
         OR COALESCE(bank_name, '') ILIKE '%REDE%'
         OR COALESCE(bank_name, '') ILIKE '%CARD%'
     )
     ```
2. **Na RPC `get_daily_reconciliation_summary`**:
   - `pix_total` e `entradas_justificadas` devem excluir categoricamente qualquer transação que contenha termos de adquirentes, eliminando a dupla contagem na raiz.
3. **Migration de Descontaminação**:
   - Executar `UPDATE ofx_transactions SET matched_os_number = NULL, manual_category = NULL WHERE type = 'in' AND (counterpart_name ILIKE '%REDE%' OR bank_name ILIKE '%REDE%') AND matched_os_number IS NOT NULL;` para reverter os falsos vínculos de Dom Pedro e Jabaquara.

### C. Motor Combinatório de Subconjuntos SISPAG (Subset Sum Matching)
- Atualizar a RPC `public.auto_match_saidas` e o motor `expenseMatcher.ts` para testar combinações de 1 a N títulos abertos de salário da mesma filial (e holding/master) que somem exatamente o valor do débito bancário (tolerância R$ 0,10):
  - Jabaquara: `{Vanessa R$ 2.438,78, Gustavo R$ 2.038,66}` $\rightarrow$ casa R$ 4.477,44.
  - Jorge Beretta: `{Marcelo R$ 1.959,36, Erik R$ 1.001,25}` $\rightarrow$ casa R$ 2.960,61.
  - Piraporinha: `{Vagner R$ 1.960,00, Glicelio R$ 1.294,00, Maria R$ 1.499,00}` $\rightarrow$ casa R$ 4.753,00.
  - Rudge Ramos: `{Juliano R$ 1.976,00, Lucas R$ 1.619,00, Jessica R$ 1.201,00, Ana Paula R$ 257,00}` $\rightarrow$ casa R$ 5.053,00.

### D. Classificador do Parser de Contas a Pagar (`contasPagarParser.ts`)
- Atualizar `classifyExpense` para identificar palavras-chave de folha de pagamento na descrição do título (`REF. SALARIO`, `SALARIO`, `RESCISAO`, `FERIAS`, `ADIANTAMENTO`, `VALE`) e atribuir `category: 'retirada_socios'`, garantindo que os títulos importados sejam prontamente identificados pelo motor de folha.

---

## 3. Investigação e Análise de Reuso
- **RPCs Existentes a Reutilizar e Atualizar**:
  - `public.get_daily_reconciliation_summary(text, boolean)`: já é o SSOT consumido pelo Dashboard e Conciliação. Modificar apenas as fórmulas das CTEs `ofx_saidas_agg`, `ofx_entradas_agg` e o payload JSON de `stores_detail`.
  - `public.auto_match_daily_transactions(text)`: já orquestra o auto-match no banco. Adicionar filtro anti-adquirente na Fase 2.
  - `public.auto_match_saidas(text)`: já possui a lógica de pareamento 1-para-N. Adicionar o algoritmo combinatório de subconjuntos.
- **Componentes React Existentes**:
  - `StoreCardModulo1.tsx`: já possui a grade visual e consome `diferencaSaidas`, `contasLoja`, `diferencaEntradas` e `entradasPrevisto`. Zero alteração de layout necessária, passará a renderizar os dados honestos e precisos.
  - `ConciliacaoLojasView.tsx`: já mapeia os campos da RPC.
  - `StoreExtratoBancarioView.tsx`: garantir atualização imediata de cache e desvinculação de falsos PIXs.

---

## 4. Contratos de Dados & SQL

### Alterações na RPC `public.get_daily_reconciliation_summary`
```sql
-- CTE de Saídas:
ofx_saidas_agg AS (
    SELECT 
        TRIM(store_id::text) as store_id,
        COALESCE(SUM(amount), 0) as ofx_saidas_total,
        COALESCE(SUM(CASE 
            WHEN matched_bill_id IS NOT NULL 
              OR manual_category IS NOT NULL 
              OR match_status IN ('matched', 'matched_batch', 'intercompany_paired', 'auto_cancelled')
            THEN amount ELSE 0 END), 0) as saidas_conciliadas,
        COALESCE(SUM(CASE 
            WHEN matched_bill_id IS NULL 
             AND manual_category IS NULL 
             AND (match_status IS NULL OR match_status NOT IN ('matched', 'matched_batch', 'intercompany_paired', 'auto_cancelled'))
            THEN amount ELSE 0 END), 0) as saidas_orfas
    FROM ofx_transactions
    WHERE target_date = v_target_date::date AND type = 'out'
    GROUP BY TRIM(store_id::text)
)
```

### Contrato de Retorno do Card
- `contas_conciliadas`: `COALESCE(sofx.saidas_conciliadas, 0)`
- `dif_saidas`: `COALESCE(sofx.saidas_orfas, 0)`
- `entradas_conciliadas`: `COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)`
- `dif_entradas`: `COALESCE(oe.ofx_entradas_total, 0) - entradas_conciliadas`

---

## 5. Risco Principal e Mitigação
- **Risco**: Ao desmascarar os débitos órfãos legítimos, o status de filiais com contas não justificadas mudará de `approved` para `divergence`.
- **Mitigação**: Esse é exatamente o comportamento contábil correto e desejado pelo usuário ("não tá somando realmente o que tá e não tá conciliado... teve umas transações ainda umas 12 sem conciliar de saídas"). Com o motor de subconjuntos de SISPAG, as 4 filiais com folha de pagamento terão seus lotes automaticamente batidos, e as saídas realmente sem conta ou sem justificativa (como saques ou débitos avulsos) serão exibidas com transparência cirúrgica para que o operador possa justificá-las com 1 clique no extrato.
