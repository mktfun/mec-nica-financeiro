# Checklist: Implementação Conciliação Diária (Split-Pane)

## Fase 1: Dados e Lógica
- [ ] Modificar ou criar os hooks de conciliação (`useConciliacaoDiaria`) para buscar transações e OS baseados no dia exato (startOfDay, endOfDay) invés de mensal.
- [ ] Adicionar lógica de verificação de espécie: Para uma data `D` e loja `L`, descobrir se existem transações em dinheiro (payment_method = 'dinheiro') OU OSs em aberto aguardando recebimento de dinheiro.

## Fase 2: Layout Principal
- [ ] Renomear ou refatorar o arquivo `src/routes/conciliacao.tsx` substituindo o input `month` para `date`.
- [ ] Aplicar o grid Split-Pane: Lado esquerdo (Lojas), Lado direito (Detalhes).
- [ ] Construir o Lado Esquerdo: Renderizar a lista de lojas simplificada como uma coluna seletível (Active state).

## Fase 3: Detalhes e Ações (Lado Direito)
- [ ] Integrar a visualização de detalhes (antes da rota /conciliacao-detalhes) diretamente no componente do lado direito.
- [ ] Mostrar as entradas/saídas daquele dia exato para a loja ativa.
- [ ] Exibir o Card "Dinheiro em Caixa - Hoje" condicionalmente, ativado **apenas** se a regra de negócio da Fase 1 retornar `true` para a loja.

## Fase 4: Limpeza
- [ ] Se a rota antiga `/conciliacao-detalhes` ficar obsoleta, apagar o arquivo para manter a organização do código.
- [ ] Validar a experiência mobile (o painel direito pode se tornar uma gaveta flutuante/modal no celular ou rolar pra baixo da lista).
