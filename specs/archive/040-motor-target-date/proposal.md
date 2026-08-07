# Spec 040 - Motor Target Date (Lote de Fechamento Universal)

## Requisitos e Contexto
O usuário relatou que, ao limpar o banco e importar tudo perfeitamente para o fechamento de hoje, o "Extrato Bancário" nas lojas ficou zerado (R$ 0,00), e a divergência ficou caótica.
A raiz do problema foi identificada de forma absoluta: 
Na Spec 039 consertamos as OS do Pátio, mas o Extrato (OFX), Maquininha e Despesas continuam salvando transações com a **data real de ocorrência** (`occurred_at`). 
A trigger do banco de dados que agrupa o Extrato Bancário pega essa data e espalha o dinheiro nos dias do calendário passado. Quando a tela de ConciliaçÁo abre no "Dia de Hoje", ela procura os valores do Extrato de Hoje, mas eles foram alocados nos dias anteriores (as datas reais em que as compras do OFX aconteceram).

## BDD Scenarios

### Cenário: PreservaçÁo Histórica vs Lote de Trabalho
- **Given (Dado):** O usuário possui um Extrato OFX do mês passado (01/05 a 30/05).
- **When (Quando):** Ele importa o arquivo hoje (11/06) e seleciona "Data de Competência: 11/06".
- **Then (EntÁo):** 
  - As transações no banco salvam `occurred_at = 01/05`, preservando a verdade contábil.
  - Mas as transações recebem uma etiqueta `target_date = 11/06`.
  - A trigger do banco consolida os valores no Fechamento do dia 11/06.
  - A tela de ConciliaçÁo mostra todo o saldo no dia 11/06.

### Cenário: Bug do Apurado Sistema Global
- **Given (Dado):** O Saldo do Sistema consolidado das lojas indica lucros variados (ex: Dom Pedro = R$ 24k).
- **When (Quando):** A tela exibe o "Apurado Sistema" Global.
- **Then (EntÁo):** O sistema nÁo deve exibir R$ 0,00, mas sim a soma de todos os saldos de todas as lojas computados pela DRE diária.
