# Design: Audit and Fix Conciliation Matches (match-audit-and-fix)

## Arquitetura Técnica
A engine de auto-match (`auto_match_transactions`) será redesenhada para executar em 3 estágios estritos de pareamento para o dia `p_date`.
A execução ocorre inteiramente dentro da trigger via RPC chamada pelo componente `CentralImportWizard.tsx` (ou pelo agendamento diário).

1. **Pipeline PIX (OFX x OS)**:
   - Input: `ofx_transactions` (type='in', payment_method='pix' ou title/counterpart indicando PIX).
   - Busca: `patio_os` (onde data = p_date) cujo `pix_transfer_value` (ou `paid_value` se método PIX) == `ofx_transactions.amount`.
   - Update: Amarra OS ↔ OFX.

2. **Pipeline Maquininha Líquido (POS x OFX)**:
   - Input: Agrupamento de `pos_transactions.net_amount` sumarizado por `store_id` (O arquivo da Rede/Maquininha é segmentado por loja).
   - Busca: `ofx_transactions` (type='in', source='rede') onde `amount` == `SUM(net_amount)` da loja X.
   - Update: Amarra o ID do OFX a todas as `pos_transactions` daquele grupo da loja.

3. **Pipeline Maquininha Bruto (POS x OS)**:
   - Input: Cada `pos_transactions.gross_amount` individual de uma loja.
   - Busca: `patio_os` da mesma loja (`store_id` bate) cujo valor pago via maquininha bata com o `gross_amount`.
   - Update: Amarra OS ↔ POS.

## Componentes / Hooks / Funções
- **`supabase/migrations/xxxx_fix_match_engine.sql`**
  - Responsabilidade: Substituir a function `auto_match_transactions(date)` incorporando a tolerância para transações órfãs e contornando o gap de `store_id IS NULL` do OFX Global.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (PIX)**: Entra R$ 500 PIX no OFX global. Existe uma OS na loja Dom Pedro de R$ 500 no PIX.
  - -> Match 1:1 amarrando a OS ao OFX (independente de `store_id = NULL` no OFX).
- **Cenário 2 (POS vs OS)**: Venda na maquininha da loja DP por R$ 300 bruto. Existe OS na loja DP por R$ 300 paga no débito.
  - -> Match 1:1 amarrando a OS ao POS.
- **Cenário 3 (POS vs OFX)**: Maquininha da loja DP teve 3 vendas líquidas: R$ 90, R$ 100, R$ 10. (Soma R$ 200). Entra um crédito OFX de "REDE" de R$ 200 global.
  - -> Match N:1 amarrando os 3 POS ao OFX R$ 200.
