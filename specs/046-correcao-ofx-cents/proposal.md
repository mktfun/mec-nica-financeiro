# Proposal - Resiliência no Parser de Saldo OFX

## Objetivo
Criar uma proteção no parser OFX da aplicação para lidar graciosamente com arquivos gerados por sistemas legados ou ERPs defeituosos que exportam a tag `<BALAMT>` em representação de centavos (como um Integer) sem o ponto flutuante obrigatório pela RFC do formato OFX. Também precisaremos limpar novamente o banco do usuário, agora deletando QUALQUER reconciliação cujo saldo seja anomalia gerada por este parser defeituoso.

## Requisitos
1. Modificar a leitura de `<BALAMT>` em `src/lib/parsers/ofxParser.ts`.
2. O parser deve identificar se o número lido contém pontuação (`,` ou `.`).
3. Se o número não contiver pontuação, ele deve ser dividido por 100 de forma a transpor a representação em centavos para a base padrão da moeda (BRL).
4. As `reconciliations` já salvas no banco com esses números gigantes (da tabela de reconciliações com `source = 'ofx'`) devem ser excluídas para que o usuário possa re-importar os dados formatados corretamente.

## BDD Scenarios

### Cenário: Arquivo OFX malformado sem pontuação
- **Given (Dado):** que um OFX contém a tag `<BALAMT>2210992`.
- **When (Quando):** a aplicação roda a rotina de parser `parseOFXFile`.
- **Then (Então):** o valor resultante de `bankBalance` deverá ser retornado como `22109.92`.

### Cenário: Arquivo OFX bem formatado
- **Given (Dado):** que um OFX (de outro banco) contém a tag `<BALAMT>25000.50`.
- **When (Quando):** a aplicação roda a rotina de parser `parseOFXFile`.
- **Then (Então):** o valor resultante de `bankBalance` deverá continuar sendo interpretado corretamente como `25000.50`.
