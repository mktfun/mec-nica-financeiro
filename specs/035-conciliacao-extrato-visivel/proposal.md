# Spec 035 - Integração Visível do Extrato e Correção de Lacunas (Fix Zeros)

## Requisitos
Atualmente a importação OFX funciona, mas as informações processadas chegam com falhas visuais no frontend:
1. **Histórico de Lotes Zerado:** A tela de histórico (`importacoes.tsx`) mostra "Lote OS R$ 0,00" para todas as importações OFX porque o campo `total_os` estava sendo enviado zerado para `import_logs`.
2. **Dashboard de Conciliação Zerado:** A aba de Conciliação Diária lê a coluna `bank_total` da tabela `reconciliations` (que sempre retorna R$ 0,00), mas nunca atualizamos essa coluna quando as transações OFX são criadas.

A solução exige atualizar a integração do backend (calcular o saldo dinâmico via RPC no momento da importação ou consolidá-lo) e corrigir o visual do histórico.

## BDD Scenarios

### Cenário: Exibição Correta do Histórico de OFX
- **Given (Dado):** que o usuário acaba de importar com sucesso um arquivo OFX contendo R$ 10.000,00 de crédito.
- **When (Quando):** ele abre a aba "Histórico" na Central de Importações.
- **Then (Então):** ele deve ver uma etiqueta "[OFX]" com a tag visual "Extrato" (não "Lote OS") e o valor correto R$ 10.000,00 totalizado, em vez de R$ 0,00.

### Cenário: Conciliação Diária Lendo do Extrato Real
- **Given (Dado):** que a tabela `transactions` possui transações OFX para a loja "Dom Pedro" no dia 10/06.
- **When (Quando):** o usuário acessa o Dashboard de Conciliação referente ao dia 10/06.
- **Then (Então):** o valor "Extrato Bancário" da loja Dom Pedro deve somar estritamente o valor de transações com `source = 'ofx'`, preenchendo a coluna `bank_total` e calculando a divergência corretamente (Divergência = Físico + Maquininha - Extrato Bancário).

## Critérios de Aceite
- Ao importar OFX, as transações são guardadas e, logo em seguida, o sistema (via Frontend ou Trigger de Banco) atualiza o `bank_total` na tabela `reconciliations` somando entradas e subtraindo saídas de OFX.
- A exclusão de um lote OFX deve reduzir o `bank_total` da reconciliação referente.
- A UI de Histórico deve renderizar a label `Extrato Bancário` e o valor transacionado corretamente para uploads OFX, exibindo `total_paid_all` em vez de `total_os`.
