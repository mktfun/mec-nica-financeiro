# Proposal: Delegação do Matcher e Dashboard V2 para o Backend (Spec 099)

## Contexto
O processo de reconciliação hoje cruza a Maquininha (Rede), Extrato (OFX) e Pátio (OS PIX) através do hook local `useReconciliationViews` no React. Ele cria "grupos", testa distâncias temporais e soma diferenças (usando `.reduce`, `.find`, `.filter`). Isso sobrecarrega a máquina do cliente, quebra silenciosamente com milhares de transações e viola a regra de Single Source of Truth no banco.

Além disso, a matemática mestre do Dashboard não reflete as exatas lógicas do dia a dia (Dinheiro MP, A Receber, Fluxo de Caixa Diário) com os pareamentos processados.

## Objetivos (Backend-First)
A pedido do usuário, esta especificação desenha a delegação destas tarefas pesadas e lógicas complexas puramente para RPCs no Supabase, permitindo que o frontend seja ignorante das matemáticas subjacentes e focado apenas em exibir o JSON processado.

## Matemática Inviolável (Especificada)
1. **Saldo:** soma de todos os saldos no banco.
2. **Dinheiro MP:** valor manual injetado nos snapshots (Dinheiro em caixa).
3. **A receber:** boletos + descontos manuais.
4. **Na loja:** soma total das OSs não pagas (Em Aberto no pátio).
5. **Caixa atual:** Soma dos itens acima menos negativo do banco (Itaú).
6. **Fluxo CX:** Caixa atual subtraído do Caixa do dia de conciliação anterior.
7. **Fatura:** (Faturamento atual - Faturamento anterior) + Outros faturamentos manuais.
8. **Valor disp contas:** Fatura + Fluxo CX.
9. **Valor contas:** Juros da máquina + contas pagas (saídas dos OFX).
10. **Diferença:** Valor disponível - Valor de contas pagas.

## Funções PL/pgSQL Planejadas

### 1. `get_dashboard_metrics` (Refatoração Matemática)
A RPC `get_dashboard_metrics` que criamos anteriormente será adaptada para corresponder 100% à fórmula explícita descrita na Matemática Inviolável, e será a única fonte do `useDashboardV2.ts`.

### 2. `auto_match_transactions` (O Pareador Silencioso)
Esta RPC será responsável por buscar transações de um `target_date`, comparar os fluxos de `in` do OFX com os da `rede` e OS de PIX. Quando valores casarem (com margem de erro permitida), a RPC atualizará a tabela `transactions` e/ou `patio_os` para preencher uma coluna de pareamento (ex: `matched_ofx_id`) ou atualizar o status (`PAREADO`).

## Impacto
O React vai apenas listar as linhas da tabela `transactions` que já estão com status = 'PAREADO'. A CPU do cliente não precisará processar comparações de string e data-hora no milissegundo.
