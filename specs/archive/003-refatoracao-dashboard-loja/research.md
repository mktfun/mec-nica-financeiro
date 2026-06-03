# Pesquisa: Refatoração do Dashboard de Lojas e Conciliação

## Contexto Atual
O usuário pontuou três principais necessidades na experiência atual do sistema:
1. **Gráfico Modular de Receitas/Despesas:** No dashboard individual de cada loja (`/loja/$lojaId`), o gráfico de "Formas de Pagamento" atualmente exibe apenas crédito/receitas, não se adaptando à navegação modular (Abas: Entradas, Saídas, Físico). Precisamos que ele mude dinamicamente e, no caso de Saídas, agrupe por Categoria de Custo ou Método de Saída.
2. **Saldo Inicial Bancário:** Como as lojas já operavam antes da implantação do sistema, o "saldo em conta" nunca vai bater exatamente com as movimentações novas (pois elas ignoram o saldo remanescente pré-sistema). O usuário solicitou uma forma de imputar o Saldo Inicial de cada loja no banco, permitindo que as contas fechem com a realidade atual.
3. **Fluxos de Navegação (Routing) e Redundância:** A tela de Conciliação e Lojas estão causando confusão. O menu lateral (Slide Sheet - `StoreDetailsSheet`) que abre na listagem de Lojas é indesejado ("uma bosta") e restritivo. O fluxo correto deve ser:
   - Clicar em uma Loja na listagem global redireciona diretamente para a rota cheia `/loja/$lojaId` (onde temos tudo detalhado).
   - Tela de Conciliação será focada 100% no acompanhamento macro e batimento de caixa, sem atuar como um "segundo menu" de lojas. 

## Arquivos Afetados Mapeados
- `src/routes/lojas.tsx`: Precisamos remover `StoreDetailsSheet` e usar `<Link>` ou `navigate()` para levar o usuário à rota de detalhes.
- `src/components/dashboard/StoreDetailsSheet.tsx`: Componente será descontinuado/deletado.
- `src/routes/loja.$lojaId.tsx`:
  - Adicionar mecânica de modularidade no gráfico (Pizza) atrelada ao state `tab` ('in', 'out', 'all').
  - Modal ou campo para definir "Saldo Inicial do Banco" que gera uma transação de sistema "Saldo Inicial".
- `src/routes/conciliacao.tsx`: Garantir que a tela seja macro de conciliação.

## Concorrentes e Benchmark (Mental Model)
- **ContaAzul / Omie:** A tela de visão geral de unidade de negócio (loja) traz o fluxo de caixa com saldo inicial imputável na tela de configurações da conta bancária. O gráfico sempre responde dinamicamente à visão financeira (receitas x despesas).
- **Abordagem de Design:** Eliminar overlays excessivos (side-sheets para contexto rico como financeiro de loja inteira cria fadiga). O redirecionamento de tela com transição suave (Liquid Glass) manterá o usuário focado.
