# Design: Unificação da Fonte da Verdade do Pátio (NA LOJA OS) (Spec 270)

## Arquitetura Técnica

```
                    ┌────────────────────────┐
                    │  Tabela física:        │
                    │  `patio_os`            │
                    │  (Fonte da Verdade)    │
                    └───────────┬────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐
│ RPC Supabase     │  │ Hook React:      │  │ Step 3 Import Wizard    │
│ `get_daily_...`  │  │ `usePatioOs`     │  │ & MissingPatioOsEditor  │
│ (v_na_loja_os)   │  │                  │  │                         │
└────────┬─────────┘  └────────┬─────────┘  └────────────┬────────────┘
         │                     │                         │
         ▼                     ▼                         ▼
┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐
│ Card NA LOJA OS  │  │ PatioOsDetail    │  │ Sincronização em Lote   │
│ (ResumoDiaPanel) │  │ Modal            │  │ (patio_os + snapshot)   │
│ R$ 91.993,66     │  │ R$ 91.993,66     │  │ R$ 91.993,66            │
└──────────────────┘  └──────────────────┘  └─────────────────────────┘
```

## Regra Canônica de Cálculo do Pátio
Para qualquer data alvo $D$:
```sql
SELECT 
    store_id,
    COALESCE(SUM(
        COALESCE(total_value, 0) - COALESCE(paid_value, 0)
    ), 0) AS patio_liquido
FROM patio_os
WHERE opened_at::date <= D
  AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
  AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
GROUP BY store_id;
```

## Componentes / Hooks Afetados

1. **`supabase/migrations/20260824000003_unify_patio_os_source_of_truth.sql`:**
   * Atualiza `get_daily_reconciliation_summary` para calcular `v_na_loja_os` e o pátio por filial exclusivamente a partir da query canônica de `patio_os`.
   * Elimina fallbacks obsoletos que liam valores congelados de `reconciliations.na_loja_os` desatualizados.

2. **`src/components/conciliacao/PatioOsDetailModal.tsx`:**
   * Após mutação (`updateOsMutation`), além de invalidar as queries, dispara atualização de `daily_snapshots.total_patio` e `reconciliations.na_loja_os` para garantir paridade total instantânea.

3. **`src/components/importacoes/CentralImportWizard.tsx`:**
   * No Step 4 (Gravação Final), persiste `patio_os`, `daily_snapshots.total_patio` e `reconciliations.na_loja_os` com a soma unificada exata apurada no Step 3.

## Cenários de Verificação
- **Cenário 1 (Card vs Modal):**
  * Abrir tela de Conciliação em 24/08/2026 → Card "NA LOJA OS" deve exibir **R$ 91.993,66**.
  * Clicar em "Ver OSs >" → Modal exibe **R$ 91.993,66** (34 OSs). Divergência zero ($\Delta = 0$).
- **Cenário 2 (Edição de OS em Tempo Real):**
  * Alterar o status de uma OS para "Finalizada" ou mudar valor pago no modal → Salvar → O Card "NA LOJA OS" da tela principal recalcula imediatamente no valor atualizado.
