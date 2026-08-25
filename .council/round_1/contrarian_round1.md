# Round 1 — Contrarian

## Onde Essa Ideia Vai Quebrar na Vida Real
A premissa de "fazer tudo automático sem intervenção manual" ignora a bagunça operacional real do dia a dia das 10 oficinas.

## Falhas Fatais Identificadas:
1. **O Cliente que Paga por Outro Meio:** O cliente combina boleto em 2x, a OS é importada como boleto, mas no dia seguinte o cliente vai na loja e paga por PIX ou Cartão de Débito! Se o sistema criou o boleto no banco, o recebível vai ficar eternamente pendente ("fantasma") e o PIX vai sobrar no OFX como órfão.
2. **Pagamento em Conta de Sócio ou Outra Filial:** Transferências bancárias de clientes frequentemente caem na conta de outra filial ou na conta de um sócio (intercompany). Se a busca for estrita por `store_id`, o match automático falhará 100% das vezes.
3. **Variação de Nomes no OFX:** No boleto liquidado, o extrato bancário muitas vezes traz apenas `LIQ COBRANCA 049281` sem o nome do cliente ou número da OS. Casar apenas por valor numérico pode causar match errado se houver 3 boletos do mesmo valor no mesmo dia.
4. **Re-importação Destrutiva:** Se o usuário reimportar o relatório de OS no meio da tarde, como o sistema garante que não vai duplicar os boletos gerados de manhã?
