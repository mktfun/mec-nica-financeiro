# 🧠 Memória Modular: Importação OFX & Adquirentes

## [2026-07-24] — Feature ID: fix-pix-parsing-and-extended-window

**Contexto:** Correção do bug de extração do PIX (5 vendas declaradas = R$ 0,00) e expansão da janela de busca da conciliação para D-7 (permitindo casar depósitos de dias anteriores como o PIX do Ronildo do dia 17/07 com a conciliação do dia 23/07).

**Regra aprendida:**
- **Parser de Forma de Pagamento:** Strings em planilhas Excel da OS podem não conter dois-pontos (`:`). O regex deve capturar formatos como `"PIX 680,00"`, `"Pix R$680"`, `"TRANSFERÊNCIA PIX"` usando o padrão universal `/(PIX|TRANSF|DEP|DINHEIRO|DÉBITO|DEBITO|CRÉDITO|CREDITO|CARTAO|CARTÃO)\s*[:\-\s]?\s*(?:R\$\s*)?([\d\.,]+)?/gi`.
- **Coluna do Banco de Dados:** A tabela `patio_os` armazena o valor do PIX na coluna física `pix_transfer_value`. Sempre leia `os.pix_transfer_value || os.parsed_pix_transfer` ao calcular o total das vendas de PIX no frontend.
- **Janela de Busca da Conciliação:** A busca de transações OFX e vendas do Pátio deve considerar um intervalo de busca estendido de no mínimo **D-0 a D-7** (8 dias). Vendas e PIXs ocorridos no final de semana ou em dias anteriores podem cair no extrato bancário dias depois.

**Risco identificado:** Restringir a busca de transações a D-2 oculta depósitos bancários legítimos de dias passados que pertencem a vendas anteriores pendentes de conciliação.

**Não fazer:** Nunca exigir dois-pontos (`:`) como delimitador único para extração de valores monetários em strings de pagamento nem restringir a busca de extrato OFX a janelas menores que D-7.

## [2026-07-24] — Feature ID: conciliacao-fk-definitive-fix

**Contexto:** Correção definitiva do erro de Foreign Key ao confirmar a importação de extratos OFX (`conciliation_matches_ofx_transaction_id_fkey`).

**Regra aprendida:**
- Ao fazer `upsert` na tabela `transactions` com conflito por `(store_id, fitid)`, o Postgres atualiza a linha existente e **mantém a chave primária antiga (`id`)** do banco de dados.
- O Javascript gera um `crypto.randomUUID()` em memória que NUNCA é salvo no banco de dados quando ocorre conflito no `upsert`.
- Para vincular transações OFX em `conciliation_matches`, você DEVE consultar a tabela `transactions` via `.in('fitid', fitids)` **após** o salvamento para remapear e resgatar o `id` primário real do Postgres.
- Sempre faça uma checagem de existência física (`.in('id', checkIds)`) antes de disparar o `insert` em `conciliation_matches`. Se o ID não existir fisicamente no banco de dados, atribua `null` no campo `ofx_transaction_id` ou `rede_transaction_id`.

**Risco identificado:** Tentar usar IDs gerados no Javascript em memória para tabelas filhas com Foreign Key antes de consultar quais IDs o Postgres manteve no `upsert`.

**Não fazer:** Nunca confiar em UUIDs gerados no frontend para tabelas com relacionamentos FK após operações de `upsert` com `onConflict`.
