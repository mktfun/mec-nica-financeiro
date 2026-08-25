# Design: Arquitetura & Lógica de Match da Rede, PIX, Dinheiro e Contabilização do Saldo Total (281)

## 1. Fluxo de Dados Ponta a Ponta

```mermaid
graph TD
    subgraph Fontes de Entrada
        A[Relatório da Rede - POS] -->|Bruto, Líquido, Taxas| POS[(pos_transactions)]
        B[Extratos OFX - 10 Bancos] -->|Entradas Rede, PIX, Depósitos| OFX[(ofx_transactions)]
        C[Conferência OS x Financeiro] -->|OSs Pátio, Dinheiro, PIX| PATIO[(patio_os)]
        C -->|Dinheiro Recebido| VAULT[(store_cash_vault)]
        D[Contas a Pagar] -->|Despesas Lançadas| BILLS[(daily_manual_bills)]
    end

    subgraph Motor de Cálculo & Conciliação
        POS & OFX --> TRIPLE[get_store_pos_triple_reconciliation]
        TRIPLE -->|Rede Líquido vs OFX Rede| COMP[Status: ENTROU / NÃO ENTROU]
        
        VAULT -->|status = 'em_transito'| COFRE[Dinheiro no Cofre]
        
        OFX & COMP & COFRE --> PILAR1[Total Saldo Banco = OFX + Cofre + Não Entrou]
        
        PATIO -->|OSs em Aberto| PILAR4[Pátio OS]
        
        PILAR1 & PILAR4 --> CAIXA_ATUAL[Caixa Atual = Pilar 1 + MP + Receber + Pátio]
        
        CAIXA_ATUAL --> FLUXO[Fluxo de Caixa = Caixa Atual - Caixa Anterior]
        
        FLUXO --> DISP[Valor Disp. Contas = Faturamento - Fluxo de Caixa]
        
        BILLS & POS --> COBERTURA[Subtotal Contas = Contas Manual + Juros Rede]
        
        DISP & COBERTURA --> AUDIT[Diferença Final = Disp - Contas]
    end
```

---

## 2. As 3 Regras de Ouro da Conciliação

1. **Regra de Ouro da Rede:**
   * A venda de cartão só é considerada **"NÃO ENTROU"** se o valor líquido total que passou na maquininha for **maior** do que o lote depositado pela Rede na conta bancária daquela filial.
   * Se for igual ou menor, o status é **`ENTROU`** e o saldo bancário OFX já contém todo o dinheiro.

2. **Regra de Ouro do Dinheiro (Cofre):**
   * Dinheiro que foi levado ao banco e creditado no mesmo dia $\rightarrow$ `status = 'depositado'` (já está dentro do saldo OFX).
   * Dinheiro guardado na gaveta/cofre da loja que ainda não foi ao banco $\rightarrow$ `status = 'em_transito'` (soma no Pilar 1 para não perder patrimônio).

3. **Regra de Ouro do PIX:**
   * O PIX cai na hora na conta corrente. Ele já faz parte do extrato bancário OFX e é identificado pelo valor e nome do cliente para dar baixa na respectiva OS.
