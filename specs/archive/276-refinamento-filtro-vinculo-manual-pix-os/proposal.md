# Proposal: Refinamento Estrito do Modal de Vínculo Manual de PIX com OS (Spec 276)

## Problema
Ao clicar em "Vincular OS" em um lançamento bancário de PIX na tela de extrato (`StoreExtratoBancarioView` / `ManualMatchOsModal`), o usuário relatou 3 problemas graves:
1. **OSs Pagas em Cartão ou Dinheiro aparecendo como Match:**
   * O fallback do modal (`valA = a.pix_transfer_value > 0 ? a.pix_transfer_value : (a.paid_value || a.total_value)`) fazia com que OSs pagas 100% em Cartão de Crédito/Débito ou Dinheiro fossem sugeridas como "Match Exato" para depósitos de PIX.
2. **OSs Já Vinculadas Continuando na Lista:**
   * OSs que já tiveram um depósito de PIX vinculado em `ofx_transactions` continuavam aparecendo como opções de vínculo para novos PIXs, gerando confusão e duplicidade.
3. **Falta de Isolamento por Loja e Data no Componente:**
   * Em `StoreExtratoBancarioView.tsx`, a prop `targetDate={date}` não estava sendo passada para o `ManualMatchOsModal`, permitindo queries sem filtro temporal adequado.

## Solução Proposta
1. **Filtro Estrito por Loja (`store_id`):**
   * O hook `useAvailableStoreOs` e o modal `ManualMatchOsModal` devem garantir isolamento absoluto por filial.
2. **Exclusão de OSs Já Vinculadas:**
   * O hook deve cruzar com `ofx_transactions` da mesma loja e excluir qualquer `os_number` que já esteja vinculado (`matched_os_number IS NOT NULL`).
3. **Filtro de Método de Pagamento PIX:**
   * Apenas listar OSs que possuem pagamento em PIX (`pix_transfer_value > 0` ou `payment_method ILIKE '%PIX%'` / `%TRANSF%`) ou OSs em aberto aguardando quitação.
   * Eliminar o fallback indevido que usava valores pagos em Cartão/Dinheiro como se fossem PIX.
4. **Harmonização de Props em `StoreExtratoBancarioView.tsx`:**
   * Passar explicitamente `targetDate={date}` e `storeId={storeId}` para `ManualMatchOsModal`.

## Contratos de Dados
- **`StoreOsCandidate` (`useManualMatch.ts`):**
  - `id`: `string`
  - `os_number`: `string`
  - `client_name`: `string`
  - `plate`: `string`
  - `total_value`: `number`
  - `paid_value`: `number`
  - `pix_transfer_value`: `number`
  - `payment_method`: `string`
  - `status`: `string`
  - `date`: `string`
  - `is_already_matched`: `boolean`

## Risco Principal
- Impedir que o usuário vincule uma OS que foi paga em PIX mas cujo ERP registrou com forma genérica. Mitigado mantendo a busca manual por texto (`search`) capaz de encontrar qualquer OS em aberto da loja.
