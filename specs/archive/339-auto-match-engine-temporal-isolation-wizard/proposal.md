# Proposal: Motor de Auto-Match de PIX e Rede x OS (Pátio), Isolamento Temporal Estrito e Vínculo Manual Residual (339)

## Problema

1. **Vazamento Temporal de Transações de Agosto (110 lançamentos no Step 1):**
   - Ao importar o dia `2026-09-01`, o Step 1 listou 110 transações históricas desde 19/08/2026.
   - Causa: o filtro PostgREST utilizava `.or('target_date.eq.2026-09-01,occurred_at.gte.2026-09-01T00:00:00,occurred_at.lte.2026-09-01T23:59:59')`. Como a vírgula é um `OR`, a condição `occurred_at <= 2026-09-01` avaliou como verdadeira para toda a história do banco.
2. **Motor de Conciliação Automática não Rodando Pós-Inputs Manuais:**
   - O usuário precisa que, ao clicar em "Processar e Conciliar com IA" após preencher os inputs manuais (odômetro, dinheiro MP, contas, etc.), o motor tente conciliar automaticamente tudo que for possível:
     - Vendas do Relatório da **REDE** $\leftrightarrow$ **OSs (Carros em Pátio)** da respectiva filial.
     - Entradas de **PIX / Transferências** do extrato OFX $\leftrightarrow$ **OSs (Carros em Pátio)** da respectiva filial.
     - Saídas do OFX $\leftrightarrow$ **Contas a Pagar**.
3. **Escopo Preciso do Step 1 (Vínculo de Pagamentos sem OS):**
   - No Step 1 devem aparecer **APENAS** as transações de **PIX**, **REDE** e **Transferências** do dia atual (`target_date = targetDate`) que o motor de conciliação **NÃO conseguiu conciliar de jeito nenhum** (por exemplo, quando o valor diverge, a OS não foi cadastrada no sistema ou não houve match automático).
   - O operador terá a oportunidade de vincular manualmente cada uma dessas transações órfãs com a OS correta (carro no pátio) daquela filial.

---

## Solução Proposta (Foco em Reuso e Correção)

### 1. Motor de Auto-Match Determinístico no Backend (`auto_match_daily_transactions`)
Criar a migration `20260901000014_unified_auto_match_daily_transactions.sql` com a RPC `auto_match_daily_transactions(p_date DATE)`:
- **Match 1 (REDE POS $\leftrightarrow$ OS em Pátio):**
  - Para cada venda em `pos_transactions` da data `p_date` com `matched_os_number IS NULL`:
    - Busca em `patio_os` da mesma loja (`store_id`) onde status é em aberto/pendente cujo valor bata com o valor líquido ou bruto ($\pm$ R$ 0,05).
    - Havendo correspondência: grava `matched_os_number`, atualiza o status/saldo pago da OS em `patio_os` e insere o registro em `conciliation_matches`.
- **Match 2 (PIX / Transferências OFX $\leftrightarrow$ OS em Pátio):**
  - Para cada crédito em `ofx_transactions` (`type = 'in'`) da data `p_date` com `matched_os_number IS NULL`:
    - Busca em `patio_os` da mesma loja (`store_id`):
      - Por número de OS contido na descrição bancária / FITID.
      - Por valor exato do PIX / saldo em aberto da OS ($\pm$ R$ 0,05).
      - Por correspondência de nome do cliente (`counterpart_name` vs `client_name`).
    - Havendo correspondência: grava `matched_os_number`, baixa a OS em `patio_os` e registra em `conciliation_matches`.
- **Match 3 (Saídas OFX $\leftrightarrow$ Contas a Pagar):**
  - Executa a reconciliação automática de débitos bancários via `auto_match_saidas(p_date)`.

### 2. Isolamento Temporal Estrito (Zero Leakage)
- Em `fetchRealUnmatchedTransactions` (`CentralImportWizard.tsx`) e em `Step2NonRevenueJustifications.tsx`:
  - Usar estritamente `.eq('target_date', targetDate)`. Nenhuma transação de agosto ou de outra data vazará para a conciliação do dia 01/09.

### 3. Pipeline do Wizard Pós-Inputs Manuais
No `CentralImportWizard.tsx` (`handleConfirm`):
1. Grava as alterações de OSs ausentes manuais em `patio_os`.
2. Persiste as OSs, Vendas da Rede, Lançamentos OFX e Contas a Pagar no banco com `target_date = targetDate`.
3. Executa imediatamente `supabase.rpc('auto_match_daily_transactions', { p_date: targetDate })`.
4. Executa `fetchRealUnmatchedTransactions(targetDate)` para buscar **apenas** os PIX e vendas da REDE do dia que restaram com `matched_os_number IS NULL`.
5. Apresenta o **Step 1 (`Step1UnregisteredPayments`)** contendo exclusivamente os órfãos reais do dia para vínculo manual com OSs.
6. As transações não vinculadas a OSs que forem de natureza não-operacional (aportes, empréstimos, despesas avulsas) avançam para o **Step 2 (`Step2NonRevenueJustifications`)**.

---

## Contratos de Dados & SQL (Supabase)

### Migration `20260901000014_unified_auto_match_daily_transactions.sql`:
```sql
CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pos_matched INT := 0;
    v_pix_matched INT := 0;
    v_saidas_res JSONB;
BEGIN
    -- 1. Pareamento POS (Rede) x patio_os da mesma filial
    ...
    -- 2. Pareamento OFX (PIX) x patio_os da mesma filial
    ...
    -- 3. Pareamento Saídas x Contas a Pagar
    v_saidas_res := public.auto_match_saidas(p_date);
    
    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'matched_pos_count', v_pos_matched,
        'matched_pix_count', v_pix_matched,
        'saidas_result', v_saidas_res
    );
END;
$$;
```

---

## API & Componentes (Frontend)

- **`CentralImportWizard.tsx` [MODIFY]:**
  - Disparo de `auto_match_daily_transactions` dentro de `handleConfirm` logo após a gravação dos inputs manuais.
  - Substituição da query de `fetchRealUnmatchedTransactions` para `.eq('target_date', tDate)`.
- **`Step1UnregisteredPayments.tsx` [MODIFY]:**
  - Exibição clara de PIX e Vendas REDE não conciliadas do dia, com filtro por filial e botão de vínculo direto com a OS do pátio.
- **`Step2NonRevenueJustifications.tsx` [MODIFY]:**
  - Isolamento estrito de `targetDate` via `.eq('target_date', targetDate)`.

---

## Risco Principal e Mitigação

- **Risco:** Casamento indevido de PIX de valor genérico (ex: R$ 100,00) com OS de outra filial ou OS errada.
- **Mitigação:** Regra estrita de `store_id` (o sistema NUNCA casa entre filiais diferentes no motor automático) e priorização estrita de correspondência de número da OS / nome do cliente antes do match apenas por valor.
