# Round 1 — Architect: Arquitetura Contábil, Integridade Matemática e Modelagem de Cheque Especial

## 1. Diagnóstico do Problema Arquitetural

O conflito apresentado decorre de uma **confusão estrutural entre três dimensões financeiras distintas**:
1. **Regime de Competência e Desempenho Operacional** (quanto a loja faturou e gerou de valor no dia: ex. $+R\$ 6.000,00$).
2. **Regime de Caixa / Liquidez Livre Disponível** (quanto restou desimpedido na conta corrente: $R\$ 0,00$).
3. **Posição Patrimonial / Estrutura de Capital** (o saldo real da conta no banco: $-R\$ 1.000,00$, saindo de $-R\$ 7.000,00$).

### A Falha Estrutural Clássica
Tratar contas bancárias com saldo negativo como um "Ativo Circulante com sinal negativo" sem segregação de passivo gera duas anomalias arquiteturais graves:
- **Dissonância Cognitiva de UX**: O operador enxerga $+R\$ 6.000,00$ de entradas no terminal/dashboard e assume que há dinheiro livre para pagar fornecedores ou retirada de sócios, quando na verdade o banco realizou uma **amortização compulsória de passivo rotativo**.
- **Fragilidade na Integridade Matemática Multiloja**: Em consolidações contábeis de rede de franquias/filiais, somar saldos negativos de bancos diretamente em "Disponibilidades" mascara a alavancagem de curto prazo da rede e distorce as fórmulas de *Disponível para Contas* e *Fluxo de Caixa Líquido*.

---

## 2. Princípios Arquiteturais e Fundações de Modelagem

Para garantir robustez de longo prazo sem acumulação de dívida técnica, a arquitetura deve se apoiar em **três pilares fundamentais**:

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   ENTRADA OPERACIONAL                  │
                       │           (+R$ 6.000,00 via PIX/Rede/OS)               │
                       └───────────────────────────┬────────────────────────────┘
                                                   │
                                                   ▼
                       ┌────────────────────────────────────────────────────────┐
                       │          MOTOR DE ALOCAÇÃO DE FLUXO (RPC)              │
                       │      Detecta Passivo Rotativo Inicial (-R$ 7.000)      │
                       └───────────────────┬────────────────┬───────────────────┘
                                           │                │
                 [Amortização Compulsória] │                │ [Excedente Líquido]
                                           ▼                ▼
