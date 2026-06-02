# Vibe Proposal: Processamento Granular de Planilha (Pátio, Recebíveis e Transações)

## 1. Problema e Contexto

Atualmente, o sistema importa a planilha (que pode conter os dados do mês inteiro acumulados) e apenas soma tudo que está como "Finalizada" para gerar um valor total (`financial_total`) na tabela de conciliação. 

Como o usuário importa planilhas recorrentes (com os mesmos dados acumulados), isso gera problemas:
1. **Dados Duplicados / Desatualizados**: Não rastreamos as Ordens de Serviço individualmente.
2. **Pátio Vazio**: As OSs que estão em andamento ou parcialmente pagas não estão alimentando a tabela `patio_os`.
3. **Recebíveis Vazios**: As formas de pagamento em Crédito, Débito ou Boleto extraídas do arquivo não estão sendo inseridas na tabela `receivables` com suas respectivas datas de vencimento.
4. **Transações (Opcional/Histórico)**: O detalhamento financeiro por OS não aparece na visão geral.

## 2. Requisitos e User Stories

- **US1**: Como usuário, ao importar o relatório, quero que CADA Ordem de Serviço da planilha seja mapeada para a tabela `patio_os`. Se já existir, deve atualizar o status (Ex: de `em_aberto` para `finalizado`).
- **US2**: Como gestor, quero que os pagamentos feitos em Cartão (Crédito/Débito) e Boleto caiam automaticamente na aba de `Recebíveis` para eu acompanhar o que a operadora de cartão ainda vai me pagar. Para evitar duplicações, a inserção deve estar atrelada ao número da OS.
- **US3**: A importação deve ser idempotente, ou seja, posso subir o mesmo arquivo 10 vezes no mês e ele não vai duplicar OSs ou recebíveis, apenas atualizar o estado atual delas.

## 3. Componentes e Tabelas Existentes
- **`ImportReportDialog.tsx`**: Faz a leitura e loop de cada linha. Atualmente guarda apenas uma soma num state e dispara uma única mutação para `reconciliations`.
- **`patio_os` (Tabela Supabase)**: Existe, mas não tem Constraints suficientes para evitar duplicação em upserts nativos (dependendo da modelagem atual) e não estava sendo alimentada.
- **`receivables` (Tabela Supabase)**: Existe, mas falta a coluna `os_number` para sabermos de qual OS o recebível veio, vital para atualizarmos recebíveis caso o arquivo seja importado de novo.

## 4. O que precisa ser CRIADO / ALTERADO

**Migrações de Banco de Dados**:
- Adicionar a coluna `os_number` (text, anulável) na tabela `receivables`.
- Criar Constraints de `UNIQUE (store_id, os_number)` na tabela `patio_os`. Se um `upsert` ocorrer com o mesmo `os_number` na mesma loja, atualizamos os valores.
- Criar Constraints de `UNIQUE (store_id, os_number, type)` na tabela `receivables`.

**Lógica de Front-end (Hooks)**:
- Em vez de enviar apenas `{ totalOs, totalPaid }` para o banco, o `ImportReportDialog` passará um array gigantesco de "OSs parseadas".
- Criar/Atualizar uma edge function ou usar uma RPC / Batch Upsert no `supabase-js` para inserir as OSs na tabela `patio_os` e na tabela `receivables` com apenas uma requisição para não engasgar o app.

## 5. Critérios de Aceite
- [ ] Importar um arquivo preenche os Carros no Pátio com base nas placas e status.
- [ ] Importar um arquivo preenche os Recebíveis extraindo "Crédito" e projetando para vencimento futuro (ex: 30 dias).
- [ ] Importar o *mesmo arquivo* duas vezes seguidas não aumenta o número de OSs no pátio nem duplica os valores de recebíveis (idempotência).
