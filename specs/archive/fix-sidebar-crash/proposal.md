# Proposal: CorreçÁo de Crash na Tela de Agente e Limpeza do Sidebar (fix-sidebar-crash)

## Problema
A tela `/agente` (Central IAS) está crashando (ReferenceError: Workflow is not defined) porque o ícone `Workflow` foi adicionado ao componente, mas nÁo foi importado no topo do arquivo. Além disso, as rotas `/logs/agente` e `/logs/motor` foram expostas incorretamente no `Sidebar.tsx` (Menu Global do Sistema), o que quebra a hierarquia da UI — elas deveriam ficar exclusivamente no menu lateral secundário da própria página do Agente IA.

## SoluçÁo Proposta
1. Adicionar o import do ícone `Workflow` no arquivo `src/routes/agente.tsx`.
2. Remover os objetos `{ id: "/logs/agente", ... }` e `{ id: "/logs/motor", ... }` do array `navItems` no arquivo `src/components/layout/Sidebar.tsx`.

## Contratos de Dados
- Nenhuma alteraçÁo no Supabase. O banco de dados e os contratos atuais se mantêm intactos.

## API / Interface
- `src/routes/agente.tsx`: Componente de roteamento de React.
- `src/components/layout/Sidebar.tsx`: NavegaçÁo lateral global.

## Features Existentes Impactadas
- Tela de Agente de IA e logs (listados em `spec/global/features.md`). 

## Risco Principal
NÁo há riscos significativos. A ausência de import quebra a renderizaçÁo (erro fatal do React), e a presença de itens extras no Sidebar apenas polui a tela. O escopo é 100% isolado na UI e resolve diretamente o crash reportado.
