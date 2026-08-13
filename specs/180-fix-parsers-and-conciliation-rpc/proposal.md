# Proposal: Fix Import Parsers & RPC (180)

## Problema
O sistema apresenta bugs silenciosos e visíveis na ingestão e conciliação de dados:
1. **Erro 42703 (RPC)**: A rotina `calculate_daily_conciliation` falha porque tenta filtrar por uma coluna `description` inexistente na tabela `ofx_transactions`. O correto seria ler o `counterpart_name` ou `fitid`.
2. **Colisão de Hashes (Perda de Dados)**: A rotina de hashes determinísticos sobrescreve transações idênticas que acontecem no mesmo dia (ex: 2 PIXs de mesmo valor sem horário).
3. **Conversão de Centavos Errada (Falso R$ 1,50)**: Uma heurística perigosa tenta consertar valores que vêm sem vírgula, dividindo por 100 se for maior que 100, transformando valores como R$ 150 em R$ 1,50.
4. **Formato US (1000.50) no Marco Zero**: A limpeza de números remove o ponto de planilhas exportadas em padrão americano, inflacionando o valor.
5. **Falsos-Positivos no Parser de Excel**: Termos aleatórios ("Caixa de Ferramenta") são rotulados como indicadores contábeis ("CAIXA ATUAL") devido à busca muito permissiva (`.includes`).

## Solução Proposta
Vamos implementar uma "vacina" nas 5 frentes problemáticas, alterando puramente lógicas de Parsing (Frontend) e RPC (Backend), sem necessidade de novas tabelas ou migrações destrutivas.

## Contratos de Dados
- Nenhuma alteração estrutural nas tabelas. O Schema de `ofx_transactions` permanece intacto, pois o problema era a RPC tentando acessar uma coluna fantasma (`description`).

## API / Interface
- **Backend (RPC `calculate_daily_conciliation`)**: Mudar a cláusula `WHERE description ILIKE '%REDE%'` para `WHERE counterpart_name ILIKE '%REDE%' OR fitid ILIKE '%REDE%'`.
- **Frontend (`ofxParser.ts`)**: Implementar controle de Ocorrências (Nonce) usando um `Map` local na hora do parsing para sufixar (`_1`, `_2`) hashes repetidos e assim preservar transações idênticas e ao mesmo tempo manter a deduplicação caso o mesmo arquivo seja re-upado.
- **Frontend (`marcoZeroParser.ts`)**: Remover limpeza cega de ponto/vírgula. Usar regex refinada para descobrir se o formato é US (`\.\d{2}$`) e tratá-lo corretamente. Trocar as varreduras de `includes` por validações estritas (`===` ou checagem de prefixo restrito).
- **Frontend (`ofxParser.ts`)**: Remover o hack de `/ 100` dependente de magnitude `> 100`.

## Features Existentes Impactadas
- Importador Central (Wizard de Upload)
- Painel Diário de Conciliação Financeira (que passará a carregar sem o erro 500)
- Leitura de Histórico de Caixas Passados do Marco Zero

## Risco Principal
- **Probabilidade**: Baixa
- **Impacto**: Parcialmente reversível (afeta dados em cache do painel no dia).
- **Mitigação**: O tratamento de "Nonce" para o hash de OFX deve ser indexado *apenas no bloco do parseamento corrente*, de modo que se o arquivo for enviado hoje, e re-enviado amanhã, o mesmo arquivo gerará a exata mesma ordem de Hashes, resultando em um dedupe perfeito, sem duplicações fantasmas.
