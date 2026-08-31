# Design: Pareamento de Quitações em OSs Finalizadas e Encadeamento Canônico de Odômetro (316)

## 1. Arquitetura do Fluxo de Auto-Match e Encadeamento
```
[Extrato OFX: PIX de Quitação] 
       │
       ▼
[auto_match_transactions(p_date)]
       ├── Passo 1A: Match Textual (Regex do número da OS no memo/counterpart)
       ├── Passo 1B: Match por Saldo Restante em OSs Abertas
       └── Passo 1C: Match de Quitação em OSs Finalizadas (Últimos 7 dias)
             │
             ├── Atualiza ofx_transactions.matched_os_number
             └── Se status != 'finalizada' -> Atualiza paid_value e fecha
                 Se status == 'finalizada' -> Apenas vincula matched_ofx_id (Pátio inalterado)

[Importação do dia 31/08/2026]
       │
       ▼
[usePreviousDaySnapshot('2026-08-31')]
       └── Busca Snapshot de 28/08/2026 -> Extrai metadata.odometro_hoje = R$ 920.496,64
       │
       ▼
[CentralImportWizard: Step 3 & Step 4]
       └── Exibe Odômetro Anterior: R$ 920.496,64
       └── Input Odômetro Hoje: R$ 945.000,00 (exemplo)
       └── Delta Faturamento: R$ 24.503,36
```

---

## 2. Mutações Propostas nos Componentes Existentes [MODIFY]

### A. `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx` [MODIFY]
1. Consulta até 200 OSs da filial sem filtrar por status (trazendo abertas e finalizadas).
2. Adiciona heurística de ordenação com badge `Sugestão (Valor Compatível)` no topo.
3. Permite vínculo em 1-clique disparando atualização atômica em `ofx_transactions`, `transactions` e `conciliation_matches`.

### B. `src/components/importacoes/CentralImportWizard.tsx` [MODIFY]
1. No Step 3 (Valores Manuais): Exibir Odômetro Anterior (**R$ 920.496,64**) e calcular o delta instantaneamente.
2. Na persistência (`handleConfirm`): Gravar `metadata.odometro_hoje`, `metadata.faturamento_anterior` e `faturamento_oi_base`.

### C. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` [MODIFY]
1. Exibir no Card 5 (Faturamento do Dia) o Odômetro Hoje, o Odômetro Anterior e o Delta do Dia.

### D. `supabase/migrations/20260831000002_fix_automatch_and_odometro_encadeamento.sql` [NEW]
1. Implementar nova versão de `auto_match_transactions` com 3 camadas de matching.
2. Atualizar `get_daily_reconciliation_summary` para incluir `'faturamento_anterior'` no Ramal 2.

---

## 3. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Auto-Matching de PIX de Quitação de OS Finalizada
- **SCAN:** Transação OFX de R$ 500,00 com contraparte "Carlos Silva - OS 18456" de loja onde a OS #18456 foi fechada no dia.
- **INFER:** `auto_match_transactions` vincula `ofx_transactions.matched_os_number = '18456'` sem alterar o status e sem inflar o `na_loja_os`.
- **VERIFY:** A transação sai de "Pendentes para Vincular" e o pátio continua em R$ 62.835,12.

### Cenário 2: Encadeamento de Odômetro para o dia 31/08/2026
- **SCAN:** Abrir o Wizard de Importação selecionando a data 31/08/2026.
- **INFER:** O campo "Odômetro Anterior" deve exibir automaticamente **R$ 920.496,64** (vindo do fechamento de 28/08).
- **VERIFY:** Ao digitar um novo odômetro (ex: 945.000,00), o Faturamento do Dia calcula imediatamente R$ 24.503,36.