┌──────────────────────────────────────────────┐        ┌──────────────────────────────────────────────┐
│        REDUÇÃO DE PASSIVO CIRCULANTE         │        │           CAIXA LIVRE OPERACIONAL            │
│   - Cobertura de Cheque Especial: R$ 6.000   │        │     - Disponível para Novas Contas: R$ 0     │
│   - Novo Saldo Contábil: -R$ 1.000,00        │        │     - Preserva integridade de pagamentos     │
└──────────────────────────────────────────────┘        └──────────────────────────────────────────────┘
```

### 2.1. Desacoplamento da Equação de Fechamento Diário
A fórmula clássica de fechamento diário do sistema:
$$\text{Disponível} = \text{Faturamento do Dia} - \text{Fluxo de Caixa}$$

Quando aplicada a um banco negativo, o fluxo de caixa matemático é:
$$\Delta\text{Caixa} = \text{Caixa Hoje } (-1.000) - \text{Caixa Ontem } (-7.000) = +6.000$$

A integridade matemática é perfeita ($(-1.000) - (-7.000) = +6.000$), mas o **significado econômico** deve ser explicitamente decomposto em duas variáveis no banco de dados e no snapshot:
1. **$\text{Fluxo Operacional Bruto (Inflow)}$**: $+R\$ 6.000,00$
2. **$\text{Amortização de Limite Rotativo (Debt Absorption)}$**: $-R\$ 6.000,00$
3. **$\text{Caixa Livre para Desembolsos Adicionais}$**: $R\$ 0,00$

---

## 3. Especificação do Modelo de Dados (Supabase / PostgreSQL)

Para que o backend suporte nativamente contas negativas sem hacks em queries ou scripts temporários, propõe-se a seguinte estrutura:

### 3.1. Extensão de `public.bank_accounts`
```sql
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS overdraft_limit NUMERIC(12,2) DEFAULT 0.00,       -- Limite contratado de Cheque Especial
ADD COLUMN IF NOT EXISTS allow_negative_balance BOOLEAN DEFAULT FALSE,     -- Flag de conta com limite rotativo
ADD COLUMN IF NOT EXISTS interest_rate_monthly NUMERIC(5,2) DEFAULT 0.00;  -- Taxa estimada de juros rotativo
```

### 3.2. Extensão de `public.daily_snapshots`
O snapshot diário de conciliação deve armazenar explicitamente os componentes de fluxo e patrimônio:
```sql
ALTER TABLE public.daily_snapshots
ADD COLUMN IF NOT EXISTS bank_balance_nominal NUMERIC(12,2) DEFAULT 0.00,     -- Saldo contábil extrato (-1.000,00)
ADD COLUMN IF NOT EXISTS overdraft_used NUMERIC(12,2) DEFAULT 0.00,            -- Volume de limite tomado (1.000,00)
ADD COLUMN IF NOT EXISTS overdraft_amortized_today NUMERIC(12,2) DEFAULT 0.00, -- Quanto do faturamento cobriu limite (6.000,00)
ADD COLUMN IF NOT EXISTS operational_inflow_today NUMERIC(12,2) DEFAULT 0.00,  -- Total de créditos operacionais recebidos (+6.000,00)
ADD COLUMN IF NOT EXISTS free_cash_generated_today NUMERIC(12,2) DEFAULT 0.00; -- Caixa líquido restante (> 0 se cobriu todo o limite)
```

### 3.3. Classificação de Encargos em `public.ofx_transactions`
Transações bancárias de juros de cheque especial (`JUROS CH ESP`, `IOF`, `TAR CLAS ROT`) devem ser classificadas como `financial_expense` e isoladas das despesas operacionais da loja, vinculando-se diretamente ao cálculo de custo financeiro da conta.

---

## 4. Arquitetura da Solução de UX / Interface

A interface deve transformar a ansiedade do operador em clareza analítica através do padrão **"Dual-Card & Cash Waterfall"**.

### 4.1. Cartões de Métricas Bipolares (Visão Operacional vs. Visão Tesouraria)
No topo do Fechamento Diário da Loja, apresentamos dois blocos contrastantes e complementares:

1. **Card A: Desempenho Operacional do Dia (A Força da Loja)**
   - **Valor Central:** $+R\$ 6.000,00$ *(Créditos Operacionais Recebidos)*
   - **Detalhamento:** PIX ($R\$ 2.500$) | Rede Cartões ($R\$ 3.000$) | Dinheiro Loja ($R\$ 500$)
   - **Mensagem Positiva:** *"Sua loja gerou R$ 6.000,00 em receitas hoje."*

2. **Card B: Destinação de Caixa & Posição Bancária (A Realidade de Tesouraria)**
   - **Valor Central:** $-R\$ 1.000,00$ *(Saldo Contábil em Conta Corrente)*
   - **Sub-indicadores:**
     - Amortização de Dívida: $-R\$ 6.000,00$ *(Redução do Cheque Especial)*
     - Limite de Cheque Especial Utilizado: $R\$ 1.000,00$ de $R\$ 10.000,00$ contratados.
     - Saldo Disponível para Saque/TED: $R\$ 9.000,00$ *(Limite Restante)*
   - **Mensagem de Desalavancagem:** *"Seu caixa operacional pagou R$ 6.000,00 do saldo devedor anterior (-R$ 7.000,00 $\rightarrow$ -R$ 1.000,00)."*

### 4.2. O Componente "Waterfall de Caixa do Dia" (DRE de Caixa)
Um diagrama visual em cascata (Waterfall Step Chart):
```
[ Saldo Inicial D-1: -R$ 7.000,00 ]
         │
         ▼  (+) Entradas do Dia: +R$ 6.000,00 (PIX, Cartão, Dinheiro)
[ Posição Intermediária: -R$ 1.000,00 ]
         │
         ▼  (-) Pagamentos / Despesas do Dia: R$ 0,00
         │
         ▼  (-) Encargos / IOF do Limite: R$ 0,00
         │
         ▼
[ Saldo Final em Conta D: -R$ 1.000,00 ]  ──> [ Conciliação 100% Batida (Diff: R$ 0,00) ]
```

---

## 5. Garantia de Isolamento e Não-Contaminação Multiloja

Para garantir que a modelagem de uma loja no cheque especial não quebre as regras globais do sistema:

1. **Isolamento de Entidades por `store_id`**: Cada loja mantém seu próprio livro de liquidez e limites bancários. A conta negativa da Loja A nunca é compensada contra o saldo positivo da Loja B no fechamento diário individual.
2. **Consolidação Vetorial na Matriz**: No Dashboard Executivo Consolidado:
   - **Disponibilidades Reais Positivas (Ativo):** $\sum \max(0, \text{Saldo Loja}_i)$
   - **Passivo Rotativo Tomado (Passivo):** $\sum \min(0, \text{Saldo Loja}_i)$
   - **Posição Líquida Consolidada:** $\text{Ativo} - \text{Passivo}$
   Isso impede que uma loja no vermelho "suma" artificialmente dentro do caixa saudável de outra sem auditoria.

---

## 6. Conclusão do Architect

A solução não exige gambiarras contábeis nem quebra a lógica matemática do sistema:
- **Matematicamente**, a variação $\Delta\text{Caixa}$ permanece rigorosa ($(-1\text{k}) - (-7\text{k}) = +6\text{k}$).
- **Estruturalmente**, segregamos o fluxo operacional da absorção de passivo rotativo.
- **Na UX**, eliminamos o ruído operacional substituindo uma tela confusa por uma narrativa de **geração de caixa e desalavancagem patrimonial**.
