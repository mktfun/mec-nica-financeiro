# Spec Plan — Spec 428: Redesign e Alinhamento Visual do Modal de Gestão de Dinheiro em Cofre

## Tasks Sequenciais

- [x] Task 1: Refatorar casca estrutural do Modal e toolbar superior <!-- id: 1 -->
  - Atualizar `size="2xl"` no `Modal` de `CashVaultCompositionModal.tsx`.
  - Remover margens negativas `-mx-6 -mt-6 mb-6` e cabeçalho duplicado.
  - Alinhar toolbar com subtítulo descritivo e botão "+ Registrar Saída em Dinheiro" nos tokens do `DESIGN.md`.

- [x] Task 2: Harmonizar cards de métricas consolidadas e abas de navegação <!-- id: 2 -->
  - Refatorar grid de 4 cards com superfícies `bg-card/70 border border-border/50` e tipografia `tabular-nums`.
  - Padronizar tabs de navegação sem cores roxas/índigo de AI Slop.

- [x] Task 3: Refatorar tabelas de Frações e Contas a Pagar com larguras fixas e whitespace-nowrap <!-- id: 3 -->
  - Adicionar container com `overflow-x-auto min-w-[760px]` e scroll vertical elegante.
  - Aplicar `whitespace-nowrap` e larguras mínimas nas colunas de Loja, OS, Data, Valor, Status e Ação.
  - Corrigir botões "Voltar p/ Cofre" e "Marcar Depositado" para nunca quebrarem em múltiplas linhas.
  - Refatorar tabela da segunda aba (Sugestões de Saídas / Contas sem OFX) com o mesmo padrão.

- [x] Task 4: Executar Terminal Gate & Build Check <!-- id: 4 -->
  - Executar `npm run build` garantindo zero erros de compilação e tipagem TypeScript.
