# Design: 282 — Blindagem Definitiva de Idempotência, Consistência Temporal do Cofre e Conciliação Canônica Multi-Loja

## Arquitetura Técnica
Diagrama do fluxo de processamento e persistência blindada:

```
[Upload de Arquivos no Wizard] 
       │
       ├── CentralImportWizard.tsx (Geração de dedup_hash com entropia idx/bandeira/valores)
       │         │
       │         ▼
       │   pos_transactions (uq_pos_transactions_store_hash)
       │
       └── useImportProcessor.ts
                 │
                 ├── [1. Pátio OS] ──► patio_os (uq_patio_os_store_os_number)
                 │                      └─► Upsert defensivo (GREATEST(paid_value))
                 │
                 └── [2. Cofre Dinheiro] ──► store_cash_vault (uq_store_cash_vault_store_os)
                                              └─► Ingestão com os_number_ref indexado
       │
       ▼
[Motor Canônico de Fechamento] ──► RPC get_daily_reconciliation_summary(p_date)
                                         │
                                         ├── Agregação Temporal do Cofre:
                                         │   entry_date <= p_date AND (em_transito OR deposited_at::date > p_date)
                                         │
                                         └── Agregação Deduplicada da Rede:
                                             rede_bruto, rede_liquido, rede_taxas
       │
       ▼
[Interface do Usuário] ──► /conciliacao (Cards dos 5 Pilares) + SaldoBancosDetailModal (Baixas em D+1)
```

## Interfaces TypeScript

```typescript
// Interface atualizada para registros de cofre em trânsito
export interface StoreVaultEntry {
  id: string;
  store_id: string;
  amount: number;
  description: string;
  entry_date: string;
  status: 'em_transito' | 'depositado' | 'pending';
  os_number_ref?: string | null;
  deposited_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Payload de entrada de POS no CentralImportWizard
export interface PosImportItem {
  id?: string;
  store_id: string;
  store_name?: string;
  title: string;
  subtitle?: string;
  amount: number;
  gross_amount: number;
  fee_amount: number;
  type: 'in';
  occurred_at: string;
  target_date: string;
  icon_type: 'card';
  source: 'rede';
  dedup_hash: string;
}
```

## Componentes / Hooks / Funções

| Artefato | Caminho | Responsabilidade |
|---|---|---|
| **Migration SQL** | `supabase/migrations/20260825000001_fix_reconciliation_idempotency_and_vault_temporal.sql` | Limpeza de duplicatas, colunas dedicadas (`os_number_ref`, `dedup_hash`), índices únicos e atualização da RPC `get_daily_reconciliation_summary` com consistência temporal. |
| **Hook de Ingestão** | `src/hooks/useImportProcessor.ts` | Processamento atômico de OS com `os_number_ref` e upsert defensivo de `patio_os`. |
| **Wizard de Importação** | `src/components/importacoes/CentralImportWizard.tsx` | Deduplicação de vendas POS com entropia única por linha para preservar vendas legítimas de mesmo valor. |
| **Modal Raio-X & Baixas** | `src/components/conciliacao/SaldoBancosDetailModal.tsx` | Baixa de depósito com carimbo de `deposited_at` e atualização em tempo real. |

## Fluxo de UI
1. O usuário acessa a Central de Importações e faz o upload simultâneo dos arquivos das 10 filiais.
2. O sistema processa as vendas da Rede gerando chaves únicas determinísticas que garantem o registro exato de cada maquininha.
3. Ao processar OSs com pagamento em dinheiro, cria registros no cofre associados à coluna `os_number_ref`.
4. No Dashboard de Conciliação (`/conciliacao`), ao abrir o modal de Saldo Bancos (`SaldoBancosDetailModal`), o usuário pode visualizar e dar baixa em valores depositados.
5. Ao retroagir para datas passadas, o valor do cofre permanece íntegro na data em que estava fisicamente na loja, garantindo consistência histórica inabalável.

## Infra / Deploy
- Nenhuma alteração de infraestrutura externa ou portas.
- Migração executada via PostgreSQL Client / Supabase Migration.
- Compatível com o ambiente headless e CI/CD.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Reimportação Idempotente de OSs com Dinheiro
- **SCAN:** Verificar se a planilha de OS contém R$ 350,00 em dinheiro na OS #999.
- **INFER:** A primeira importação insere em `store_cash_vault` com `os_number_ref = '999'`. A reimportação imediata deve manter exatamente 1 registro.
- **VERIFY:** Executar reimportação 3x consecutivas e validar `SELECT count(*) FROM store_cash_vault WHERE os_number_ref = '999'` = 1.
- **FIX:** Trava garantida pelo índice único `uq_store_cash_vault_store_os`.

### Cenário 2: Baixa de Depósito com Preservação Histórica (D vs D+1)
- **SCAN:** OS com R$ 500,00 em dinheiro no dia $D$ (`2026-08-24`).
- **INFER:** Baixa realizada em $D+1$ (`2026-08-25`).
- **VERIFY:** Consultar `get_daily_reconciliation_summary('2026-08-24')` $\rightarrow$ cofre inclui R$ 500,00. Consultar `get_daily_reconciliation_summary('2026-08-25')` $\rightarrow$ cofre exclui R$ 500,00 (pois entrou no OFX do dia 25).
- **FIX:** Cláusula `(status = 'depositado' AND deposited_at::date > v_target_date)` ativa na RPC.

### Cenário 3: Múltiplas Vendas de Mesmo Valor na Rede
- **SCAN:** Relatório da Rede contendo 5 transações de R$ 100,00 na Loja 1 no mesmo dia.
- **INFER:** Todas as 5 transações devem ser gravadas e somar R$ 500,00 líquido.
- **VERIFY:** Checar `SELECT sum(net_amount), count(*) FROM pos_transactions WHERE target_date = '...'` $\rightarrow$ count = 5, sum = 500.00.
- **FIX:** Entropia determinística com índice de linha no `CentralImportWizard.tsx`.
