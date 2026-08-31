# Design: Correção do Saldo de Pátio OS por Filial, Sincronização de Totais e Baixa Granular de Dinheiro por OS (318)

## Arquitetura e Fluxo de Dados

### 1. Fluxo de Ordens de Serviço & Sincronização de Pátio
```text
[Operador insere/edita OS] 
       │
       ▼
[patio_os (Postgres)] 
       │
       ├──► [GREATEST(0, total_value - paid_value)] (Cálculo Canônico de Saldo)
       │
       ├──► [Sync Atômico] ──► [reconciliations.na_loja_os] & [daily_snapshots.total_patio]
       │
       ▼
[RPC get_daily_reconciliation_summary] ──► [useDailyReconciliationSummary]
       │
       ├──► [Cockpit Geral: ResumoDiaPanel.tsx (Card NA LOJA OS)]
       └──► [Página da Loja: conciliacao.$lojaId.tsx (Card Topo NA LOJA OS)]
```

### 2. Fluxo de Baixa Granular de Dinheiro no Cofre
```text
[Operador clica em 'Dar Baixa' em SaldoBancosDetailModal.tsx]
       │
       ▼
[BaixaDinheiroModal.tsx (Dark UI Zinc-950)]
       │
       ├── Consulta store_cash_vault WHERE store_id = X AND status = 'em_transito'
       ├── Exibe tabela com OSs, Placas, Valores em Espécie e Checkboxes
       ├── Permite Baixa Total ou Parcial por OS
       │
       ▼
[RPC dar_baixa_dinheiro / Supabase Mutation]
       │
       ├── Atualiza store_cash_vault.status = 'depositado', deposited_at = now()
       ├── Registra log de auditoria em patio_os.history_log
       │
       ▼
[Invalidação React Query] ──► Recalcula Dinheiro em Cofre no Caixa Atual
```

---

## Interfaces TypeScript

```typescript
export interface PatioOsItem {
  id: string;
  os_number: string;
  store_id: string;
  store_name?: string;
  plate?: string;
  client_name?: string;
  total_value: number;
  paid_value: number;
  saldo_patio: number;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado' | 'cancelado' | 'ENTROU';
  payment_method?: string;
  cash_value?: number;
  opened_at?: string;
  closed_at?: string;
}

export interface BaixaDinheiroItem {
  vaultId: string;
  osNumber?: string;
  amount: number;
  amountToDeposit: number;
  isPartial: boolean;
  notes?: string;
}

export interface BaixaDinheiroModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  targetDate: string;
  totalDinheiroCofre: number;
  onSuccess?: () => void;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

- `supabase/migrations/20260831000004_fix_patio_os_aggregation_and_cash_vault_baixa.sql` `[NEW]`:
  - Migration adicionando colunas `patio_os_id` e `matched_ofx_id` em `store_cash_vault`.
  - RPC `dar_baixa_dinheiro`.
  - Atualização da RPC `get_daily_reconciliation_summary` e `calculate_daily_conciliation` para priorizar a soma canônica de `patio_os`.
- `src/components/conciliacao/StoreOrdensServicoView.tsx` `[MODIFY]`:
  - Cálculo reativo de saldo no modal de criação/edição.
  - Sincronização atômica de `reconciliations.na_loja_os` após insert manual.
- `src/components/conciliacao/SaldoBancosDetailModal.tsx` `[MODIFY]`:
  - Conectar botão "Dar Baixa" ao modal `BaixaDinheiroModal.tsx` por filial.
- `src/components/conciliacao/BaixaDinheiroModal.tsx` `[MODIFY]`:
  - Redesenho completo para padrão Dark UI com seleção granular por OS, baixa parcial/total e feedback de saldo.
- `src/routes/conciliacao.$lojaId.tsx` `[MODIFY]`:
  - Sincronização dos cards superiores com os dados atualizados de `dailySummary.stores`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Sincronização de Pátio OS e Paridade Header x Tabela
- **SCAN:** Acessar a página da filial Rudge Ramos no dia 31/08/2026.
- **INFER:** O card superior "NA LOJA OS" deve exibir exatamente a soma dos saldos das OSs em aberto no pátio (R$ 15.488,57), sem divergência em relação à aba "3. Ordens de Serviço (OS & Pátio)".
- **VERIFY:** Ao cadastrar uma nova OS manual de R$ 1.000,00 com R$ 300,00 pagos, o Saldo no Pátio deve subir exatamente R$ 700,00 no header e no cockpit geral.
- **FIX:** Garantir que `handleCreateManualOs` dispare o recálculo e invalidação do cache.

### Cenário 2: Baixa Granular de Dinheiro no Cofre por OS
- **SCAN:** Abrir o modal "Raio-X de Saldos Bancários" (`SaldoBancosDetailModal.tsx`) e clicar em "Dar Baixa" na filial Dom Pedro (Cofre R$ 3.250,00).
- **INFER:** O modal `BaixaDinheiroModal` lista as OSs com recebimento em dinheiro. O operador seleciona uma OS de R$ 1.500,00 e confirma a baixa.
- **VERIFY:** O saldo em cofre da Dom Pedro é reduzido para R$ 1.750,00 e o Caixa Atual reflete a transferência de custódia sem duplicidade ou perda histórica em D-1.
