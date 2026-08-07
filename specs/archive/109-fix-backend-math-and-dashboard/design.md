# Design: Correção Lógica e Cronológica do Backend (109-fix-backend-math-and-dashboard)

## Correção das Fórmulas (RPC `calculate_daily_conciliation`)
Para cada Loja (`store_record`):
1. **Faturamento Banco (`faturamento_banco`)**:
   - `SELECT bank_total FROM reconciliations WHERE store_id = X AND date = Y`. (Reflete o Saldo do Itaú do fechamento daquele dia).
2. **Previsto OFX (`previsto_ofx`)**:
   - `SELECT SUM(amount) FROM transactions WHERE type = 'in' AND source = 'ofx'`. (O real dinheiro que entrou via relatório bancário).
3. **Maquininha (`maquininha`)**:
   - `SELECT SUM(gross_amount) FROM transactions WHERE type = 'in' AND source = 'rede'`. (Mantém-se igual, está correto).
4. **PIX (`pix`)**:
   - Em vez de ler as transactions, extrair o dado de onde o usuário injeta. Hoje, o PIX e a Maquininha são mesclados na tabela antiga. Precisaremos resgatar via histórico ou da interface de `transactions` OFX onde a descrição bate corretamente, ou puxar o `pix_os_expected` da UI antiga. Como o backend agora manda, leremos temporariamente os valores inseridos via `import_logs` ou deduziremos. *Nota: Para consertar rápido o bug reclamado, leremos de onde o sistema legado lia.*
5. **Diferença (`diferenca`)**:
   - `Previsto OFX - (PIX + Maquininha)`. Se `Previsto OFX` bater com as vendas declaradas, `Diferença = 0`.

## Correção do Auto-Select de Datas
No hook `useBackendDashboard.ts` e `useBackendConciliacao.ts`:
```typescript
if (!date) {
  // Faz um fetch rápido no Supabase import_logs para achar a última data com movimento
  const { data } = await supabase.from('import_logs').select('target_date').order('target_date', { ascending: false }).limit(1);
  date = data?.[0]?.target_date || new Date().toISOString().split('T')[0];
}
```

## Cenários de Verificação
- **Cenário 1: Dashboard Vazio ao Abrir**
  - O usuário abre `/`. A data vem vazia. O hook busca `04/08/2026` (último log). O dashboard carrega perfeitamente a visão do dia 04.
- **Cenário 2: Faturamento Banco vs Previsto**
  - O Faturam Banco no painel passa a exibir o Saldo Itaú consolidado.
  - O Previsto exibe o faturamento líquido OFX.
  - O PIX deixa de ficar zerado, batendo com os recebimentos reais.
