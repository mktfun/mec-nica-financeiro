# Proposal: Correção do Motor de Auto-Match (Intercompany e Nomes Curtos)

## 1. Contexto e Problema
No processamento da conciliação do dia 17/09, o usuário relatou que algumas transações com **nome e valor exatos não foram vinculadas**. Além disso, uma "Transferência Intercompany" de **R$ 7.000,00** originada na loja HD (SISPAG FORNECEDORES) e recebida na loja Brasicar também não foi vinculada, apesar de o usuário tê-la conciliado diretamente em uma OS no sistema ERP.

**Diagnóstico Técnico (Forense):**
1. **Falha de Match Fonético em Nomes Curtos (ex: "HD"):** A função `matchClientTokens` atual possui um filtro `t.length >= 3`. Se o nome do cliente na OS for apenas "HD" (2 letras), a lista de tokens fica vazia e a função retorna `false`, impedindo o vínculo mesmo se o valor for idêntico.
2. **Falha em Pagamentos Parciais / Transferências Agrupadas:** Se o valor da transferência (ex: 7000.00) for um *pagamento parcial* ou *pagamento somado* e não for exatamente igual ao `total_value` ou `paid_value` da OS, o "Tier 1" falha.
3. **Bloqueio de Boletos no Match de OFX:** O "Tier 2" (match via Contas a Receber) explicitamente descarta recebíveis com `rec.type === 'Boleto'`. Entretanto, extratos de Intercompany/Fornecedores muitas vezes aparecem no OFX como "Boleto / Pagamento Fornecedor" (ex: SISPAG), impedindo o casamento automático.

## 2. Escopo da Solução

Vamos fortalecer o `src/lib/matchers/autoMatchingEngine.ts`:

- **Fix A: Salvaguarda para Nomes Curtos (Tokens < 3):** 
  Se após a remoção de stopwords e o filtro de tamanho `clientTokens` ficar vazio (ex: cliente "HD" ou "A&M"), o sistema fará um fallback simples verificando se o nome normalizado original está contido na string do banco (`normCounter.includes(normClient)`).
- **Fix B: Relaxamento de Boletos Intercompany no Tier 2:** 
  O bloqueio restrito a `rec.type === 'Boleto'` será relaxado. Se houver um recebível de boleto cujo valor bate *exatamente* com um crédito/débito no extrato (OFX), ele passará a ser aceito caso o nome ou CNPJ cruzem, garantindo que pagamentos via SISPAG Fornecedores / Intercompany sejam encontrados.
- **Fix C: Partial Payment Fallback (Tier 1.5):**
  Se o valor do extrato for *menor ou igual* ao saldo da OS (`txAmount <= osTotal`) E houver um match forte de nome/CNPJ (`matchClientTokens`), o motor fará o vínculo considerando como pagamento parcial daquela OS, preenchendo a lacuna de transações diretas que não batem com o total fechado da OS.

## 3. Impacto e Riscos
- **Risco:** Casar parcialmente uma OS errada.
- **Mitigação:** O match parcial (Tier 1.5) só será disparado se houver **apenas 1 OS pendente** do cliente com match forte de nome/CNPJ.
- Não haverá impacto negativo no que já funciona, apenas resgatará falsos negativos (transações que ficariam órfãs na tela).
