# Proposal: Corrigir Matemática da Conciliação e Restaurar Histórico de OS (148-fix-conciliation-diff)

## Problema
O usuário relatou que a tela de conciliação para os dias 04 a 10 de Agosto apresenta diferenças absurdas (ex: -R$ 120k) e o "OS Restante" (Na Loja OS) sumiu de todo o histórico.
O diagnóstico aponta três problemas distintos:
1. **Duplicação de Maquininha (O causador dos -120k)**: Como o usuário re-importou os arquivos do passado, as transações antigas de Maquininha (que não tinham o novo `dedup_hash`) ficaram lá, e as novas entraram junto. Isso inflou o total de Maquininha para as nuvens, gerando a diferença negativa gigantesca contra o OFX (que não duplicou).
2. **Histórico de OS Apagado**: A última atualização forçou o "Na Loja OS" a ser calculado em tempo real. Como a OS do dia 04 já foi paga hoje, o restante dela é 0. O lastro histórico de dias passados foi ignorado.
3. **Escopo do OFX (Match)**: O usuário confirmou que o OFX **é segmentado por loja** (ele sobe 10 arquivos, um pra cada). A minha engine recém-criada assumiu que o OFX era global e removeu o filtro de `store_id` durante o pareamento, o que pode causar falsos positivos entre lojas.

## Solução Proposta
1. **Limpeza de Duplicatas**: Fazer uma query de expurgo (`DELETE FROM pos_transactions WHERE dedup_hash IS NULL`) para limpar a massa de dados antiga corrompida. Como o usuário reimportou tudo, as transações válidas (com hash) já estão no banco e a matemática de Maquininha vai desinflar imediatamente.
2. **Restaurar Snapshot de OS**: Modificar a RPC `calculate_daily_conciliation` para ler novamente da tabela `reconciliations` o valor `na_loja_os` para dias no passado, travando o saldo.
3. **Corrigir Auto-Match**: Reverter o filtro da RPC `auto_match_transactions` para forçar `store_id = ofx.store_id`, respeitando o fato de que cada OFX pertence a uma loja.

## Contratos de Dados
- **Tabelas Envolvidas**: `pos_transactions` (expurgo), `patio_os`, `reconciliations` (para histórico).
- Mutações: Remoção de lixo na `pos_transactions` e alteração em RPCs.

## API / Interface
- `calculate_daily_conciliation(p_date date)`
- `auto_match_transactions(p_date date)`

## Features Existentes Impactadas
- **Dashboard de Conciliação Diária**: A matemática voltará ao normal (fechando o zero) e os dias passados recuperarão o valor exato que estava na OS naquele dia.

## Risco Principal
- **Probabilidade**: Baixa
- **Impacto**: Reversível
- **Mitigação**: Deletar `pos_transactions WHERE dedup_hash IS NULL` é seguro porque qualquer transação nova já possui o hash gerado durante a importação.
