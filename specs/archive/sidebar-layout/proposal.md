# Proposal: Sidebar Layout Adjustment (sidebar-layout)

## Problema
O título "Oficina GPT" está ocupando espaço indesejado na área principal de chat (abaixo do header global) e os botões de configuração e logs desapareceram do menu lateral inferior da tela do Agente IA.

## Solução Proposta
- Remover o header interno "Oficina GPT" da área principal de chat.
- Inserir o título "Oficina GPT" com o ícone no topo do menu lateral (sidebar do histórico), acima do botão de "Nova Conversa", mantendo um espaçamento adequado com o header global.
- Restaurar os botões de "Configurações" e "Logs do Sistema" na base fixa do menu lateral do Agente IA, com o mesmo visual das conversas (hover effects).

## Contratos de Dados
- Não há modificação no banco de dados. Apenas ajustes de UI e layout local em React.

## API / Interface
- O arquivo modificado será exclusivamente `src/routes/agente.tsx`.
- Componentes e dependências adicionais: Inclusão dos ícones `Settings` e `Terminal` do `lucide-react`.

## Features Existentes Impactadas
- Tela do Agente de IA (`agente.tsx`).
- O layout do menu lateral mudará para acomodar os novos elementos no fluxo flexível, usando `mt-auto` para fixar os botões de rodapé na base.

## Risco Principal
- O principal risco é que, ao empurrar botões para o fundo com `mt-auto`, o container de histórico precise rolar corretamente e não invada os botões. Isso será mitigado usando `flex-1 overflow-y-auto` na lista de histórico, permitindo rolagem apenas na área intermediária.
