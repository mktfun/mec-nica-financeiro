# Proposal: 049 - Refinamento da Conciliação e Nova Rota Dedicada

## Contexto e Problema
A página `/conciliacao` está exibindo dados divergentes da expectativa do usuário. Atualmente, os totalizadores de "Extrato Bancário" e "Sistema" estão utilizando saldos absolutos de conta (ou uma lógica de totalização que acumula mais do que o esperado). 
O usuário deseja que a conciliação bata **EXATAMENTE** as movimentações (Entradas/Saídas) ocorridas naquele dia específico:
1. **Apurado Sistema:** Entradas de OS do dia + Saídas (Contas a Pagar importadas) do dia.
2. **Extrato Bancário:** Entradas reais e Saídas reais que caíram no OFX no dia.

Além disso, a tela de detalhes da loja (`/loja/$lojaId`) tornou-se sobrecarregada. As abas de "Todas as Transações", "Apenas Entradas", "Apenas Saídas", "Caixa Físico" e, principalmente, "Conciliação 3-WAY" precisam ser reorganizadas.
O pedido é: 
- Remover a lista de transações bancárias e a aba "Conciliação 3-WAY" da página genérica da loja.
- Criar uma página dedicada (ex: `/conciliacao/$lojaId`) que seja acessada unicamente a partir da grid de conciliações. Essa nova tela focará 100% no Extrato e no Triple Match do dia.

## BDD Scenarios

### Cenário: Exibição Correta do Apurado Diário na Conciliação
- **Given (Dado):** que o usuário acessa `/conciliacao` filtrando pelo dia "09/06/2026"
- **When (Quando):** a página carrega os totais
- **Then (Então):** o "Apurado Sistema" da Loja Dom Pedro deve ser a soma exata de `(Entradas de OS) - (Saídas/Despesas)` com `occurred_at` em 09/06.
- **And:** o "Extrato Bancário" deve ser a soma exata de `(Entradas OFX) - (Saídas OFX)` com `occurred_at` em 09/06.

### Cenário: Navegação para Conciliação Detalhada
- **Given (Dado):** que o usuário está na grid `/conciliacao` no dia 09/06
- **When (Quando):** clica no card da Loja Jabaquara
- **Then (Então):** é redirecionado para `/conciliacao/$lojaId?date=2026-06-09` (nova rota)
- **And:** a nova página exibe diretamente a "Conciliação 3-WAY" e o extrato bancário isolado deste dia, sem informações irrelevantes de gerência da loja.

## Requisitos
- Refatorar os hooks `useDailySystemBalance` e criar/refatorar o totalizador bancário para trazer o DELTA do dia, e não o saldo total (`balance`).
- Criar a nova rota `/conciliacao/$lojaId` importando os componentes que antes estavam misturados em `/loja/$lojaId`.
- Limpar `/loja/$lojaId` para ser apenas o dashboard de gestão da loja, sem a aba 3-WAY.
