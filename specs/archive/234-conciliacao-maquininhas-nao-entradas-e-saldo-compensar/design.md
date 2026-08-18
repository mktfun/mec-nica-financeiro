# Design Técnico: Conciliação Tripla de Maquininhas (Rede ⇄ OFX ⇄ OS) & Saldo a Compensar (Spec 234)

## 🏗️ Arquitetura de Dados & Motor de Conciliação Tripla

### 1. Algoritmo de Cruzamento Triplo (Por Loja e Por Data):

```
┌──────────────────────────────────────────────────────────┐
│ 1. RELATÓRIO REDE (Vendas da Maquininha)                 │
│    - Soma dos valores líquidos (Visa, Master, Elo, etc.) │
│    - Ex: Dom Pedro = R$ 10.448,11                        │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ 2. EXTRATO BANCÁRIO OFX (Créditos Recebidos)             │
│    - Soma de REDE MAST + REDE VISA + REDE ELO no dia     │
│    - Ex: Dom Pedro = R$ 1.907,22 + R$ 1.902,36 = 3.809,58│
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│ 3. LISTAGEM DE ORDENS DE SERVIÇO (OSs)                   │
│    - Pagamentos registrados em Cartão (Débito/Crédito)   │
│    - Cruza OSs com o Delta Não Entrado (R$ 6.638,53)     │
│    - Identifica quais OSs estão retidas na adquirente!   │
└──────────────────────────────────────────────────────────┘
```

---

## 🧮 Fórmulas Matemáticas no PostgreSQL (`get_daily_reconciliation_summary`)

```sql
-- 1. Total Saldo Bancário dos Extratos OFX
v_total_saldo_ofx := SUM(bank_total) das 10 lojas em p_date;

-- 2. Maquininhas Não Entradas (Cartões a Compensar até p_date)
-- Soma de todas as vendas de maquininha com status 'nao_entrou'
v_cartoes_a_compensar := SUM(net_amount) FROM pos_transactions 
    WHERE target_date <= p_date 
      AND settlement_status = 'nao_entrou';

-- 3. Saldo Consolidado do Pilar 1
v_total_saldo_banco := v_total_saldo_ofx + v_cartoes_a_compensar;

-- 4. Caixa Atual Consolidado (5 Pilares)
v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;

-- 5. Fluxo de Caixa Diário
v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

-- 6. Faturamento do Período (Expurgando Duplicações de Liquidação)
v_faturamento_periodo := v_total_faturamento_ofx - v_liquidacao_cartoes_anteriores;

-- 7. Disponível para Contas & Diferença
v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
v_subtotal_contas := v_juros_rede + v_contas_manual;
v_diferenca_final := ABS(v_valor_disp_contas) - v_subtotal_contas;
```

---

## 🎨 Interface & Experiência do Usuário (UI/UX)

### Card "Saldo Bancos + Cartões a Compensar" (`ResumoDiaPanel.tsx`)
Inspirado na transparência do Card de Contas a Pagar:

```
┌────────────────────────────────────────────────────────┐
│ 🏛️ SALDO BANCOS + CARTÕES               R$ 199.480,23 │
│                                                        │
│ 🏦 Extrato Bancos (OFX):                 R$ 195.756,61 │
│ 💳 Maquininhas Não Entradas (Compensar): + R$ 3.723,62 │
│                                                        │
│ 🔍 [Ver Detalhamento por Loja]                         │
└────────────────────────────────────────────────────────┘
```

### Modal / Drawer "Detalhamento de Maquininhas"
Tabela com as 10 lojas:
- **Loja:** Dom Pedro, Jabaquara, Jorge Beretta, etc.
- **Vendas Rede (Líquido):** R$ 10.448,11
- **Creditado no OFX:** R$ 8.721,06
- **Status / Diferença:** `+ R$ 1.727,05 (NÃO ENTROU)` / `ENTROU`
- **Ações:** Botão para alternar status manual se necessário.
