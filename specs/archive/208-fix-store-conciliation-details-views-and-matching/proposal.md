# Proposal: 208-fix-store-conciliation-details-views-and-matching

## 1. Problema Identificado

Na tela interna de detalhes de conciliação por loja (`/conciliacao/$lojaId`), as 4 abas de conciliação apresentam inconsistências graves de visualização e pareamento de dados:

1. **Aba 1: Cartão (OS → Maquininha)**:
   - Faturamento em OS aparece zerado (`R$ 0,00`) e com badge `SEM OS` / UUID não formatado.
   - A coluna `REDE (BRUTO)` estava exibindo o valor líquido (`amount` = R$ 4.911,48) em vez do valor bruto (`gross_amount` = R$ 5.054,52).
   - O hook `useReconciliationViews` buscava dados na tabela legada `estoque_os_pendente` em vez da tabela real `patio_os`, onde as OSs importadas são gravadas.
2. **Aba 2: Maquininha (Líq) → Banco**:
   - Os cards de resumo exibiam taxas descontadas como `R$ 0,00`.
   - O status das transações marcava `NÃO ENTROU` porque dependia exclusivamente de um ID de chave estrangeira rígida (`matched_ofx_id`), ignorando os depósitos de adquirente (`REDE`, `REDEMULTI`, `CARTAO`, `CIELO`) já existentes no extrato OFX daquela filial.
3. **Aba 3: PIX (OS → Banco OFX)**:
   - Exibia `0 TRANSAÇÕES` e `Nenhuma OS informou pagamento em PIX nesta data` porque a tabela `estoque_os_pendente` estava vazia, enquanto `patio_os` continha as OSs com pagamentos via PIX/Transferência.
4. **Aba 4: Banco (Sem Origem)**:
   - Não listava de forma clara as entradas avulsas do OFX não associadas a maquininha ou OS.

---

## 2. Solução Proposta

1. **Reestruturar o Hook `useReconciliationViews` (`src/hooks/useConciliacao.ts`)**:
   - Alterar a busca de Ordens de Serviço de `estoque_os_pendente` para **`patio_os`** filtrando por `store_id` e data (`opened_at` / `closed_at` / `target_date`).
   - Carregar todas as transações bancárias (`source: 'ofx'`) e maquininha (`source: 'rede'`) daquela filial na data alvo.
2. **Correção e Enriquecimento da Aba 1 (Cartão OS → Maquininha)**:
   - Exibir `rede_bruto` (`t.gross_amount || t.amount`), `taxa_brl` (`t.fee_amount`), e `rede_liquido` (`t.amount`).
   - Parear cada transação de cartão da REDE com a OS correspondente no `patio_os` (onde `credit_value > 0` ou `debit_value > 0` ou `payment_method` de cartão).
   - Exibir número legível da OS (`OS #12345`), cliente, veículo/placa, valor faturado no sistema e cálculo do `Delta = rede_bruto - os_faturamento`.
3. **Correção da Aba 2 (Maquininha Líq → Banco)**:
   - Calcular nos cards de topo o Total Bruto, Total Taxas Descontadas e Total Líquido da Maquininha.
   - Parear o Líquido da REDE com os depósitos bancários de adquirente no extrato OFX (`REDE`, `REDEMULTI`, `RECEBIMENTO CARTAO`, `VISA`, `MAST`, `CIELO`), exibindo o status `ENTROU NO BANCO (OFX)` em verde.
4. **Correção da Aba 3 (PIX OS → Banco OFX)**:
   - Extrair todas as OSs em `patio_os` com `pix_transfer_value > 0` ou `payment_method` contendo PIX/Transferência.
   - Extrair todas as entradas bancárias do OFX contendo `PIX` / `TRANSF` / `TED` no título ou descrição.
   - Parear por valor e data, exibindo cards de resumo (Total PIX Pátio, PIX Entrou no Banco, PIX Pendente) e tabela com OS, Cliente, Placa, Lançamento Bancário e Status.
5. **Aprimoramento da Aba 4 (Banco Sem Origem)**:
   - Exibir todas as entradas OFX da filial não atribuídas a cartão ou PIX de OS.

---

## 3. Contratos de Dados e Tabelas

- **Tabela `patio_os`**: `os_number`, `store_id`, `client_name`, `plate`, `total_value`, `paid_value`, `payment_method`, `credit_value`, `debit_value`, `pix_transfer_value`, `opened_at`, `closed_at`, `status`.
- **Tabela `transactions`**: `store_id`, `amount`, `gross_amount`, `fee_amount`, `source` (`'rede'`, `'ofx'`, `'maquininha'`), `type` (`'in'`, `'out'`), `title`, `counterpart_name`, `target_date`, `os_number`.
- **Tabela `reconciliations`**: `store_id`, `date`, `na_loja_os`, `status`.
