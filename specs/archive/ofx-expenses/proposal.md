# Proposal: ofx-expenses

## Problema
As despesas (saídas/débitos) do OFX não estão sendo importadas corretamente na Conciliação.
O usuário instruiu explicitamente:
1. "Bater o fitid pra não duplicar contas e descartar duplicadas" -> A deduplicação por FITID deve ser mantida estritamente.
2. "Todos os débitos tem que salvar igual os créditos, só que negativo/despesa, pra se comportar como entradas e contar certinho" -> As despesas que vêm sem FITID nativo do banco estão sendo descartadas pelo sistema atual. Precisamos de um FITID determinístico para elas, e garantir que a tipagem/lógica as inclua no caixa.

## Solução Proposta
1. **Deduplicação Segura (FITID Deterministíco):** No `parseOFXFile` (ou `CentralImportWizard`), se o banco omitir o `<FITID>` de uma despesa, geraremos um hash determinístico forte baseado em `data + valor + título` (ex: `hash_20260807_-15.50_TARIFA`). Assim, a despesa **nunca** será descartada por falta de ID, e se o usuário importar a mesma planilha 10 vezes, a despesa **nunca** será duplicada.
2. **Correção do Pipeline:** Ajustar `useBulkInsertTransactions` para não descartar silenciosamente as despesas e garantir que elas entrem na tabela `ofx_transactions` de forma idêntica às entradas (créditos).
3. **Mapeamento de Loja:** Garantir que o `store_id` associado ao alias do banco seja herdado pelas despesas (débitos), assim elas contarão "certinho por loja" no fechamento daquela conta bancária, ao invés de ficarem órfãs no sistema global.

## Contratos de Dados
- Tabela `ofx_transactions`: Nenhuma mudança estrutural. O `fitid` continuará sendo a chave única de deduplicação (`ON CONFLICT (store_id, fitid) DO NOTHING`).

## API / Interface
- O Dashboard passará a mostrar o valor exato no bloco "OFX: R$ XX,XX" (Despesas) na Conciliação Diária para cada dia importado, e isso abaterá o saldo final corretamente.

## Risco Principal
- Risco: O hash determinístico gerar colisão para duas tarifas idênticas cobradas no mesmo dia.
- Mitigação: O hash incluirá todos os metadados possíveis. Taxas exatamente idênticas no mesmo milissegundo pelo banco são raras e, se ocorrerem, a própria interface bancária as agrupa.
