# Proposal: Restauração Exata do Visual Original da Conciliação (conciliacao-exact-layout-restoration)

## Problema

- O usuário solicitou explicitamente retornar o visual exatamente para o estilo de 6 a 7 commits atrás (`298246a` / `dbf1ec5`), descartando artifícios pesados como orbes de luz 3D artificiais e gradientes brilhantes.
- O estilo original possuía cartões sóbrios e refinados (`bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]`), com caixas internas escuras `bg-black/20 p-4 rounded-xl border border-white/5` e desfoque suave `backdrop-blur-md`.

## Solução Proposta

1. **Restauração Exata de `ResumoDiaPanel.tsx`:**
   - Remover as luzes ambiente radiais artificiais.
   - Restaurar o contêiner limpo com `backdrop-blur-3xl shadow-sm`, alterando sutilmente de fundo dependendo do estado (`statusSuccess`: `bg-[var(--color-accent-teal)]/5 border-[var(--color-accent-teal)]/20`, `statusDanger`: `bg-[var(--color-accent-danger)]/5 border-[var(--color-accent-danger)]/20`, padrão: `bg-[var(--bg-surface-elevated)] border-[var(--border-subtle)]`).
   - Manter a hierarquia limpa de métricas e barra de progresso sem exageros de sombras 3D.

2. **Restauração Exata da Lista de Lojas (`conciliacao.index.tsx`):**
   - Restaurar a estrutura original do `Card`:
     `Card className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-all hover:scale-[1.01] hover:bg-white/10 hover:border-white/20 cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-white/5 backdrop-blur-md"`
   - Manter a caixa interna das colunas com `bg-black/20 p-4 rounded-xl border border-white/5 flex-1 font-sans tabular-nums text-xs`.
   - Manter as 6 colunas do Módulo 1 (`Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Saldo Total`, `Resultado Final`) perfeitamente alinhadas com tipografia moderna **Inter**.

## Contratos de Dados
Nenhum contrato de banco afetado.

## Features Existentes Impactadas
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `src/routes/conciliacao.index.tsx`

## Risco Principal
Zero risco. É o retorno exato à estrutura visual apreciada pelo usuário.
