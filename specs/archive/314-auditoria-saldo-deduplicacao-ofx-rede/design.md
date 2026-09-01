# Design: Auditoria de Integridade de Saldos, Deduplicação OFX Multi-Dias e Ciclo Rede (314)

## Arquitetura e Fluxo de Dados

`mermaid
sequenceDiagram
    participant User as Operador
    participant Wizard as CentralImportWizard
    participant OFXParser as OFX Parser
    participant DB as Supabase DB
    participant RPC as get_daily_reconciliation_summary
    participant UI as Conciliacao & Dashboard

    User->>Wizard: Upload Arquivo OFX (Multi-Dias: D-1 e D)
    Wizard->>OFXParser: Extrai Transações e LEDGERBAL
    OFXParser-->>Wizard: Array de STMTTRN com DTPOSTED individual
    Wizard->>DB: Upsert em ofx_transactions (target_date = DATE DTPOSTED)
    Wizard->>DB: Upsert em reconciliations (bank_total = LEDGERBAL para data D)

    User->>UI: Acessa Fechamento Diário da Data D
    UI->>RPC: Chama get_daily_reconciliation_summary(p_date = D)
    RPC->>DB: Agrega bank_total das 10 filiais (Positivos e Negativos)
    RPC->>DB: Agrega Cartões a Compensar (Líquido Rede D - Entradas OFX Rede D)
    RPC->>DB: Agrega Pátio de OSs, Dinheiro em Lojas e Contas a Pagar
    RPC-->>UI: Retorna JSON consolidado dos 5 Pilares
    UI-->>User: Exibe Saldo Bancos, Caixa Atual e DRE 100% Equalizados
`

---

## Interfaces TypeScript

`	ypescript
// Interface canônica do Resumo da Conciliação Diária
export interface CanonicalReconciliationSummary {
  date: string;
  is_closed: boolean;
  saldo_bancos_ofx: number;          // Soma direta de bank_total das 10 filiais
  saldo_bancos_positivo: number;     // Apenas filiais com saldo >= 0
  saldo_negativo_itau: number;       // Cheque especial tomado (módulo)
  dinheiro_lojas: number;            // Dinheiro físico em cofre/trânsito
  cartoes_a_compensar: number;       // Vendas líquidas Rede do dia ainda não no extrato
  devolucoes_rede: number;           // Estornos/chargebacks
  total_saldo_banco_positivo: number;// Pilar 1 oficial do card
  total_saldo_banco: number;         // Saldo líquido consolidado
  dinheiro_mp: number;               // Pilar 2
  a_receber: number;                 // Pilar 3 (Boletos/Transferências)
  na_loja_os: number;                // Pilar 4 (OSs em aberto no pátio)
  caixa_atual: number;               // Patrimônio Líquido Total
  caixa_anterior: number;            // Caixa Atual de D-1
  fluxo_caixa: number;               // Caixa Atual D - Caixa Atual D-1
  faturamento_periodo: number;       // Faturamento Líquido do Dia
  valor_disp_contas: number;         // Faturamento - Fluxo de Caixa
  subtotal_contas: number;           // Contas Base + Extras + Juros
  diferenca_final: number;           // Valor Disp. Contas - Subtotal Contas
  status_geral: 'balanced' | 'divergent';
}
`

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. supabase/migrations/20260901000001_fix_bank_balances_ofx_and_rede_reconciliation.sql [NEW]
- Exclui a trigger e função update_reconciliation_bank_total / update_bank_total_from_transactions.
- Atualiza get_store_pos_triple_reconciliation eliminando hardcodes e calculando 
ao_entrou_valor dinâmico.
- Atualiza get_dashboard_metrics para espelhar a fórmula canônica com dedução de Cheque Especial e inclusão de cofre.

### 2. src/components/importacoes/CentralImportWizard.tsx [MODIFY]
- Linhas 818-829: Alterar atribuição de 	arget_date nas transações OFX de 	arget_date: targetDate para 	arget_date: tx.date ? tx.date.split('T')[0] : targetDate.

### 3. src/hooks/useConciliacao.ts [MODIFY]
- Linhas 528-531: Substituir a soma incorreta de 	ype === 'in' pela leitura de 
econciliations.bank_total correspondente à filial e data.

### 4. src/lib/modulo1Calculations.ts & src/hooks/useDashboardV2.ts [MODIFY]
- Atualizar a fórmula de caixa_atual para incluir 
a_loja_os e subtrair saldo_negativo_itau.

### 5. src/components/conciliacao/ResumoDiaPanel.tsx [MODIFY]
- Proteger o upsert de 
econciliations preservando o ank_total existente.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Ingestão de OFX Multi-Dias (Ontem e Hoje)
- **SCAN:** Usuário sobe OFX contendo 2 transações de 26/08 e 4 transações de 27/08 com data do wizard = 27/08.
- **INFER:** Transações de 26/08 devem receber 	arget_date = 2026-08-26 e transações de 27/08 devem receber 	arget_date = 2026-08-27.
- **VERIFY:** A query SELECT COUNT(*) FROM ofx_transactions WHERE target_date = '2026-08-27' retorna exatamente 4, e a data 26/08 não é contaminada.
- **FIX:** O total de entradas de 27/08 bate exatamente com o extrato real daquele dia.

### Cenário 2: Liquidação de Cartão da Rede e Prevenção de Dupla Contagem
- **SCAN:** Venda de R$ 1.000 no crédito em D0. No extrato OFX de D0 entra antecipação de R$ 1.000 da Rede.
- **INFER:** O saldo bancário (LEDGERBAL) sobe R$ 1.000. O 
ao_entrou_valor (a compensar) deve ser R$ 0.
- **VERIFY:** O Pilar 1 soma Saldo Bancos (1.000) + A Compensar (0) = 1.000 (sem duplicar para 2.000).
- **FIX:** O Caixa Atual reflete fielmente a entrada real.
