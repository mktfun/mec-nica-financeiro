# Proposal: Vínculo Manual de PIX/Banco com OS, Desvinculação e Proteção contra Duplicidade no Faturamento (221)

## Problema
1. **Matches Automáticos Incompletos ou Incorretos:**
   - Muitas transações de PIX que entraram no extrato bancário pertencem a Ordens de Serviço (OSs), mas não receberam match automático devido a pequenas divergências no valor (ex: desconto/acréscimo de centavos) ou memos bancários genéricos (ex: `SISPAG`, `RECEBIMENTO PIX`).
   - Além disso, algumas OSs foram pagas em dinheiro físico ou outro meio na loja, mas o sistema pode ter sugerido ou forçado um match incorreto com PIX bancário.
2. **Risco de Duplicidade Contábil no Faturamento:**
   - Se uma transação bancária for apenas o recebimento de uma OS, ela **NÃO pode somar no Faturamento Atual** do fechamento diário, pois a OS já está contabilizada no Faturamento do Mapa de Metas da loja.
   - Atualmente, não há distinção clara na UI entre:
     - **Vincular à OS (Match de Recebimento de OS):** Não soma no Faturamento Atual.
     - **Justificar Receita Avulsa (Sem OS):** Soma no Faturamento Atual.

## Solução Proposta
1. **Modal de Vínculo Manual com OS (`ManualMatchOsModal.tsx`):**
   - Permitir ao operador clicar em qualquer transação bancária órfã (em *PIX* ou em *Banco Sem Origem*) e abrir uma busca das Ordens de Serviço pendentes daquela loja com:
     - Número da OS, Nome do Cliente, Placa do Veículo, Valor da OS e Método de pagamento informado no pátio.
     - Botão "Vincular à OS".
2. **Ação de Desvinculação:**
   - Permitir desvincular uma OS pareada caso o pagamento tenha ocorrido em dinheiro físico ou outro meio.
3. **Regra Contábil Estrita (Zero Duplicidade):**
   - **Transação Vinculada à OS:**
     - Grava `matched_os_number` na transação bancária e `matched_ofx_id` na OS.
     - O valor baixa a OS e a entrada bancária.
     - **NÃO é somado ao Faturamento Atual** (evita duplicar com o Mapa de Metas).
   - **Transação Justificada (Receita Avulsa / Venda de Óleo / Sucata / Rendimento):**
     - Grava `manual_category` e `manual_justification` sem `matched_os_number`.
     - **SOMA no Faturamento Atual** e abate da pendência da filial.
4. **Interface Atualizada nas Tabelas de Conciliação:**
   - Em `PixVsOfxTable.tsx`: Exibir botões "Vincular à OS" e "Desvincular".
   - Em `OfxSemMatchTable.tsx`: Exibir opções "Vincular à OS" (se for pagamento de cliente) ou "Justificar Receita Avulsa".

## Contratos de Dados
- `transactions`, `ofx_transactions`, `patio_os`:
  - `matched_os_number`: String (ex: `'577'`).
  - `matched_ofx_id`: UUID ou String do ID da transação bancária.
  - `manual_category`, `manual_justification`: String.
- `useJustifiedTransactions`:
  - Filtro estrito: apenas transações onde `matched_os_number IS NULL` são somadas ao Faturamento Atual.

## Riscos e Mitigações
- **Risco:** Vincular a mesma OS a múltiplos PIX.
- **Mitigação:** Ao selecionar uma OS, ela sai da lista de disponíveis para match nas outras transações.
