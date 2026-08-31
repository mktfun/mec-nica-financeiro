# Proposal: Motor Inteligente de Matching de Saídas OFX x Contas a Pagar e Sincronização Reativa (323)

## Problema
1. **Ausência da Chamada de `auto_match_saidas` no Pipeline do Wizard:** No `CentralImportWizard.tsx` (`handleConfirm`), o sistema disparava `auto_match_transactions` (para OSs e Maquininhas), mas **nunca invocava a RPC `auto_match_saidas`**. Com isso, as contas importadas de `BuscaContasAPagar.xls` e os débitos bancários do OFX nunca eram correlacionados durante o processamento do lote.
2. **Leitura da Memória Estática de Upload no Step 5 (`Step2NonRevenueJustifications.tsx`):** O componente iterava sobre `results.ofxResults` (o payload parseado no cliente antes de qualquer matching no banco), onde `tx.matched_bill_id` era sempre nulo. Assim, mesmo que transações fossem pareadas no banco, a tela continuava exibindo todas as 47 saídas bancárias como se fossem órfãs.
3. **Rigidez e Falta de Heurística Fuzzy no Matching de Saídas:** A versão anterior da RPC `auto_match_saidas` falhava quando contas corporativas/matriz pagavam despesas de filiais (`store_id` nulo ou cruzado), ou quando descrições bancárias opacas continham tokens do fornecedor (ex: `BOLETO PAGO OFICINA INTE`, `BOLETO PAGO RAVEN TECNOL`, `BOLETO PAGO PRPK DISTRIB`, `SISPAG SALARIOS`, `PAGAMENTOS DANIEL ANTONELI`).

## Solução Proposta (Foco em Reuso e Correção)
1. **Integração Obrigatória de `auto_match_saidas` no Pipeline de Ingestão (`CentralImportWizard.tsx`):**
   - No `handleConfirm(true)` (após salvar `daily_manual_bills` e `ofx_transactions`), executar imediatamente `await supabase.rpc('auto_match_saidas', { p_date: targetDate })`.
   - Adicionar log em tempo real informando a quantidade exata de saídas e boletos casados automaticamente.
2. **Reatividade Direta do Banco de Dados no Step 5 (`Step2NonRevenueJustifications.tsx`):**
   - Substituir a leitura estática de `results.ofxResults` por uma consulta reativa via TanStack Query (`useQuery`) em `ofx_transactions` filtrando estritamente `type = 'out'`, `target_date = targetDate`, `matched_bill_id IS NULL` e `match_status NOT IN ('MATCHED', 'JUSTIFIED')`.
   - Garantir que apenas os débitos genuinamente órfãos (sem conta correspondente na planilha) cheguem à tela de justificativa.
3. **Motor Heurístico de 4 Camadas na RPC `public.auto_match_saidas` (`supabase/migrations/20260831000009_enhanced_auto_match_saidas.sql`):**
   - **Camada 1 (Match Exato Loja + Valor):** Valor idêntico ($le 	ext{R$} 0{,}05$) com mesma filial ou com conta da matriz (`store_id IS NULL`).
   - **Camada 2 (Match Fuzzy por Favorecido / Título):** Intersecção de tokens textuais (ex: `OFICINA INTELIGENTE`, `RAVEN`, `PRPK`, `FEMATH`, `SISPAG`, `SALARIOS`, `ESCAP`, `DIGIRATI`, `DANIEL`, `ALINE SILVA`) com tolerância de até R$ 5,00 para juros/descontos.
   - **Camada 3 (Match de Valor Único Global no Dia):** Se houver 1 única conta em aberto com aquele valor exato e 1 único débito no extrato, faz o pareamento com 100% de confiança.
   - **Camada 4 (Match por Código de Documento / Boleto / FITID):** Pareamento por código externo (`external_code`) contido no texto ou `fitid` do OFX.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `daily_manual_bills`: Já possui colunas `matched_ofx_id`, `is_extra`, `contabilizar_no_subtotal`, `recipient_name`, `external_code`.
  - `ofx_transactions`: Já possui `matched_bill_id`, `counterpart_name`, `manual_category`.
  - `auto_match_saidas`: Já existe no banco; será aprimorada via `CREATE OR REPLACE FUNCTION` com o motor heurístico de 4 camadas.
- **Componentes / Hooks Existentes Encontrados:**
  - `CentralImportWizard.tsx`: Já orquestra a esteira de salvamento, necessitando apenas da inclusão da chamada à RPC.
  - `Step2NonRevenueJustifications.tsx`: Já possui o layout em abas Dark UI Zinc-950, necessitando apenas da fonte de dados reativa do Supabase.

## Contratos de Dados & SQL (Supabase)

