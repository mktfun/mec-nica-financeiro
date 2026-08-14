# Proposal: Corrigir Matemática da Conciliação e Restaurar Histórico de OS (148-fix-conciliation-diff)

## Problema
completamente irreal (ex: -R$ 120k) e que o valor "Na Loja OS" (Restante) está zerado para esses dias, arruinando a auditoria histórica. 
O diagnóstico revelou dois problemas sistêmicos na RPC `calculate_daily_conciliation`:
1. **OS Zeradas**: A alteração recente forçou a leitura do "restante" das OSs diretamente da tabela atual (`patio_os`). Como a tabela reflete apenas o "hoje", as OSs de dias anteriores que já foram pagas constam como R$ 0, apagando o lastro histórico.
2. **Diferença Bizarra**: O cálculo de `Previsto OFX` por loja tentava somar os extratos filtrando por `store_id = loja`, mas OFX é global (`store_id IS NULL`). Isso fez o Previsto OFX por loja ser R$ 0. A matemática da diferença ficou `0 - (Maquininha + PIX)`, gerando valores negativos estratosféricos.

## Solução Proposta
1. **Restaurar Snapshot Histórico**: Modificar a RPC `calculate_daily_conciliation` para buscar o `na_loja_os` salvo na tabela de snapshots diários ou `reconciliations` quando a data for no passado. Calcular em tempo real (via tabela `patio_os`) apenas se for uma data nova sem snapshot.
2. **Atribuir OFX à Loja Correta via Match**: O `Previsto OFX` por loja será calculado mapeando as transações bancárias através do ID de amarração recém construído no *match-audit-and-fix*. Se um OFX estiver com `matched_os_number = 'BATCH_DP'`, seu valor será contado no "Previsto OFX" da loja DP, resolvendo o buraco do `store_id` nulo.

## Contratos de Dados
- **Tabelas Envolvidas**: `ofx_transactions`, `patio_os`, `reconciliations` (para histórico).
- Mutações zero. Apenas alteração na lógica de leitura/soma (Select) dentro da RPC.

## API / Interface
- `calculate_daily_conciliation(p_date date)`: Terá sua inteligência matemática refinada para usar vínculos indiretos (matches) em vez de vínculos diretos de coluna.

## Features Existentes Impactadas
- **Dashboard de Conciliação Diária**: A matemática voltará ao normal (fechando o zero) e os dias passados recuperarão o valor exato que estava na OS naquele dia.

## Risco Principal
- **Probabilidade**: Média
- **Impacto**: Parcialmente Reversível
- **Mitigação**: O maior risco é atribuir um OFX global a mais de uma loja caso a string de match esteja errada. Utilizaremos substrings precisas (`'BATCH_' || loja`) e garantiremos que o restante vá para a conta GLOBAL, sem duplicar valores na tela matriz.
