# Proposal: Restaurar Design Original dos Cards de Lojas e Painel de Resumo do Dia (Spec 241)

## Problema
Nos commits recentes (`497b03f` e `5e68069`), o design visual do painel de conciliação diária (`ResumoDiaPanel.tsx`) e dos cards de fechamento das lojas (`conciliacao.index.tsx`) foi alterado de forma indesejada:
- **ResumoDiaPanel:** Foram substituídas as variáveis do design system (`var(--bg-surface)`, `var(--bg-surface-elevated)`, `var(--border-subtle)`, gradientes elegantes) por classes brutas `zinc-900/zinc-950`, quebrando a harmonia visual da aplicação. A área de consolidação foi reestruturada de forma visualmente confusa.
- **Cards das Lojas (`conciliacao.index.tsx`):** O layout horizontal contínuo clássico (com a barra lateral de status `w-2 h-14`, painel de fundo contínuo `bg-black/25` com 6 métricas alinhadas e botão flutuante Raio-X) foi trocado por um modelo empilhado e poluído de 2 tiers.

O usuário solicitou explicitamente o retorno ao design original de 4-5 commits anteriores (`0a092ce`), mantendo a organização limpa e elegante.

---

## Solução Proposta

Restaurar a estrutura visual e os tokens de design system originais (`0a092ce`), preservando 100% das regras contábeis, correções e integrações da Spec 240:

### 1. `ResumoDiaPanel.tsx`
- Restaurar os containers e gradientes:
  - Header: `bg-gradient-to-r from-[var(--bg-surface)] to-[var(--bg-surface-elevated)]` com bordas `border-[var(--border-subtle)]`.
  - Navegador de data com `<input type="date">` embutido para navegação rápida, mas com a estilização limpa original.
  - 5 Pilares no grid clássico (`grid grid-cols-2 md:grid-cols-5 gap-4 mb-6`) usando `bg-[var(--bg-surface-elevated)]` e bordas sutis.
  - Sub-linhas limpas nos cards (Card 1: `OFX` e `+ Maq`; Card 5: `Juros`, `Devoluções` se `> 0`, `OFX Out`).
  - Painel inferior clássico de 2 colunas:
    - Coluna Esquerda (2/3): **Consolidação do Dia** (Caixa Atual, Caixa Anterior, Fluxo de Caixa, Faturamento Atual, Disponível para Contas).
    - Coluna Direita (1/3): **Balanço do Fechamento & Diferença** com o card de status verde/vermelho translúcido original.
  - Barra inferior de auditoria (`AuditTrailBar`).

### 2. Cards de Lojas (`conciliacao.index.tsx`)
- Restaurar o layout horizontal elegante de cada filial:
  - Lado esquerdo: Barra vertical de status (`w-2 h-14 rounded-full` colorida por conformidade), Nome da Loja, Badges `ENTROU` / `NÃO ENTROU (+ R$ ...)` e ID da loja em fonte mono discreta.
  - Lado direito: Painel contínuo `bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1` com as 6 métricas em grid de 6 colunas (`Saldo Bancos + Cartões`, `Maquininha`, `PIX`, `Na Loja OS`, `Previsto`, `Diferença`).
  - Botão flutuante "Raio-X" no canto superior direito do card (`group-hover:opacity-100`).

---

## Contratos de Dados & Backend
- **NENHUMA alteração de banco de dados ou RPCs.**
- Preservação total de:
  - `devolucoes_rede` (somado em `subtotal_contas` e exibido como sub-linha em Contas).
  - `last_payment_date` (âncora temporal no `patio_os`).
  - RPCs `get_daily_reconciliation_summary` e `get_store_pos_triple_reconciliation`.
  - `MaquininhasDetailModal` com suporte a 2XL e 5º card de devoluções.

---

## Features Existentes Impactadas
- Feature 237/239: Revert visual das modificações cosméticas para o padrão estético original.
- Feature 240: 100% preservada (devoluções e janela temporal).

---

## Risco Principal
- **Risco:** Perder alguma correção de cálculo ao restaurar o JSX.
- **Probabilidade:** Baixa.
- **Impacto:** Reversível.
- **Mitigação:** Preservar todas as variáveis de cálculo (`subtotalContasCalculado`, `devolucoesRedeValor`, `faturamentoTotalComAjustes`, etc.) aplicando o layout JSX original do commit `0a092ce`.
