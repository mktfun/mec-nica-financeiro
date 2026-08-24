# Design: Motor Inteligente de Auto-Match (Rede ↔ OS) e Carry-Over de Pátio (Spec 274)

## Arquitetura Técnica do Motor

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IMPORTAÇÃO REDE (pos_transactions)                       │
│    Venda: R$ 12.900,00 na Loja st-09 (Rei do Módulo)        │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. MOTOR DE AUTO-MATCH (Rede ↔ OS)                          │
│    Localiza OS #1847 na st-09 com total_value = R$ 12.900   │
│    -> Atualiza patio_os: paid_value = 12900                 │
│    -> Status: Finalizada / Pátio: R$ 0,00                   │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. CARRY-OVER CUMULATIVO DE PÁTIO                           │
│    Preserva OS #2326 (R$ 9.218,73) de Santo André           │
│    mesmo quando o relatório XLS filtra apenas mês corrente  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RESULTADO MATEMÁTICO CONSOLIDADO                         │
│    Pátio Total = R$ 88.212,39                               │
│    Caixa Atual = R$ 175.685,99                              │
│    Fluxo de Caixa = +R$ 25.085,70                           │
│    Valor Disp. Contas = R$ 45.725,86                        │
│    Total Contas = R$ 45.719,66                              │
│    -> DIFERENÇA FINAL = +R$ 6,20 (CONCILIADO COM SUCESSO)   │
└─────────────────────────────────────────────────────────────┘
```

## Modificações no Banco de Dados
1. Migração SQL `20260824000006_sync_patio_os_forensic_excel_2408.sql`:
   * Atualizar `patio_os` para Santo André OS #2326 (`total_value: 9218.73`, `paid_value: 0`, `status: 'em_aberto'`).
   * Atualizar `patio_os` para Rei do Módulo OS #1847 (`paid_value: 12900`, `status: 'finalizada'`).

## Modificações no Importador (`useImportProcessor.ts` / `useOsImportProcessor.ts`)
* Integrar rotina de auto-vinculação para transações da Rede que cubram OSs em aberto na mesma loja.
