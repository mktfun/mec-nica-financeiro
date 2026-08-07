# Research: ConciliaçÁo Bancária & Juros (030)

## 1. Contexto do Pedido
O cliente (mecânica) solicitou duas novas funcionalidades core para o Motor de ConciliaçÁo Diária:
1. **Taxas e Juros da Maquininha:** Importar a planilha da Rede de "Juros" para cruzar e registrar o que a loja pagou de juros ou desconto na antecipaçÁo.
2. **ConciliaçÁo Bancária via OFX:** Importar o Extrato Bancário em formato `.ofx` e bater com os lançamentos do sistema (Saídas/Despesas e Entradas/Vendas/Recebimentos da Maquininha e PIX). O sistema deve tolerar uma margem de segurança de até R$ 10,00 (positiva ou negativa).

## 2. Análise dos Arquivos Fornecidos

### 2.1 `JUROS REDE.xlsx`
- **Formato:** O arquivo vem como um `.xlsx`.
- **Conteúdo:** Apresenta blocos empilhados por loja. O nome da Loja (ex: "PIRAPORINHA", "PLANALTO") encontra-se em células isoladas no início do bloco.
- **Colunas Encontradas:** `Tipo` (crédito/débito), `Bandeira` (Visa, Mastercard), `Valor Bruto`, `Valor Liquido`, `taxa juros`, `valor cobrado`.
- **Estratégia de Parsing:** Precisamos iterar pelas linhas de cima para baixo. Ao identificar uma string isolada que pareça com o nome de uma loja, guardamos o estado. Em seguida, procuramos pela linha de cabeçalho e coletamos os dados `Valor Bruto`, `Valor Liquido` e `valor cobrado` associando à loja correta. Com o Total Cobrado, o sistema sabe exatamente o "Custo da Máquina" no período.

### 2.2 `Extrato_JAB.ofx`
- **Formato:** O arquivo usa a estrutura OFX PadrÁo (tags XML/SGML nÁo perfeitamente fechadas, e.g. `<TRNAMT>15459.42`).
- **Conteúdo:** Possui as tags `<STMTTRN>` contendo transações do tipo `<TRNTYPE>` (CREDIT ou DEBIT), data `<DTPOSTED>`, valor `<TRNAMT>` e memo `<MEMO>`.
- **Exemplo Real Lido:** 
  - `CREDIT` - `REDE VISA DB...` - R$ 2653.54 (Entrada da Maquininha)
  - `DEBIT` - `BOLETO PAGO HITOCOM MANG` - R$ -180.00 (Despesa Paga)
  - `DEBIT` - `SISPAG TRIB MUNICIPAL` - R$ -3062.57 (Imposto/Despesa)
  - `CREDIT` - `SALDO TOTAL DISPONIVEL DIA` - NÁo é uma transaçÁo em si.

## 3. Estratégia de Arquitetura e Modelagem
A conciliaçÁo bancária é o último elo financeiro. Ela corrobora tudo que aconteceu no dia.
A margem de tolerância (R$ 10) deve ser parametrizada para fácil mudança no futuro.
Precisamos de um novo hook, `useOfxParser`, capaz de interpretar a sintaxe bruta SGML do OFX (já que navegadores modernos nÁo lidam bem com SGML nativamente, podemos usar regex simples para as tags-chave).

A tabela `reconciliations` no Supabase precisará de novos campos ou criaremos uma tabela `bank_reconciliations` associada à data e à loja. Como o Extrato Bancário frequentemente engloba a *empresa como um todo*, precisamos investigar como as "Lojas" se conectam com o "Banco". Se o Extrato for por Loja ("Extrato_JAB" indica filial Jabaquara), faremos reconciliações bancárias **por loja**.

- O OFX Parser fará Match Automático (`Inteligência`):
  1. Para saídas (`DEBIT`), tenta encontrar uma Despesa cadastrada no dia e valor exatos (dentro de +/- R$ 10).
  2. Para entradas (`CREDIT`), tenta encontrar lançamentos em CartÁo (Valor Líquido pós Juros) e transações PIX. Se houver discrepância visual, exibe como "Incongruência".
