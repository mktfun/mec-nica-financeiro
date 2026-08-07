# Design: Limpeza e ReorganizaçÁo do Dashboard da Loja (016)

## Componentes Afetados

### `src/routes/loja.$lojaId.tsx`
1. **Remover "Último Fechamento"** — Todo o bloco entre as linhas ~234–276 que mostra "Apurado Sistema R$ 0,00", "Liquidado Conta R$ 0,00", a mensagem inútil do ℹ️ e a "Divergência Encontrada".
2. **Formatar formas de pagamento** — No bloco do extrato (linhas ~470–475), substituir a exibiçÁo crua de `tx.payment_method` por badges formatadas. Usar a funçÁo `parsePaymentMethods()` que já existe para transformar `"Credito: 8550.00;"` em badges individuais com ícone + valor formatado.
3. **Reorganizar grid** — Com a remoçÁo do "Último Fechamento", o gráfico de formas de pagamento pode ficar mais organizado (subir no espaço livre).

## Mapa de Dependências
- `parsePaymentMethods()` já existe na página (linha 83).
- `Badge` e `getIconForMethod()` já existem.
- Nenhum componente novo necessário.
