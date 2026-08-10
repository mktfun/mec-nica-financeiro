# Proposal: Updgrade de Deduplicação Global nas Importações (import-dedup-upgrade)

## Problema
Atualmente, o sistema confia excessivamente nos IDs externos enviados pelas fontes de dados (ex: o campo `<FITID>` do banco Itaú/OFX). Quando o banco gera IDs duplicados para transações distintas ou modifica o ID de transações antigas, o sistema perde o controle: transações legítimas são bloqueadas ou transações duplicadas são inseridas.
Nas importações de Maquininha (Rede) e planilhas de OS/Pátio, o cenário é ainda mais crítico: o Supabase realiza um `insert` direto em `pos_transactions` sem verificar unicidade. Se um usuário re-importar a planilha de maquininha de ontem, todos os pagamentos serão registrados duas vezes no sistema.

## Solução Proposta
Implementar uma blindagem baseada em "Chave Composta" (Hash Determinístico Interno) unificada para *todos* os canais de importação (OFX, Maquininha, Despesas).
O hash será composto pelas tríades universais de conciliação: `Data da Transação + Valor + Descrição (Memo)`. Se os três forem idênticos no mesmo dia e na mesma loja, o sistema tratará como duplicata absoluta.
- **No OFX:** O sistema deixará de usar o `<FITID>` bancário para deduplicação global, injetando nosso próprio Hash no lugar.
- **Na Maquininha (POS):** O banco de dados receberá uma nova coluna `dedup_hash` com uma trava `UNIQUE (store_id, dedup_hash)`, substituindo o `insert` frágil por um `upsert` inquebrável.

## Contratos de Dados
- **Tabela `pos_transactions`**:
  - `ALTER TABLE pos_transactions ADD COLUMN dedup_hash TEXT;`
  - `CREATE UNIQUE INDEX pos_transactions_store_hash_idx ON pos_transactions(store_id, dedup_hash);`
- **Mutações**:
  - `useBulkInsertTransactions` passa a usar `.upsert(posTxs, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true })` para a maquininha.
  - OFX permanece usando `.upsert` em `ofx_transactions` (já que tem trava no `fitid`), porém o frontend passará OBRIGATORIAMENTE nosso Hash Determinístico para a coluna `fitid`.

## API / Interface
- `parseOFXFile`: Modificado para forçar a geração de `hash_${date}_${amount}_${memo}` independente de existir a tag `<FITID>`.
- `parseRede` / `parseMaquininha`: Modificado para incluir a propriedade `dedup_hash` computada.
- O hash ignorará espaços, caracteres especiais e capitalização no memo para prevenir falsos-negativos.

## Features Existentes Impactadas
- **OFX Import & POS Import**: Afeta `CentralImportWizard` e `WizardImportacao`.
- A mudança pode causar uma "re-importação" única inicial (já que o hash será novo, ele pode não dar match com os FITIDs bancários antigos), mas o sistema estabilizará instantaneamente.

## Risco Principal
**Probabilidade:** Média
**Impacto:** Parcialmente Reversível
- Ao mudar a lógica do `fitid` para um hash nosso, se o usuário tentar importar um OFX de 6 meses atrás (que já estava no banco com FITIDs antigos), o sistema vai interpretar como transações novas, duplicando o histórico antigo.
**Mitigação:** Como precaução, instruiremos o frontend a verificar se já existe saldo batido naquele mês, ou então recomendaremos que a "virada" de chave ocorra para os meses novos (não importar meses antigos sem deletar a massa antes). Na prática diária D+1, isso não causará dor.
