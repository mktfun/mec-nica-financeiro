# Design: Justificativa com Controle de Faturamento e Redesign do Modal de Vincular OS (225)

## 1. Modal `OrphanCategorizationModal.tsx`
- Adicionar switch/seleção:
  ```typescript
  const [impactsRevenue, setImpactsRevenue] = useState(true);
  ```
- Opções visuais:
  - Card 1: 💰 **Receita da Loja (Soma no Faturamento)** $\rightarrow$ Venda sem OS, sucata, prestação de serviço avulsa.
  - Card 2: 🏦 **Movimentação / Ajuste (NÃO soma no faturamento)** $\rightarrow$ Rendimento bancário, Marco Zero, transferência entre contas, aporte.
- Persistência em `transactions` e `ofx_transactions`:
  - `manual_category`: Categoria informada.
  - `manual_justification`: Texto detalhado.
  - `impacts_revenue`: Boolean (`true` ou `false`).

## 2. Hook `useJustifiedTransactions.ts`
- No cálculo do total de justificativas que somam no faturamento:
  ```typescript
  const total = justified.filter(t => t.impacts_revenue !== false).reduce((acc, t) => acc + t.amount, 0);
  ```

## 3. Redesign de `ManualMatchOsModal.tsx`
- Layout em Cards / Lista rica:
  - OS Match Exato recebe destaque visual com fundo esmeralda e botão primário em evidência.
  - Exibe: `OS #1808`, `Cliente`, `Placa`, `Pagamento Declarado (PIX: R$ 500,00)`, `Diferença (R$ 0,00)`.
  - Agrupamento único por `os_number`.
  - Busca em tempo real por placa, cliente, valor ou número de OS.

## 4. Script de Reset de Testes
- Script Node.js para limpar `manual_category`, `manual_justification`, `impacts_revenue` e `matched_os_number` das transações do dia 14/08/2026.
