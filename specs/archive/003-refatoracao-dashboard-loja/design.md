# Design System & Data Modeling: Refatoração Dashboard Loja

## UI / UX (Tendências 2026 - Liquid Glass & Maximalismo Tátil)
- **Remoção de Modais Pesados:** O painel lateral sobrecarregava a UI com scroll duplo. Substituímos por uma página dedicada que ocupa toda a área de conteúdo (`/loja/$lojaId`).
- **Gráfico Dinâmico:** A PieChart deve suportar microinterações ao sofrer `hover` (Tooltip enriquecido). Suas cores alternarão entre a paleta "Verde/Teal" (Entradas) e "Vermelho/Laranja" (Saídas) para transmitir fisicalidade aos dados.
- **Botão "Ajustar Saldo":** Estará posicionado de forma discreta mas tátil ao lado do Card "Saldo da Loja" principal, usando um ícone sutil de lápis ou engrenagem, suportando um visual glassmórfico em seu modal.

## Banco de Dados / Supabase MCP
Não será necessária a criação de nenhuma nova tabela ou coluna no Supabase. Utilizaremos a flexibilidade de Event-Sourcing (Ledger) existente na tabela `transactions`.

### Tabela `transactions`
O Saldo Inicial será injetado com o seguinte formato:
```json
{
  "store_id": "uuid-da-loja",
  "type": "in", // ou "out" se o saldo atual for negativo
  "amount": 5000.00,
  "title": "Ajuste de Saldo Inicial",
  "subtitle": "Saldo Inicial", // Será lido como categoria especial
  "occurred_at": "timestamp atual",
  "icon_type": "bank"
}
```
Isso dispensa qualquer Migration ou alteração no schema cache, garantindo estabilidade imediata.

### Lógica do Gráfico Modular
No front-end (`src/routes/loja.$lojaId.tsx`):
- `tab === 'in'`: Usa a mesma mecânica existente `parsePaymentMethods(raw)`.
- `tab === 'out'`: Mapeia as transações de `type === 'out'` aglomerando pelo atributo `subtitle` (que guarda a Categoria no importador de planilhas).
- `tab === 'all'`: Pode agrupar em "Receitas Totais" vs "Despesas Totais".
