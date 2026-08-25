# Round 1 — Architect

## Visão Geral Estrutural
Para integrar Boletos e Transferências Bancárias de forma 100% autônoma e à prova de falhas, a arquitetura deve desacoplar a ingestão da conciliação contábil, garantindo idempotência e integridade referencial.

## Pilares Arquiteturais Propostos:
1. **Pipeline de Classificação e Ingestão (Parser de OS ERP):**
   - Na leitura de `ConferenciaOSxFinanceiro.xls`, quando a forma de pagamento for identificada como `Boleto` ou `Transferência/Débito em Conta`, o sistema deve extrair as parcelas e os prazos.
   - Normalização da entidade `public.receivables`:
     - Chave de unicidade determinística: `UNIQUE INDEX (store_id, os_number, installment, value, due_date)`.
     - Campos: `id`, `store_id`, `os_number`, `installment`, `description`, `type` ('Boleto' | 'Transferência'), `value`, `due_date`, `status` ('pendente' | 'recebido' | 'cancelado'), `matched_ofx_id`.
2. **Desacoplamento do Pátio (Anti-Duplicação Contábil):**
   - Quando uma OS for faturada em Boleto/Transferência, seu saldo não pode mais constar como passivo em aberto no pátio físico (`patio_os`). A OS deve ser marcada como faturada a prazo para que seu valor migre exclusivamente para o **Pilar 3 (A Receber)**.
3. **Motor de Baixa Automática no Backend (RPC `auto_match_receivables`):**
   - Toda vez que um extrato OFX for importado ou o motor de auto-match rodar, o backend deve correlacionar créditos bancários não pareados (`type = 'in'`) com títulos em `public.receivables` onde `status = 'pendente'` e `store_id = ofx.store_id` dentro de uma janela de tolerância de valor e data.
   - Ao casar: `receivables.status = 'recebido'`, `receivables.received_at = ofx.target_date`, `receivables.matched_ofx_id = ofx.id`, e `ofx_transactions.matched_os_number = receivables.os_number`.

## Conclusão
A arquitetura proposta garante que a transição de estado seja determinística e executada exclusivamente via RPCs no banco de dados.
