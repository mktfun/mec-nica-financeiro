# 🏛️ Design Técnico Atualizado — Spec 409: Sincronização do Pátio Real (Com Manuais)

## 1. Fluxo de Sincronização

```mermaid
flowchart TD
    subgraph FontesPatio [Fontes de Dados do Pátio]
        PlanilhaFisica["Planilha Física (.xls) 16/09\nRei do Módulo: R$ 11.595,95 (5 OSs)\nDom Pedro: R$ 10.269,20 (4 OSs)"]
        OSManuais["OSs Manuais em Aberto\nRei do Módulo (#1856, #1818): R$ 8.241,30\nDom Pedro (#596): R$ 8.822,46"]
    end

    subgraph PatioOS_Table [Tabela patio_os (SSOT do Pátio)]
        PatioReal["patio_os (Todas as OSs Abertas/Parciais)\nst-09: 5 planilha + 2 manuais = R$ 19.837,25\nst-01: 4 planilha + 1 manual = R$ 19.091,66\nTotal Consolidado 10 Lojas = R$ 83.423,57"]
    end

    subgraph FechamentoDB [Banco de Fechamento]
        Reconciliations["reconciliations (na_loja_os)\nst-09 = 19.837,25\nst-01 = 19.091,66"]
        Snapshots["daily_snapshots (2026-09-16)\ntotal_patio = 83.423,57"]
    end

    subgraph InterfacesUI [Frontend]
        CardGeral["StoreCardModulo1 (Card da Filial)\nExibe: R$ 19.837,25"]
        OSTela["StoreOrdensServicoView (Aba 3 da Filial)\nExibe: R$ 19.837,25"]
        Painel5Pilares["ResumoDiaPanel (5 Pilares)\nPilar Pátio: R$ 83.423,57"]
    end

    PlanilhaFisica --> PatioOS_Table
    OSManuais --> PatioOS_Table
    PatioReal -->|Sincronização Direta| Reconciliations
    Reconciliations --> Snapshots

    Reconciliations --> CardGeral
    PatioReal --> OSTela
    Snapshots --> Painel5Pilares
```

---

## 2. Ações Técnicas

1. **`reconciliations` (Data: 2026-09-16):**
   - Atualizar `st-09`: `na_loja_os = 19837.25`
   - Atualizar `st-01`: `na_loja_os = 19091.66`
2. **`daily_snapshots` (Data: 2026-09-16):**
   - Garantir `total_patio = 83423.57` e `metadata.total_patio = 83423.57`.
3. **Frontend / RPC:**
   - Como a RPC `get_daily_reconciliation_summary` lê `reconciliations.na_loja_os`, assim que a tabela for atualizada, tanto o Card quanto a tela interna estarão com **R$ 19.837,25** e **R$ 19.091,66**, sem qualquer divergência.
