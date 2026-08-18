# Proposta: Conciliação Tripla de Maquininhas (Rede [Visa+Master] ⇄ OFX [REDE MAST/VISA] ⇄ OSs) & Saldo a Compensar (Spec 234)

## 📌 Contexto & Diagnóstico com Dados Reais da Pasta `17-08`

Ao analisar detalhadamente a pasta real de importação de **17/08** (`C:\Users\admin\Desktop\conciliacao\17-08`) e a planilha de referência da empresa (`CONCILIAÇÃO 1408.xlsx`), mapeamos exatamente como o cruzamento triplo deve funcionar:

### 1. No Extrato Bancário OFX:
As entradas de maquininha entram desmembradas por bandeira/modalidade com seus respectivos códigos:
- `REDE MAST AT...` (Mastercard Crédito/Débito)
- `REDE VISA AT...` (Visa Crédito/Débito)
- `REDE ELO AT...`, `REDE AMEX AT...`, `REDE VISA DB...`, `REDE MAST DB...`
- **Regra:** O sistema agrupa e soma **todas as linhas de maquininha do OFX** daquela unidade no dia (`Total Maquininhas OFX = REDE MAST + REDE VISA + ...`).

### 2. No Relatório de Vendas da Maquininha (Rede):
- O sistema soma todos os **valores líquidos** de vendas por loja (`Total Líquido Maquininha`).
- **Diferença Primária:** `Delta = Total Líquido Maquininha - Total Maquininhas OFX`.

### 3. Cruzamento com as Ordens de Serviço (OSs):
- Na listagem de OSs da loja (ex: `DP 1708.xls`), cada OS finalizada/paga possui a forma de pagamento registrada (ex: `Debito: 385.00`, `Credito: 1385.00`, `Credito: 5054.52`, `PIX: 1454.64`).
- O sistema cruza os pagamentos de cartão das OSs com as vendas da maquininha e com o crédito do OFX:
  - Se o valor do cartão da OS já creditou no OFX ➔ **`ENTROU`**.
  - Se o valor foi passado na maquininha mas ainda não caiu no OFX ➔ **`NÃO ENTROU (A Compensar)`**, com a identificação exata da OS a que se refere!
  - Se houver diferença na maquininha sem OS correspondente ➔ **Alerta de divergência de OS não lançada**.

---

## 🎯 Objetivos da Spec 234

1. **Soma de Todas as Bandeiras do OFX:**
   - Detecção automática de `REDE MAST`, `REDE VISA`, `REDE ELO`, `REDE AMEX` no extrato bancário de cada loja.
2. **Conciliação Tripla Automatizada (Rede ⇄ OFX ⇄ OS):**
   - Comparação: `Vendas Líquidas Rede` vs `OFX Creditado` vs `OSs pagas em cartão`.
   - Identificação do que **NÃO ENTROU** com indicação de quais OSs compõem o saldo retido na maquininha.
3. **Contabilização no Saldo do Pilar 1 (Saldo Bancos + Cartões a Compensar):**
   - O saldo global do caixa soma o saldo bancário mais o total de maquininhas que ainda **NÃO ENTRARAM**.
4. **Card Visual Subordinado (Padrão Contas a Pagar) em `ResumoDiaPanel.tsx`:**
   - Exibe no Card 1:
     - `🏦 Saldo Bancos (OFX): R$ ...`
     - `💳 Maquininhas Não Entradas (A Compensar): + R$ ...`
     - `💰 Saldo Consolidado: R$ ...`
5. **Liquidação D+N sem Dupla Contagem de Faturamento:**
   - Quando o valor cair no extrato OFX no dia seguinte, o sistema vincula ao lote anterior e muda para **`ENTROU`**, evitando duplicar o saldo e o faturamento.

---

## 📐 Estrutura Proposta

### 1. Banco de Dados (Supabase PostgreSQL):
- Atualização em `pos_transactions` / `pos_settlements` para rastrear `status` (`nao_entrou` vs `entrou`) e `settled_at_date`.
- Atualização na RPC `get_daily_reconciliation_summary(p_date)` para incorporar `cartoes_a_compensar` na fórmula de `v_total_saldo_banco` e `v_caixa_atual`.

### 2. Frontend & UX:
- Card do Pilar 1 em `ResumoDiaPanel.tsx` com visual subordinado espelhado no padrão do card de Contas.
- Drawer / Modal "Conferência de Maquininhas e Compensação" com detalhamento por loja e botões rápidos de validação.
- Auditoria discreta via Whisper Dots quando houver valores pendentes de compensação.
