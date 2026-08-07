# Proposal - Resiliência no Parser de Saldo OFX

## Objetivo
Criar uma proteçÁo no parser OFX da aplicaçÁo para lidar graciosamente com arquivos gerados por sistemas legados ou ERPs defeituosos que exportam a tag `<BALAMT>` em representaçÁo de centavos (como um Integer) sem o ponto flutuante obrigatório pela RFC do formato OFX. Também precisaremos limpar novamente o banco do usuário, agora deletando QUALQUER reconciliaçÁo cujo saldo seja anomalia gerada por este parser defeituoso.

## Requisitos
1. Modificar a leitura de `<BALAMT>` em `src/lib/parsers/ofxParser.ts`.
2. O parser deve identificar se o número lido contém pontuaçÁo (`,` ou `.`).
3. Se o número nÁo contiver pontuaçÁo, ele deve ser dividido por 100 de forma a transpor a representaçÁo em centavos para a base padrÁo da moeda (BRL).
4. As `reconciliations` já salvas no banco com esses números gigantes (da tabela de reconciliações com `source = 'ofx'`) devem ser excluídas para que o usuário possa re-importar os dados formatados corretamente.

## BDD Scenarios

### Cenário: Arquivo OFX malformado sem pontuaçÁo
- **Given (Dado):** que um OFX contém a tag `<BALAMT>2210992`.
- **When (Quando):** a aplicaçÁo roda a rotina de parser `parseOFXFile`.
- **Then (EntÁo):** o valor resultante de `bankBalance` deverá ser retornado como `22109.92`.

### Cenário: Arquivo OFX bem formatado
- **Given (Dado):** que um OFX (de outro banco) contém a tag `<BALAMT>25000.50`.
- **When (Quando):** a aplicaçÁo roda a rotina de parser `parseOFXFile`.
- **Then (EntÁo):** o valor resultante de `bankBalance` deverá continuar sendo interpretado corretamente como `25000.50`.
