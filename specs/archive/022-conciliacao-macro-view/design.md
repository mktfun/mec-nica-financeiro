# Design Document: VisÁo Macro com Slide-over

## Top Bar & Resumo
- **Date Picker**: Mantido o input `date` (Diário).
- **Summary Cards**:
  1. *Total Faturado Hoje* (Soma dos faturamentos das lojas)
  2. *Status de ValidaçÁo* (X de 10 lojas validadas)
  3. *Divergência Total* (Soma das divergências)
  4. *Carros no Pátio* (Acesso rápido ao pátio geral)

## O Grid de Lojas (VisÁo Consolidada)
- RenderizaçÁo de `Card` para cada loja usando Grid CSS (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`).
- Cada card deve expor:
  - Nome da loja
  - Badge de status (`✓ OK`, `⚠ Divergência`, `• Pendente`)
  - Bloco cinza translúcido mostrando "Faturado: R$ X" e "Caixa Físico: R$ Y".
  - Se a loja necessitar de input de dinheiro físico (Smart Cash) e nÁo estiver preenchido, um indicador sutil pulsante ou ícone de gaveta para chamar a atençÁo.

## O Drawer Lateral (Slide-over)
- Um componente `Framer Motion` que desliza da direita (`x: '100%'` para `x: 0`) quando uma loja é clicada.
- Terá um fundo `bg-[var(--bg-canvas)]` com overlay escuro no resto da tela.
- **Conteúdo Interno do Drawer**:
  - Header: Nome da Loja, Data e botÁo fechar (X).
  - Corpo: Extrato de movimentações da loja (Entradas/Saídas) com tipografia limpa.
  - Footer Fixo/Bottom: O formulário de Fechamento de Caixa (Smart Cash) apenas se a lógica de espécie for verdadeira, igual à Spec 021.
