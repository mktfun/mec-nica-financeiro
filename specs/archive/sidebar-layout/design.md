# Design: Sidebar Layout Adjustment (sidebar-layout)

## Arquitetura Técnica
A mudança foca estritamente na árvore de componentes de renderização do `src/routes/agente.tsx`. O componente React principal da página reorganizará os elementos DOM, sem impactos no fluxo de rede ou chamadas de API.
`AppShell` -> `div (agente wrapper)` -> `Sidebar Div` & `Main Chat Div`

## Interfaces TypeScript
Nenhuma nova interface TypeScript será criada, usaremos os elementos JSX existentes com classes Tailwind.

## Componentes / Hooks / Funções
**Modificação no `src/routes/agente.tsx`:**
1. Importar `Settings, Terminal` de `lucide-react`.
2. Remover o bloco `<div className="px-6 py-4 flex justify-between items-center z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">` da área principal.
3. Inserir um novo bloco acima do botão de "Nova Conversa" com a formatação solicitada.
4. Adicionar um container `div` flex-col com espaçamento após a listagem do histórico, fixo no bottom via `mt-auto`.

## Fluxo de UI
1. **Header do Menu Lateral:** Ao abrir a tela do Agente, o usuário verá no menu esquerdo o logo e título "Oficina GPT" bem no topo, deixando a área principal do chat mais limpa.
2. **Rodapé do Menu:** No canto inferior esquerdo, de forma persistente e com efeito de hover nativo, os botões "Configurações" e "Logs do Sistema" estarão disponíveis para acesso rápido. Restrições visuais serão estritamente baseadas nas variáveis CSS do sistema (ex: `var(--bg-surface-elevated)` e `var(--text-secondary)`).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Renderização Inicial] → [O menu lateral carrega] → [Título Oficina GPT aparece no topo do sidebar, botões fixos no rodapé e área principal mais limpa].
- Cenário 2: [Muitas conversas no histórico] → [Lista de conversas expande] → [O rodapé fica fixo, a lista de conversas adquire scroll sem sobrepor os botões de configuração no bottom].
