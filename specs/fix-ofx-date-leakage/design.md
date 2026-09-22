# 📐 SDD Design: Blindagem de Escopo de Data e Eliminação de Vazamento do OFX

## 1. Arquitetura de Fluxo

1. Arquivo OFX é lido com transações multi-dia (dias 14, 15, 16, etc.).
2. Cada transação possui `occurred_at` fiduciário emitido pelo banco.
3. O wizard grava `target_date = occurred_at.split('T')[0]`.
4. Em `StoreExtratoBancarioView.tsx`:
   - `viewScope` inicia como `'dia_alvo'` (Apenas Fechamento do Dia).
   - O extrato exibe estritamente os lançamentos do dia selecionado.
   - Pendências de outros dias NÃO poluem o fechamento nem o painel de divergências.

---

## 2. Critérios de Aceitação Verificáveis

1. No banco de dados, 100% das transações em `ofx_transactions` possuem `target_date = occurred_at::date`.
2. Ao abrir o extrato da filial no dia 17/09, NÃO aparecem transações de 14/09 ou 15/09 no fechamento do dia.
3. As diferenças de saídas e entradas do dia 17 não somam transações de dias passados.
4. `npm run build` compila com 0 erros.
