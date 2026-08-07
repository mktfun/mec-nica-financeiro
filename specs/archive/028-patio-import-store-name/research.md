# Research: IdentificaçÁo do Nome da Loja em Planilhas de OS

## Contexto Atual
O usuário importa planilhas Excel para alimentar os dados de Pátio e ConciliaçÁo Financeira. No entanto, o sistema atual (`useOsImportProcessor.ts`) tenta deduzir o nome da loja a partir do nome do arquivo (ex: `1675_ConferenciaOSxFinanceiro.xls`) ou buscando as palavras chave "LOJA" e "UNIDADE" nas primeiras 10 linhas.

## Problema Identificado
A planilha que o usuário demonstrou possui a seguinte estrutura na linha 3 (índice 2):
`"MPrudge - Por Data da OS: 02/06/2026 e 02/06/2026"`
Aqui, "MPrudge" é o identificador da loja (Ruge), mas como nÁo contém "LOJA" ou "UNIDADE", o regex atual (`/(?:LOJA|UNIDADE)\s+([A-Za-zÀ-ÿ0-9\s]+)/i`) falha. Consequentemente, o sistema exibe apenas partes do nome do arquivo (como `1675`), tornando difícil o mapeamento de lojas na UI.

## SoluçÁo Proposta
Atualizar a funçÁo `processOsFiles` para buscar novos padrões na planilha, especificamente o padrÁo `^(.+?)\s+-\s+Por Data da OS:/i` nas primeiras 10 linhas, ou na linha 3 especificamente.
Adicionar também o recurso de mapeamento automático desenvolvido na importaçÁo de despesas (verificar se as strings normalizadas batem com os nomes das lojas cadastradas no banco) para agilizar o fluxo, já que o usuário importa múltiplas lojas de uma vez.