```sql
CREATE OR REPLACE FUNCTION public.auto_match_saidas(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bill_rec RECORD;
    ofx_rec RECORD;
    v_matched_count int := 0;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para pareamento de saídas.';
    END IF;

    -- CAMADA 1 & 2: Match por Valor Exato + Loja OU Fornecedor Fuzzy
    FOR bill_rec IN
        SELECT id, amount, store_id, recipient_name, title, external_code
        FROM public.daily_manual_bills
        WHERE date = p_date 
          AND matched_ofx_id IS NULL
          AND contabilizar_no_subtotal = true
        ORDER BY amount DESC
    LOOP
        SELECT id, amount, store_id, counterpart_name, fitid
        INTO ofx_rec
        FROM public.ofx_transactions
        WHERE (target_date = p_date OR occurred_at::date = p_date)
          AND type = 'out'
          AND matched_bill_id IS NULL
          AND (
              -- Camada 1: Valor exato na mesma filial ou filial nula
              (
                  ABS(ABS(amount) - bill_rec.amount) <= 0.05
                  AND (bill_rec.store_id IS NULL OR store_id IS NULL OR store_id = bill_rec.store_id)
              )
              -- Camada 2: Fornecedor / Token fuzzy com tolerância de até R$ 5,00
              OR (
                  ABS(ABS(amount) - bill_rec.amount) <= 5.00
                  AND (
                      counterpart_name ILIKE ('%' || COALESCE(NULLIF(bill_rec.recipient_name, ''), '---') || '%')
                      OR counterpart_name ILIKE ('%' || COALESCE(NULLIF(bill_rec.title, ''), '---') || '%')
                      OR (bill_rec.recipient_name IS NOT NULL AND counterpart_name ILIKE ('%' || split_part(bill_rec.recipient_name, ' ', 1) || '%'))
                      OR (bill_rec.external_code IS NOT NULL AND fitid ILIKE ('%' || bill_rec.external_code || '%'))
                  )
              )
          )
        ORDER BY 
          CASE WHEN store_id = bill_rec.store_id THEN 0 ELSE 1 END,
          ABS(ABS(amount) - bill_rec.amount) ASC
        LIMIT 1;

        IF ofx_rec.id IS NOT NULL THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = ofx_rec.id,
                match_status = 'matched',
                updated_at = now()
            WHERE id = bill_rec.id;

            UPDATE public.ofx_transactions
            SET matched_bill_id = bill_rec.id,
                contabilizar_no_subtotal = true,
                match_status = 'MATCHED',
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- CAMADA 3: Match de Valor Único Global no Dia
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.title, b.recipient_name
        FROM public.daily_manual_bills b
        WHERE b.date = p_date 
          AND b.matched_ofx_id IS NULL
          AND b.contabilizar_no_subtotal = true
          -- Garante que existe apenas 1 conta com este valor
          AND (SELECT COUNT(*) FROM public.daily_manual_bills b2 WHERE b2.date = p_date AND ABS(b2.amount - b.amount) <= 0.05) = 1
    LOOP
        SELECT o.id, o.amount, o.store_id
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = p_date OR o.occurred_at::date = p_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
          AND ABS(ABS(o.amount) - bill_rec.amount) <= 0.05
          -- Garante que existe apenas 1 débito com este valor
          AND (SELECT COUNT(*) FROM public.ofx_transactions o2 
               WHERE (o2.target_date = p_date OR o2.occurred_at::date = p_date) 
                 AND o2.type = 'out' AND o2.matched_bill_id IS NULL 
                 AND ABS(ABS(o2.amount) - bill_rec.amount) <= 0.05) = 1
        LIMIT 1;

        IF ofx_rec.id IS NOT NULL THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = ofx_rec.id,
                match_status = 'matched',
                updated_at = now()
            WHERE id = bill_rec.id;

            UPDATE public.ofx_transactions
            SET matched_bill_id = bill_rec.id,
                contabilizar_no_subtotal = true,
                match_status = 'MATCHED',
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'matched_saidas_count', v_matched_count
    );
END;
$$;
```

## API & Componentes (Frontend)
- `[MODIFY]` `src/components/importacoes/CentralImportWizard.tsx`: Adicionar chamada atômica a `auto_match_saidas` no `handleConfirm(true)` logo após salvar as contas a pagar e transações.
- `[MODIFY]` `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`: Consultar `ofx_transactions` reativamente no Supabase para listar estritamente as saídas bancárias que permaneceram sem match (`matched_bill_id IS NULL`).

## Risco Principal e Mitigação
- **Risco:** Casamento indevido de duas despesas de filiais diferentes que possuam o mesmo valor nominal (ex: duas contas de R$ 150,00 de fornecedores distintos).
- **Mitigação:** A Camada 1 prioriza estritamente `store_id` compatível; a Camada 3 de Valor Único só é acionada se houver exatamente **uma única conta e um único débito** com aquele valor em todo o dia.
