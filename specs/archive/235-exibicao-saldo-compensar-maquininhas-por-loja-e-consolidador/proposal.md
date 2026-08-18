# Proposta: Exibição Transparente do Saldo Consolidado (OFX + Maquininha Não Entrou) por Loja e Global

## 1. Contexto & Diagnóstico

Nas operações diárias das 10 filiais, os pagamentos passados na maquininha (Rede) têm prazos de compensação distintos (Débito cai em D+0/D+1, Crédito cai em D+1/D+2). Quando o operador importa os relatórios de vendas da maquininha e os extratos OFX:
1. Vendas registradas na maquininha que ainda **não caíram no extrato bancário (OFX)** devem **somar** no saldo total patrimonial do dia (pois o dinheiro já é da empresa).
2. O usuário precisa ver com total clareza e transparência:
   - Quanto é o saldo efetivo das contas bancárias (`OFX`).
   - Quanto é o saldo de vendas de cartão que **`NÃO ENTROU` (A Compensar)**.
   - A soma exata (`Saldo Consolidado = OFX + Maquininha Não Entrou`) tanto no **Resumo Consolidado do Dia** quanto no **Card Individual de cada uma das 10 Lojas** e na **Página da Loja**.

---

## 2. Escopo da Solução

### 🧮 2.1 Backend (Supabase PostgreSQL RPCs)
- **RPC `get_daily_reconciliation_summary`**:
  - Enriquecer o array `stores` retornado pelo PostgreSQL para que cada loja inclua:
    - `saldo_banco_ofx`: Saldo bancário puro do extrato OFX.
    - `nao_entrou_valor`: Saldo de vendas líquidas da maquininha que não caíram no OFX do dia.
    - `saldo_banco_total`: `saldo_banco_ofx + nao_entrou_valor`.
    - `status_compensacao`: `'entrou'`, `'parcial'`, `'nao_entrou'`, `'sem_movimento'`.

### 🏛️ 2.2 Dashboard Principal (`src/routes/conciliacao.index.tsx` - Fechamento por Loja)
- No Card de cada loja:
  - O campo **Saldo Banco** passa a exibir o **Saldo Consolidado** (`saldo_banco_total`).
  - Sub-linhas informativas:
    - `OFX: R$ ...`
    - `+ Maq: + R$ ... (Não Entrou)` em destaque âmbar quando houver pendência.
  - Badge de status de compensação na loja:
    - `ENTROU` (Verde esmeralda se o líquido da máquina bateu com os créditos OFX).
    - `NÃO ENTROU: + R$ ...` (Âmbar se houver vendas retidas a compensar).

### 🔍 2.3 Página Individual da Loja (`src/routes/conciliacao.$lojaId.tsx`)
- Header com banner informativo de conciliação de cartões:
  - Vendas Rede (Líquido)
  - Creditado no Extrato
  - Saldo A Compensar (`NÃO ENTROU`)
  - Status da filial no dia.

---

## 3. Critérios de Aceite

1. ✅ 100% dos cálculos executados no PostgreSQL via RPCs, sem regras de agregação no frontend.
2. ✅ Toda loja com vendas na Rede não creditadas no OFX tem o valor somado no seu saldo e sinalizado como `NÃO ENTROU`.
3. ✅ O card de cada loja em `conciliacao.index.tsx` exibe a decomposição visual clara (`Saldo Consolidado`, `OFX`, `+ Maq Não Entrou`).
4. ✅ No dia seguinte, quando o crédito cai no extrato bancário, o status muda automaticamente para `ENTROU` sem duplicar faturamento.
