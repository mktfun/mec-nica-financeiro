# Proposal: Refatoração da Importação e Novo Extrato Bancário (009)

## Contexto e Problemas Identificados

Com base na sua explicação, nas imagens e na análise profunda que fiz da planilha `1543_ConferenciaOSxFinanceiro.xls`, identifiquei as seguintes lacunas no nosso sistema atual:

1. **Importação Limitada a 1 Dia**: O sistema estava pedindo para você escolher uma data alvo (ex: 28/05/2026) e ignorava todas as outras OSs da planilha que não foram finalizadas exatamente naquele dia. Por isso você importava a planilha inteira e só aparecia 1 OS (R$ 8.550) — era a única finalizada no dia 28/05. 
2. **Separação de Recebíveis**: Precisamos mapear corretamente as formas de pagamento para os recebíveis, definindo prazos claros para quando o dinheiro "cai na conta".
3. **Visão de Extrato (Histórico)**: Você quer ver o histórico não apenas como uma lista de planilhas importadas, mas como um **Extrato Bancário** real: entradas (pagamentos das OSs), saídas (despesas manuais), saldo consolidado, e filtros por período (Data Início até Data Fim) e por loja.

---

## Requisitos e User Stories

- **US01**: Como usuário, quero subir uma planilha de um período inteiro (ex: mês todo) e o sistema deve ler TODAS as OSs finalizadas, extraindo a data real de fechamento (`Finalizada em`) de cada linha, sem me obrigar a selecionar apenas um dia.
- **US02**: Como usuário, quero que as formas de pagamento gerem Recebíveis com vencimentos corretos (ex: PIX/Dinheiro no dia, Débito D+1, Crédito D+30).
- **US03**: Como usuário, quero uma tela de "Extrato" (Histórico) onde eu possa filtrar um período (ex: 01/05 a 31/05) e ver uma linha do tempo de entradas e saídas, com um saldo consolidado do período pesquisado.

---

## O que JÁ EXISTE e será REUTILIZADO
- Tabela `patio_os`: Armazena as OSs (vamos mudar para aceitar o lote todo).
- Tabela `receivables`: Para provisionar os recebimentos futuros.
- Tabela `transactions`: Para o extrato bancário. Entradas (pagamentos) e Saídas.
- Hook `useImportProcessor.ts`.

---

## O que precisa ser CRIADO ou MODIFICADO

### 1. Novo fluxo de Importação
- **Remover o campo "Data Alvo"** do `ImportReportDialog`. A data da OS será lida diretamente da coluna `Finalizada em` do Excel.
- O parser vai iterar a planilha, ler todas as OSs "Finalizadas", extrair o método de pagamento e criar as transações (`transactions` tipo `in`) e recebíveis correspondentes.
- Regras de Pagamento que detectei na sua planilha:
  - `PIX`, `Dinheiro`, `PAGAMENTO EM CONTA` → Cai na hora (Vencimento D+0, Status: Recebido)
  - `Debito` → Cai no dia seguinte (Vencimento D+1, Status: Pendente/Recebido dependendo da data)
  - `Credito` → Cai em 30 dias (Vencimento D+30, Status: Pendente) *(Nota: me confirme se o seu crédito é D+1 ou D+30)*.

### 2. Geração de Transações Reais
- Em vez de só somar totais na tabela `reconciliations`, cada OS paga vai gerar um registro na tabela `transactions` (tipo `in`), com a data do pagamento.
- Isso permitirá montar o Extrato Bancário linha a linha.

### 3. Tela de Histórico / Extrato
- Refazer a tela `/historico` para ter o layout de **Extrato Bancário**.
- Filtro obrigatório de Período (Data Inicial e Data Final) pré-selecionado no mês atual.
- Filtro por Loja.
- Cabeçalho mostrando: Saldo Anterior, Total de Entradas no período, Total de Saídas no período, Saldo Final.
- Lista cronológica detalhada (Data, Descrição da OS ou Despesa, Forma de Pagamento, Valor verde/vermelho).

---

## Critérios de Aceite
1. Ao subir a planilha `1543`, o sistema importa as 43 OSs de uma vez, cada uma com sua data de finalização correta.
2. A tela de Histórico mostra um extrato no estilo banco, permitindo filtrar datas.
3. Recebíveis mostram pendências corretas baseadas nos dias de compensação de cada cartão.

---

## Open Questions

> [!IMPORTANT]
> **Antes de avançarmos, me confirme:**
> 1. **Prazo do Cartão de Crédito**: Na sua maquininha, o crédito cai no dia seguinte (D+1) ou em 30 dias (D+30)? E se for parcelado, a planilha já manda o valor total ou separado? *(Vou configurar D+30 por padrão se você não especificar, mas você mencionou "dia seguinte").*
> 2. Posso limpar o banco de novo para que as próximas importações reflitam esse novo formato de "lote" perfeitamente?
