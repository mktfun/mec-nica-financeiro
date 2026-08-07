# Spec 035 - IntegraçÁo Visível do Extrato e CorreçÁo de Lacunas (Fix Zeros)

## Requisitos
Atualmente a importaçÁo OFX funciona, mas as informações processadas chegam com falhas visuais no frontend:
1. **Histórico de Lotes Zerado:** A tela de histórico (`importacoes.tsx`) mostra "Lote OS R$ 0,00" para todas as importações OFX porque o campo `total_os` estava sendo enviado zerado para `import_logs`.
2. **Dashboard de ConciliaçÁo Zerado:** A aba de ConciliaçÁo Diária lê a coluna `bank_total` da tabela `reconciliations` (que sempre retorna R$ 0,00), mas nunca atualizamos essa coluna quando as transações OFX sÁo criadas.

A soluçÁo exige atualizar a integraçÁo do backend (calcular o saldo dinâmico via RPC no momento da importaçÁo ou consolidá-lo) e corrigir o visual do histórico.

## BDD Scenarios

### Cenário: ExibiçÁo Correta do Histórico de OFX
- **Given (Dado):** que o usuário acaba de importar com sucesso um arquivo OFX contendo R$ 10.000,00 de crédito.
- **When (Quando):** ele abre a aba "Histórico" na Central de Importações.
- **Then (EntÁo):** ele deve ver uma etiqueta "[OFX]" com a tag visual "Extrato" (nÁo "Lote OS") e o valor correto R$ 10.000,00 totalizado, em vez de R$ 0,00.

### Cenário: ConciliaçÁo Diária Lendo do Extrato Real
- **Given (Dado):** que a tabela `transactions` possui transações OFX para a loja "Dom Pedro" no dia 10/06.
- **When (Quando):** o usuário acessa o Dashboard de ConciliaçÁo referente ao dia 10/06.
- **Then (EntÁo):** o valor "Extrato Bancário" da loja Dom Pedro deve somar estritamente o valor de transações com `source = 'ofx'`, preenchendo a coluna `bank_total` e calculando a divergência corretamente (Divergência = Físico + Maquininha - Extrato Bancário).

## Critérios de Aceite
- Ao importar OFX, as transações sÁo guardadas e, logo em seguida, o sistema (via Frontend ou Trigger de Banco) atualiza o `bank_total` na tabela `reconciliations` somando entradas e subtraindo saídas de OFX.
- A exclusÁo de um lote OFX deve reduzir o `bank_total` da reconciliaçÁo referente.
- A UI de Histórico deve renderizar a label `Extrato Bancário` e o valor transacionado corretamente para uploads OFX, exibindo `total_paid_all` em vez de `total_os`.
