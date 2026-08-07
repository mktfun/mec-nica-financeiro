# Spec Plan: Sidebar Layout Adjustment (sidebar-layout)

## Tasks

- [ ] [FRONTEND] Importar ícones `Settings` e `Terminal` do `lucide-react` no arquivo `src/routes/agente.tsx`.
- [ ] [FRONTEND] Remover a seção `Header Limpo` (que continha "Oficina GPT" e o logo `Bot`) do container `Main Chat Area` em `src/routes/agente.tsx`.
- [ ] [FRONTEND] Adicionar a seção de Header "Oficina GPT" no topo da `Sidebar Histórico`, acima do botão "Nova Conversa", adicionando paddings adequados para distanciar do header global.
- [ ] [FRONTEND] Adicionar um novo bloco de rodapé com `mt-auto` no fundo da `Sidebar Histórico` para comportar os botões "Configurações" e "Logs do Sistema".
- [ ] [TEST] Verificar cenário 1: Sidebar renderiza corretamente com o título no topo e botões fixos no final.
- [ ] [TEST] Verificar cenário 2 (edge case): Adicionar rolagem ao histórico redimensionando a janela e verificar se os botões no fundo não são ocultados pelo overflow.
