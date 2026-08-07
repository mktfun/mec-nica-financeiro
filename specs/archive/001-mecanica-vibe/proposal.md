# Proposta de Produto: Sistema Autônomo de ConciliaçÁo - Mecânica Popular

## Contexto e Objetivos
A rede Mecânica Popular (10 unidades) sofre com ineficiências na conciliaçÁo financeira diária. Atualmente, a analista financeira gasta cerca de 1h30m diariamente extraindo relatórios do sistema "Oficina Inteligente", cruzando planilhas e identificando falhas de lançamentos (divergências de pagamentos, OS finalizadas sem recebimento, etc). 

**Objetivo Principal:** Reduzir o tempo de conciliaçÁo diário de 1h30 para apenas 5 minutos, oferecendo um sistema de auditoria autônoma aliado a um painel web mobile-first de alto impacto visual (glassmorphism/premium) voltado para a analista financeira e o dono (Daniel). O painel entregará a visÁo consolidada de fluxo de caixa e alertas urgentes para aprovaçÁo com apenas um toque.

## Requisitos e User Stories
- **US01:** Como analista financeiro, quero que os dados das 10 lojas do sistema "Oficina Inteligente" sejam extraídos e calculados de forma 100% autônoma às 07h00.
- **US02:** Como dono (Daniel), quero acessar um painel no meu celular antes das 08h30 com a consolidaçÁo financeira de todas as unidades.
- **US03:** Como dono (Daniel), quero inserir em menos de 5 minutos o valor em espécie (físico) do caixa diário de cada loja e visualizar a conciliaçÁo imediata.
- **US04:** Como gestor/analista, quero receber alertas visuais destacados sobre divergências (pagamento parcial, duplicidade, juros errados, etc) e resolvê-los interativamente.

## O que JÁ EXISTE e será REUTILIZADO
Foi analisado o repositório `mktfun/mec-nica-financeiro`. O projeto atual possui a infraestrutura básica inicial que servirá como fundaçÁo:
- **Infraestrutura Front-End:** React 18, Vite, TypeScript, TanStack Router.
- **EstilizaçÁo/Componentes:** TailwindCSS, components baseados em `shadcn/ui` na pasta `src/components/ui`.
- **Estrutura de Rotas:** 
  - `index.tsx` (Dashboard principal)
  - `alertas.tsx` (Página dedicada de alertas)
  - `conciliacao.tsx`
  - `patio.tsx`, `recebiveis.tsx`, `lojas.tsx`
- **Mock de Dados Atual:** O repositório já possui uma abstraçÁo de dados (hooks como `useStores`, `useAlerts` em `src/lib/mock/hooks.ts`). Isso facilita a transiçÁo para integraçÁo com backend/Supabase.

## O que precisa ser CRIADO / REFATORADO
- **Redesign Premium "Antigravity Vibe":** 
  - Refatorar `index.tsx` e demais rotas usando Glassmorphism moderno (backgrounds com blurs sutis, gradientes dinâmicos).
  - Adicionar microinterações com `framer-motion` (cards que expandem suavemente, swipe-to-resolve nos alertas de divergências).
- **IntegraçÁo Real (Supabase):** 
  - Substituir os mocks de `src/lib/mock/` por integrações diretas ao Supabase via RPCs/Edge Functions.
- **Bot de ExtraçÁo (Backend):** 
  - Uma infraestrutura Python/Node.js para efetuar o scraping autônomo (via Puppeteer/Playwright ou API) no sistema *Oficina Inteligente* diário às 07h00.
- **UX Otimizada para o Daniel:**
  - Facilitar e gamificar o input diário de caixa de balcÁo (em espécie).

## Critérios de Aceite
1. O painel web deve funcionar perfeitamente em telas móveis e desktop, apresentando design de alto nível (premium UI).
2. O sistema deve permitir a entrada de caixa e confirmaçÁo em <= 5 minutos por parte da liderança.
3. Alertas de divergências devem ser categóricos (OS sem pgto, pgto s/ OS, divergência de juros) e autoexplicativos.
