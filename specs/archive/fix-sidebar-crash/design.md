# Design: Correção de Crash na Tela de Agente e Limpeza do Sidebar (fix-sidebar-crash)

## Arquitetura Técnica
A correção atua 100% no client-side (React), ajustando as referências JSX no render cycle.
Componente `Sidebar.tsx` → Remove opções inválidas no array de roteamento estático.
Componente `agente.tsx` → Adiciona o importe do Lucide-React para o ícone `Workflow`.

## Interfaces TypeScript
N/A

## Componentes / Hooks / Funções
- `src/components/layout/Sidebar.tsx`: Remoção de `navItems` não globais.
- `src/routes/agente.tsx`: Atualização da linha 8 de importações.

## Fluxo de UI
1. O usuário acessa a página raiz ou navega pelo sistema e não verá os botões extras (Logs de Agente) no menu lateral geral.
2. O usuário clica em "Agente IA" e a tela carrega corretamente sem o React Error Boundary acusar falha fatal de "Workflow is not defined".

## Infra / Deploy
N/A

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Load page `/agente`] → [Component Mount] → [Success (No crash)]
- Cenário 2: [Verify Global Sidebar] → [Menu Lateral] → [Não exibe as opções 'Log do Agente de IA' nem 'Log do Motor de Conciliação']
