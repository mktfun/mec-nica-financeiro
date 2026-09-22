# Design — Spec 431: Saneamento do Caixa Atual, Pátio e Reconciliação Macro

## 1. Arquitetura de Fluxo e Fórmulas

```mermaid
flowchart TD
    subgraph Files [Arquivos do Desktop]
        OFX[10 Bancos OFX]
        Rede[Rede Vendas XLSX]
        OS[10 Arquivos ConferenciaOSxFinanceiro]
        Contas[BuscaContasAPagar XLS]
        Metas[Mapa de Metas PDF]
    end

    subgraph DB [Banco de Dados Supabase]
        T_Ofx[ofx_transactions]
        T_Rede[pos_transactions]
        T_Patio[patio_os]
        T_Bills[daily_manual_bills]
        T_Snap[daily_snapshots]
    end

    subgraph Pillars [5 Macro Pilares do Caixa]
        P1[1. Saldo Bancos Positivos + Cartões a Compensar]
        P2[2. Dinheiro MP]
        P3[3. A Receber]
        P4[4. Na Loja OS / Pátio Auditado]
        P5[5. Dinheiro em Lojas / Cofre em Trânsito]
        D1[(-) Cheque Especial / Devedor Itaú]
    end

    subgraph CashFlow [Fluxo Contábil Universal]
        CA[Caixa Atual = P1 + P2 + P3 + P4 + P5 - D1]
        CANT[Caixa Anterior = Snapshot D-1]
        FC[Fluxo de Caixa = Caixa Atual - Caixa Anterior]
        VDC[Valor Disp. Contas = Faturamento - Fluxo de Caixa]
        SBC[Subtotal Contas = Contas Base + Juros Rede]
        DIF[Diferença Final = Valor Disp. Contas - Subtotal Contas]
    end

    Files --> DB
    DB --> Pillars
    Pillars --> CashFlow
```

### 1.1 Fórmulas Canônicas Estritas

1. **Caixa Atual:**
   $$\text{Caixa Atual} = (\text{Saldo Bancos Positivos} + \text{Cartões a Compensar} + \text{Dinheiro MP} + \text{A Receber} + \text{Pátio Aberto} + \text{Dinheiro Cofre}) - \text{Cheque Especial Negativo}$$

2. **Fluxo de Caixa:**
   $$\text{Fluxo de Caixa} = \text{Caixa Atual}(D) - \text{Caixa Atual}(D-1)$$

3. **Valor Disponível para Contas:**
   $$\text{Valor Disp. Contas} = \text{Faturamento Odômetro} - \text{Fluxo de Caixa}$$

4. **Diferença Final:**
   $$\text{Diferença Final} = \text{Valor Disp. Contas} - (\text{Contas Base} + \text{Juros Rede})$$

---

## 2. Interfaces TypeScript Reais

```typescript
export interface DailyReconciliationSummary {
  date: string;
  is_closed: boolean;
  is_marco_zero?: boolean;
  status_geral: 'approved' | 'divergence';
  diferenca_final: number;
  
  // 5 Macro Pilares
  saldo_bancos_ofx: number;
  saldo_bancos_positivo: number;
  saldo_negativo_itau: number;
  dinheiro_lojas: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  cartoes_a_compensar: number;
  
  // Fluxo e Fechamento
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_periodo: number;
  valor_disp_contas: number;
  contas_base: number;
  juros_rede: number;
  subtotal_contas: number;
  
  stores: StoreCardData[];
}
```

---

## 3. Cenários Obrigatórios

### 3.1 Happy Path
- **Cenário:** O usuário abre `/conciliacao?date=2026-09-22`.
- **Comportamento:**
  - `CAIXA ANTERIOR` exibe exatamente o mesmo valor do `CAIXA ATUAL` do dia anterior (21/09).
  - O valor de Pátio reflete estritamente a soma das OSs com `Restante na OS > 0` da data (R$ 68.152,06).
  - Não há OSs zumbis de dias anteriores computadas indevidamente.
  - A diferença final respeita a tolerância canônica de ± R$ 50,00 ou aponta apenas resíduos reais de conciliação.

### 3.2 Edge Case
- **Cenário:** A loja possui dinheiro em cofre/trânsito (`dinheiro_lojas > 0`), mas nenhuma movimentação de depósito no dia.
- **Comportamento:**
  - `dinheiro_lojas` entra integralmente na composição de `calculatedCaixaAtual`, mantendo o fluxo perfeitamente contínuo entre $D$ e $D+1$ sem perdas de R$ 1.960,00.

---

## 4. Critérios de Aceitação Verificáveis

1. **Critério 1 (Continuidade de Caixa):**
   - `Caixa Anterior` de 22/09 no backend e na UI deve ser rigorosamente igual a `Caixa Atual` de 21/09 (delta = 0).
2. **Critério 2 (Saneamento do Pátio):**
   - A query de `patio_os` para 22/09 deve retornar R$ 68.152,06, batendo 100% com a soma física de `Restante na OS` dos 10 arquivos `*_ConferenciaOSxFinanceiro.xls`.
3. **Critério 3 (Desduplicação de Juros em 21/09):**
   - Em 21/09, a base de contas manuais não pode conter os Juros da Rede em duplicidade.
4. **Critério 4 (Terminal Gate):**
   - `npm run build` deve executar com exit code 0 sem erros de compilação ou tipagem.

---

## 5. Cenários de Teste

1. **[SCAN & VERIFY] Teste Automatizado de Confronto de Arquivos:**
   - Script node executando a extração dos arquivos brutos do Desktop e comparando com o payload retornado pela RPC `get_daily_reconciliation_summary` em 21/09 e 22/09.
2. **[UI & STORE CONTINUITY] Verificação da Interface do Usuário:**
   - Card Hero e Cards das Filiais exibindo valores consistentes de Caixa Atual, Caixa Anterior e Pátio sem layout shifts ou números truncados.
