# Proposal: Restauração Estética Total e Animações da Conciliação (conciliacao-visual-restoration)

## Problema

- Na iteração anterior de unificação de dados, a estrutura do componente `ResumoDiaPanel.tsx` e a lista de lojas em `conciliacao.index.tsx` perderam a "vida visual", os efeitos de brilho ambiente (*radial ambient glows*), efeitos glassmorphism com blur, transições de hover com escala (`hover:scale-[1.015]`) e as micro-animações escalonadas da biblioteca `framer-motion`.
- O usuário pediu para restaurar a estética vibrante, os fundos com iluminação ambiente e o dinamismo visual dos cards mantendo os dados consolidados do Módulo 1.

## Solução Proposta

1. **Restauração do Card Hero Principal (`ResumoDiaPanel.tsx`):**
   - Adicionar orbes de iluminação ambiente no fundo com desfoque 3D (`blur-3xl` com opacidade adaptativa).
   - Aplicar `backdrop-blur-3xl`, bordas translúcidas de contraste alto `border-white/10` e sombras profundas `shadow-2xl`.
   - Adicionar micro-animações via `framer-motion` (`initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}`) para os pilares e métricas de fechamento.
   - Preservar a barra de progresso da meta mensal animada com gradiente vibrante.

2. **Restauração e Efeitos de Brilho nos Cards de Loja (`conciliacao.index.tsx`):**
   - Envolver cada card de loja em `motion.div` escalonado (`transition={{ delay: index * 0.05 }}`).
   - Aplicar efeito de elevação dinâmica ao passar o mouse (`hover:scale-[1.015] hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-all duration-300`).
   - Manter as 6 colunas do Módulo 1 (`Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Saldo Total`, `Resultado Final`) de forma ultra-elegante, com destaque para a pílula de status e badge com brilho suave.

3. **Garantia de Tipografia Elegante e Coerência Visual:**
   - Manter a fonte **Inter** com numerais tabulares `tabular-nums` e **DM Sans** nos títulos.

## Contratos de Dados
Nenhum contrato de banco afetado.

## Features Existentes Impactadas
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `src/routes/conciliacao.index.tsx`

## Risco Principal
Garantir alta performance de renderização durante as animações de entrada sem causar lag.
*Mitigação:* Usar aceleração de GPU com `transform-gpu` do Framer Motion e classes otimizadas do Tailwind CSS.
