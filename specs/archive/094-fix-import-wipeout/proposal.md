# Proposal: O Raio-X da Importação em Lote e a Correção do "Efeito Wipeout" (094)

## O que exatamente acontece ao arrastar os arquivos? (O Raio-X)

Você me pediu para destrinchar sem suposições. Fui direto no código (`CentralImportWizard.tsx` e `useTransactions.ts`). O fluxo que ocorre por trás das cortinas é o seguinte:

### 1. A Matemática da Identificação (Memória Local)
Quando você solta um Excel da Maquininha, outro da OS, e um OFX do Itaú:
- **OFX:** O sistema lê as transações, limpa os lixos (ex: "SALDO DISPONIVEL"), extrai o `FITID` (Código Único do Banco) e o valor bruto. O saldo da conta é capturado da tag `<LEDGERBAL>`.
- **Pátio (OS):** Ele lê as OSs e faz uma conta matemática chamada **Delta Paid**. Ele olha no banco de dados o quanto a OS já estava paga ontem e subtrai do valor pago de hoje. Se a OS estava devendo R$ 100 e hoje pagou os R$ 100, o *Delta* é 100.
- **Rede (Maquininha):** Ele captura o valor Bruto, a Taxa (`fee_amount`) e o valor Líquido (`net_amount`).

### 2. A Tentativa de Pareamento Automático (Auto-Match)
Antes de salvar no banco, o sistema tenta brincar de detetive na memória RAM:
- Ele pega todos os créditos do OFX (`type === 'in'`) e tenta achar um "irmão gêmeo" no Pátio (OS) do mesmo dia.
- A tolerância matemática dele é brutal: `Math.abs(ValorOS - ValorOFX) < 1.0`. Ou seja, se a OS foi R$ 500,00 e caiu um PIX no extrato de R$ 500,50, ele declara Casamento Perfeito. 

### 3. O Desastre na Hora de Salvar no Banco (O Grande Erro)
Aqui é onde a casa cai e gera os erros que você está sofrendo. O arquivo `useTransactions.ts` tem uma função chamada `useBulkInsertTransactions`. O que ela faz ao tentar salvar o seu lote de hoje?

1. **Bug Crítico 1 (O Exterminador de Lançamentos Manuais):** 
   O sistema executa um comando de limpeza para garantir que não vai duplicar a Rede/Maquininha. O comando é literalmente:
   `DELETE FROM transactions WHERE target_date = '2026-08-05' AND fitid IS NULL;`
   O que isso significa? Significa que **TUDO** que você salvou nesse dia que não veio de um arquivo bancário oficial (como as suas despesas, contas a pagar manuais, ou recebimentos soltos) **É DELETADO SUMARIAMENTE**. A cada lote que você importa, você apaga a sua própria conciliação manual do dia.
   
2. **Bug Crítico 2 (Destruição dos Matches Anteriores):**
   Para o OFX, ele faz algo parecido: deleta as transações OFX antigas do dia e reinsere. Só que, ao reinserir, o sistema gera **novos UUIDs** (novas identidades no banco). Com isso, todos os "Matches" (amarrações na tabela `conciliation_matches`) que você já tinha feito manualmente perdem a referência e são destruídos por cascata ou ficam flutuando no vazio.

## Solução Proposta

1. **Fim do Wipeout:** 
   O delete da Rede/Maquininha passará a exigir que a transação tenha `source = 'rede'` ou `source = 'maquininha'`. Suas despesas e contas manuais estarão **blindadas**. Nenhuma importação poderá deletar lançamentos manuais.
2. **OFX Idempotente de Verdade:** 
   Removeremos a rotina de exclusão prévia do OFX (`delete eq('source', 'ofx')`). Utilizaremos apenas a função `upsert` baseada no `fitid`. Se o extrato trouxer a mesma transação, ele apenas ignora ou atualiza, mantendo o ID original intacto. Com isso, os matches manuais nunca mais serão apagados.
3. **Desacoplamento Seguro:**
   As transações de OS (Pátio) não vão mais se intrometer na tabela `transactions`. Elas ficarão estritamente no `patio_os`, e a balança será a única responsável por ler de lá.
