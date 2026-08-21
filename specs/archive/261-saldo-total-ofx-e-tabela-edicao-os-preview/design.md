# Design: Saldo Total OFX e Tabela de Edição de OSs no Preview (261)

## Arquitetura Técnica

```mermaid
graph TD
    A[Arquivos Importados: OFX, OSs, Rede, Contas] --> B[useCentralImport Parser]
    B --> C[Step 3: Preview & Conferência]
    
    subgraph "Visualização Consolidada OFX"
        C --> D1[Card: Saldo Total Bancário - OFX]
        D1 --> D2[Soma Total de Entradas OFX + Total Transações]
    end
    
    subgraph "Painel de Edição Livre de OSs"
        C --> E1[Tabela de OSs Importadas results.osFiles]
        E1 --> E2[Inputs Editáveis: total_value, paid_value, status]
        E2 --> E3[Recálculo Reativo em Tempo Real: Total OS, Estoque em Pátio]
    end
    
    C --> F[Botão: Confirmar e Gravar Conciliação]
    F --> G[executeDailyClosing com Valores Auditados]
    G --> H[Supabase: transactions, patio_os, daily_snapshots, reconciliations]
    H --> I[RPC: auto_match_transactions & run_autonomous_reconciliation_loop]
```

## Componentes / Hooks / Funções Modificadas

1. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - **`updateImportedOs(fileName: string, osNumber: string, field: 'total_value' | 'paid_value' | 'status', value: any)`:**
     Atualiza o array `results.osFiles` no estado, recalculando instantaneamente:
     - `totalOs` (soma dos `paid_value` / `delta_paid`)
     - `totalPatioEstoqueGlobal` (soma dos `total_value`)
     - `filteredOsCount` e `allOsCount`
     - Previsões por loja (`rawOsMaq`, `storePatioValor`)
   - **Tabela de OSs Importadas:**
     - Tabela dedicada com cabeçalho contendo Busca, Seletor de Loja e Seletor de Status (Todas, Em Aberto, Pagas Parcialmente, Finalizadas).
     - Exibição de: Loja, OS / Placa, Data Abertura, Valor Total (Input R$), Total Pago (Input R$), Saldo Pendente (R$ calculado) e Status (Select).
     - Realce visual nos registros alterados.
   - **Card de OFX:**
     - Nomenclatura atualizada para `Saldo Total Bancário (OFX)` / `Total Extratos (OFX)`.
