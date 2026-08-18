# Walkthrough: Exibição e Soma de Maquininhas Não Entradas por Loja e no Consolidador Geral (Spec 235)

## 🎯 O que foi implementado

Implementamos a exibição e a soma transparente das vendas de maquininhas pendentes de crédito bancário (`NÃO ENTROU` / `A COMPENSAR`) em todos os níveis do sistema:

---

### 1. 🧮 Backend PostgreSQL (RPC `get_daily_reconciliation_summary`)
- O array `stores` agora retorna para cada uma das 10 filiais:
  - `saldo_banco_ofx`: Saldo efetivo da conta bancária nos extratos OFX.
  - `nao_entrou_valor`: Delta de vendas da maquininha não creditadas no OFX do dia.
  - `saldo_banco`: Saldo Consolidado da filial ($\text{Saldo OFX} + \text{Não Entrou}$).
  - `status_compensacao`: `'entrou'`, `'parcial'`, `'nao_entrou'`, `'sem_movimento'`.

---

### 2. 🏛️ Dashboard Principal (`src/routes/conciliacao.index.tsx` - Fechamento por Loja)
- **Cabeçalho da Loja:** Exibe badge em tempo real ao lado do nome da filial:
  - `ENTROU` (Verde esmeralda se o líquido da máquina bateu com o extrato).
  - `NÃO ENTROU (+ R$ ...)` (Âmbar se houver valor retido a compensar).
- **Coluna Saldo:**
  - Valor Principal: Saldo Consolidado da Loja.
  - Linha 1: `OFX: R$ ...` (Saldo do extrato bancário).
  - Linha 2: `+ Maq: + R$ ...` (em destaque âmbar quando houver valor não entrado).

---

### 3. 🔍 Página da Loja (`src/routes/conciliacao.$lojaId.tsx`)
- Card no topo detalhando os 4 indicadores de conciliação de cartões daquela filial:
  - 💳 *Vendas Rede (Líquido e Bruto)*
  - 🏛️ *Creditado no OFX*
  - 🕒 *A Compensar (Não Entrou)*
  - 🏷️ *Status de Compensação*

---

## 🧪 Validação
- Execução no Supabase testada com sucesso para a data real de `2026-08-17`.
- Build de produção (`npm run build`) validado com código 0.
