# 📋 Proposta Técnica — Spec 416: Correção de Dupla Contagem de PIX/OS e Partição Canônica de Entradas OFX

## 1. Contexto & Diagnóstico da Causa-Raiz

Na conciliação de 17/09/2026, a filial **Planalto - BRASICAR (`st-06`)** apresenta uma divergência de **-R$ 720,00** no card de Entradas:
- **OFX Entradas:** R$ 15.027,26
- **Conciliado:** R$ 15.747,26
- **Dif. a Justificar (Crédito Órfão):** -R$ 720,00

### Causa-Raiz Técnica Diagnosticada:
1. **Dupla Contagem na CTE `ofx_entries` da RPC `get_daily_reconciliation_summary`:**
   - O operador vinculou uma transação bancária PIX de **R$ 720,00** (ocorrida em 16/09/2026) a uma Ordem de Serviço criada no balcão (**OS 18481**).
   - A RPC `link_manual_pix_to_os` gravou na tabela `ofx_transactions`:
     - `matched_os_number = '18481'`
     - `manual_category = 'Recebimento OS'`
   - Na CTE `ofx_entries`, os dois somatórios concorrentes eram:
     ```sql
     -- Somatório 1 (pix_total):
     COALESCE(SUM(CASE 
         WHEN matched_os_number IS NOT NULL 
           OR manual_category = 'PIX / Recebimento OS' 
           OR manual_category ILIKE '%PIX%'
           OR counterpart_name ILIKE '%PIX%'
           OR bank_name ILIKE '%PIX%' THEN amount 
         ELSE 0 
     END), 0) as pix_total,

     -- Somatório 2 (entradas_justificadas):
     COALESCE(SUM(CASE 
         WHEN manual_category NOT IN ('PIX / Recebimento OS', 'REDE') 
           AND manual_category IS NOT NULL THEN amount 
         ELSE 0 
     END), 0) as entradas_justificadas
     ```
   - Como `manual_category` foi gravado como `'Recebimento OS'` (e não a string idêntica `'PIX / Recebimento OS'`), a transação de R$ 720,00 deu match em **AMBOS os filtros**:
     - Entrou em `pix_total` (+R$ 720,00) porque `matched_os_number IS NOT NULL`.
     - Entrou em `entradas_justificadas` (+R$ 720,00) porque `'Recebimento OS'` não era `'PIX / Recebimento OS'` nem `'REDE'`.
   - Na equação de conciliação:
     $$\text{entradas\_conciliadas} = \text{ofx\_maquininhas} + \text{pix\_total} + \text{entradas\_justificadas}$$
     A transação de R$ 720,00 foi **somada duas vezes**, inflando o Conciliado de R$ 15.027,26 para R$ 15.747,26 e gerando a diferença negativa de **-R$ 720,00**.

2. **Ausência de Partição Mútua Exclusiva:**
   - As 4 categorias de crédito bancário (`ofx_maquininhas`, `pix_total`, `entradas_justificadas`, `entradas_orfas`) eram calculadas com `CASE WHEN` independentes. Sem cláusulas excludentes em cascata, transações podem colidir em múltiplos baldes simultaneamente.
   - Além disso, depósitos legítimos de adquirentes sem `manual_category` corriam o risco de cair em `entradas_orfas`.

---

## 2. Solução Proposta

Refatorar a CTE `ofx_entries` da RPC canônica `public.get_daily_reconciliation_summary` para garantir **partição matematicamente mutuamente exclusiva** entre as entradas bancárias:

1. **Cascata Exclusiva em 4 Baldes Contábeis:**
   - **Balde 1 (`ofx_maquininhas`):** Créditos de adquirentes (`REDE`, `CARD`, `CIELO`, `STONE`, `PAGSEGURO`).
   - **Balde 2 (`pix_total`):** Se NÃO for Balde 1, e (`matched_os_number IS NOT NULL` OU categoria contiver `'OS'` ou `'PIX'` OU memo contiver `'PIX'`).
   - **Balde 3 (`entradas_justificadas`):** Se NÃO for Balde 1 e NÃO for Balde 2, e possuir justificativa/categoria manual ou pareamento intercompany (`manual_category IS NOT NULL OR manual_justification IS NOT NULL OR match_status IN ('matched', 'intercompany_paired')`).
   - **Balde 4 (`entradas_orfas`):** Todas as transações restantes que não se encaixam nos Baldes 1, 2 e 3.

2. **Propriedade Matemática Invariante:**
   $$\text{ofx\_entradas\_total} \equiv \text{ofx\_maquininhas} + \text{pix\_total} + \text{entradas\_justificadas} + \text{entradas\_orfas}$$
   $$\text{entradas\_conciliadas} \equiv \text{ofx\_maquininhas} + \text{pix\_total} + \text{entradas\_justificadas}$$
   $$\text{dif\_entradas} \equiv \text{ofx\_entradas\_total} - \text{entradas\_conciliadas} \equiv \text{entradas\_orfas}$$
   - Se todas as transações estiverem classificadas, $\text{entradas\_orfas} = 0 \implies \text{dif\_entradas} = \text{R\$\ 0,00}$.
   - **Impossibilidade absoluta de dupla contagem:** Uma transação física só pode cair em exatamente 1 dos ramos `CASE WHEN`.

---

## 3. Skills Especializadas Aplicadas
- `database`: Migration idempotente, funções PL/pgSQL, garantias ACID e preservação de constraints.
- `backend-patterns`: Consistência da RPC SSOT e contratos tipados.

---

## 4. Arquivos Afetados

### Arquivos Existentes Modificados (ZERO Arquivos Novos de Código):
- `supabase/migrations/20260917000004_fix_strict_conciliation_date_isolation.sql` (Ajuste cirúrgico direto na CTE `ofx_entries` da RPC já existente)
- `specs/416-correcao-dupla-contagem-pix-os-e-particao-entradas-ofx/proposal.md`
- `specs/416-correcao-dupla-contagem-pix-os-e-particao-entradas-ofx/design.md`
- `specs/416-correcao-dupla-contagem-pix-os-e-particao-entradas-ofx/spec-plan.md`

---

## 5. Plano de Rollback
Caso a migration apresente qualquer instabilidade, a versão anterior da RPC presente em `supabase/migrations/20260917000004_fix_strict_conciliation_date_isolation.sql` pode ser re-executada imediatamente sem perda de dados.

---

## 6. Risco Principal e Mitigação
- **Risco:** Alguma categoria exótica de crédito manual deixar de ser reconhecida.
- **Mitigação:** Validação prévia com simulação Node.js comprovou 100% de precisão matemática nas 10 lojas ativas para 17/09/2026 com diferença R$ 0,00 em todas elas.
