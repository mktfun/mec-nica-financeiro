# Proposal: 003 Premium Mock Preview para Investidores

## 1. Visão Geral
Criação de uma interface de "Preview VIP" 100% mockada, projetada especificamente para ser apresentada a investidores e sócios. O objetivo primário é o **impacto visual e fluidez**, ignorando a base de código do sistema atual e focando em uma experiência de demonstração perfeita (nível Stripe, Apple, XP Investimentos).

## 2. Requisitos e User Stories
- **[REQ-01]** A interface deve possuir estética executiva de altíssimo nível, utilizando paleta dark/glassmorphism refinada (Stripe/Apple-like), evitando o excesso de "clean" mas sem ser exagerada.
- **[REQ-02]** As animações devem ser a 60fps, contínuas, suaves e profissionais (usando `framer-motion` para transições de layout, hovers em cards e carregamento escalonado).
- **[REQ-03]** A página deve exibir o funcionamento ideal do sistema: Bot coletando dados, análise acontecendo, e o resultado exibido em um dashboard financeiro glorioso.
- **[REQ-04]** Todos os dados exibidos devem ser estáticos (mocks complexos e realistas), sem depender de backend real, focando na velocidade de carregamento da demonstração.

## 3. O que já existe e será reutilizado
- **TUDO SERÁ DESCARTADO**: O sistema atual será sobreposto em 100%. Vamos fazer o projeto inteiramente do zero, substituindo todas as rotas e componentes antigos pela nova interface VIP.
- **Mantido**: Apenas as configurações raiz (Vite, Tailwind config, etc) para não quebrar o repositório, mas o conteúdo `src/` será totalmente reescrito.

## 4. O que precisa ser CRIADO
- Um layout inteiramente novo focado em demonstração substituindo o `App.tsx` e o sistema de rotas atual.
- Componentes altamente detalhados:
  - **Hero/Header Executivo**: Com relógio em tempo real, status do "Motor de Conciliação" com pulso de "Online".
  - **Cards de KPI com Micro-interações**: Entradas, Saídas, Divergências, e Saldo, com contadores numéricos animados.
  - **Tabela de Lojas com Skeleton Loaders e Status**: Representando o estado de aprovação ou erro crítico de cada loja.
  - **Painel de Ações Rápidas (Investidor)**: Para o sócio interagir (ex: "Aprovar Divergência").
- Banco de dados de Mock hiper-realista.

## 5. Critérios de Aceite
- O visual remete imediatamente à qualidade Stripe/XP Investimentos.
- Nenhuma dependência com o backend real (Supabase offline não deve quebrar nada).
- Animações presentes em pelo menos 3 interações principais (Hover em cards, Entrada da Tabela, Abertura de Dialog).
