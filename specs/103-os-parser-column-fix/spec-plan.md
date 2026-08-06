# Plano de Implementação: Correção Robusta de Colunas (OS e REDE)

## Alterações Planejadas
1. **\src/hooks/useOsImportProcessor.ts\**: 
   - Atualizar a heurística da linha ~101 para incluir a checagem de \colMap.totalValue === undefined\ de forma que a primeira coluna capturada seja mantida (ex: \R$ Total da OS\).
   - Atualizar a heurística da linha ~103 para capturar as palavras-chave \pagto\ e \pgto\.
   - Assegurar que se o nome da coluna tem \pagto\, ela mapeie apenas para \paidValue\ e não \	otalValue\.

2. **\src/lib/parsers/redeParser.ts\**: 
   - Substituir os índices estáticos de colunas (0, 2, 3, 9) por uma busca dinâmica (\indIndex\) no cabeçalho do arquivo (normalmente a linha 1 do Excel da REDE), buscando por palavras-chave como \meio de pagamento\, \alor bruto\, \alor líquido\, \estabelecimento\. Isso garante resiliência a mudanças estruturais da REDE.
