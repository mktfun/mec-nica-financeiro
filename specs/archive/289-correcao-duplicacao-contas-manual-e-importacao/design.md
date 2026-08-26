# Design: Correção de Duplicação de Contas (Manual / Importação) e Blindagem de Edição (289)

## Arquitetura Técnica

```
[Planilha BuscaContasAPagar.xls]
            │ (importação)
            ▼
[useContasAPagarImport.ts]
     ├── INSERT daily_manual_bills (com external_code: "13502", "5561", ...)
     └── UPDATE daily_snapshots (contas_a_pagar = totalAmount)
            │
            ▼
[RPC get_daily_reconciliation_summary(p_date)]
     ├── v_contas_imported_bills = SUM(amount) WHERE external_code IS NOT NULL (16.974,94)
     ├── v_contas_extras = SUM(amount) WHERE external_code IS NULL (0,00)
     ├── v_contas_base = COALESCE(snapshot.contas_a_pagar, v_contas_imported_bills) (16.974,94)
     ├── v_contas_manual = v_contas_base + v_contas_extras (16.974,94)
     └── v_subtotal_contas = v_contas_manual + v_juros_rede (16.974,94 + 1.864,89 = 18.839,83)
            │
            ▼
[ResumoDiaPanel.tsx]
     ├── Contas (Manual): R$ 16.974,94
     ├── Base Planilha: R$ 16.974,94 (sem "+ Extras" quando extras == 0)
     ├── Juros Rede: R$ 1.864,89
     └── Subtotal: Total de Contas a Cobrir: R$ 18.839,83
```

---

## Lógica SQL da RPC Canônica

```sql
-- 12. Contas a Pagar: Base Planilha + Extras Manuais Isolados
SELECT COALESCE(SUM(amount), 0)
INTO v_contas_imported_bills
FROM daily_manual_bills
WHERE date = v_target_date AND external_code IS NOT NULL;

SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'title', title,
        'amount', amount,
        'category', category,
        'description', description,
        'store_id', store_id,
        'external_code', external_code
    )), '[]'::jsonb)
INTO v_contas_extras, v_contas_itens
FROM daily_manual_bills
WHERE date = v_target_date AND external_code IS NULL;

-- Se o snapshot tem contas_a_pagar preenchido (seja por importação ou override manual no fechamento), usa-o;
-- Caso contrário, usa a soma dos itens importados em daily_manual_bills.
IF v_snapshot.contas_a_pagar IS NOT NULL AND v_snapshot.contas_a_pagar > 0 THEN
    v_contas_base := v_snapshot.contas_a_pagar;
ELSE
    v_contas_base := v_contas_imported_bills;
END IF;

-- Total Contas Manual = Base (Planilha / Override) + Extras (Manuais Avulsas)
v_contas_manual := v_contas_base + v_contas_extras;
v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;
```

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Importação de Contas (Dia 26/08/2026)
- **Estado Inicial:** Planilha importada com 24 contas (R$ 16.974,94), Juros Rede = R$ 1.864,89.
- **Ação:** Executar RPC `get_daily_reconciliation_summary('2026-08-26')`.
- **Resultado Esperado:**
  - `contas_base` = 16.974,94
  - `contas_extras` = 0,00
  - `contas_manual` = 16.974,94
  - `subtotal_contas` = 18.839,83
  - Card exibe `R$ 16.974,94` (sem duplicação).

### Cenário 2: Adição de Despesa Manual Avulsa no Modal
- **Estado Inicial:** Dia 26/08 com Base R$ 16.974,94 e Extras R$ 0,00.
- **Ação:** Adicionar despesa manual avulsa de R$ 500,00 (ex: "Motoboy Extra") via `ContasManualModal`.
- **Resultado Esperado:**
  - `contas_base` = 16.974,94
  - `contas_extras` = 500,00
  - `contas_manual` = 17.474,94
  - `subtotal_contas` = 19.339,83
  - Card exibe `Base Planilha: R$ 16.974,94 + Extras: R$ 500,00`.

### Cenário 3: Edição Manual da Base via "Editar Fechamento"
- **Estado Inicial:** Dia 26/08 com Base R$ 16.974,94.
- **Ação:** Clicar em "Editar Fechamento", alterar valor do input de Contas para R$ 17.000,00 e clicar em "Salvar Fechamento".
- **Resultado Esperado:**
  - `daily_snapshots.contas_a_pagar` atualizado para 17.000,00.
  - `contas_base` = 17.000,00
  - `contas_manual` = 17.000,00 (+ extras).

### Cenário 4: Imutabilidade de Dias Fechados
- **Estado Inicial:** Dia 24/08/2026 fechado (`is_closed = true`).
- **Ação:** Executar RPC para data fechada.
- **Resultado Esperado:** Retorna exatamente os valores congelados do snapshot sem recalcular.
