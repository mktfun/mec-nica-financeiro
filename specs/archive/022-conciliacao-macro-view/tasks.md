# Checklist: Implementação Visão Macro & Slide-over

## Fase 1: Restaurar Dashboard Base
- [ ] Restaurar o grid de 10 lojas na rota `/conciliacao`.
- [ ] Restaurar a barra superior com os Summary Cards mostrando o total consolidado (Faturado, Lojas OK, Divergência Total).
- [ ] O grid de lojas deve exibir o nome, status da conciliação e os valores de "Faturado: R$" e "Caixa Físico: R$".

## Fase 2: Construir o Drawer (Slide-over)
- [ ] Mudar a lógica do "Click na Loja" para não mais abrir um Split-Pane, mas sim abrir um componente `SlideOver` da direita.
- [ ] Criar o componente `StoreDetailDrawer.tsx` (ou mantê-lo no mesmo arquivo) usando Framer Motion para o painel deslizante.
- [ ] Mover o extrato de Transações e a lógia do "Smart Cash Input" (Fechamento de Gaveta) para dentro desse Drawer.
- [ ] Garantir que o formulário de fechar gaveta só apareça no Drawer caso a loja espere receber dinheiro (`expects_cash`).

## Fase 3: Ajustes e UX
- [ ] Adicionar um badge sutil de `!` no card da loja no grid para sinalizar que o usuário PRECISA abrir o Drawer para preencher o caixa daquela loja.
- [ ] Validar mobile: O Grid colapsa para colunas simples, o Drawer em mobile deve ocupar 100% da largura.
