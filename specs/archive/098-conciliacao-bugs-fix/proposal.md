# Proposal: FixaçÁo de Lógica de Contas, OSs Pendentes e Fluxo de Caixa (098)

## 1. Problema: Contas a Pagar e a Diferença Bizarra
**Causa Raiz:** Se os lançamentos de `juros_rede` ou `contas_a_pagar` forem importados/digitados no sistema como números negativos, a variável `valor_contas` (que soma as despesas) fica negativa. Ao aplicar a fórmula `diferenca = valor_disp_contas - valor_contas`, a subtraçÁo de um número negativo gera uma soma (`a - (-b) = a + b`), estourando o saldo.
**SoluçÁo:** Envolver as entradas de despesa em `Math.abs()` no core engine (`modulo1Calculations.ts`) para garantir que qualquer despesa (mesmo inserida com sinal de menos) seja tratada matematicamente como um valor positivo de deduçÁo.

## 2. Problema: "NA LOJA OS" está R$ 0,00
**Causa Raiz:** O motor de conciliaçÁo (`useConciliacao.ts`) puxa as OSs ativas do banco de dados e filtra por status estritos (`'em_aberto'`, `'pago_parcial'`). Se a importaçÁo ou cadastro definir status com letras maiúsculas, com espaços, ou simplesmente usar rótulos diferentes (`'Pendente'`, `'Aberta'`), as OSs sÁo ignoradas e o pátio zera.
**SoluçÁo:** Expandir a regra de normalizaçÁo de status. Passar o status recebido pelo banco para lowercase e checar um leque maior de possibilidades: `'em_aberto', 'pago_parcial', 'pendente', 'aberta', 'aberto', 'em andamento'`.

## 3. Problema: Fluxo de Caixa igual ao Caixa Atual
**Causa Raiz:** A fórmula `Fluxo = Caixa Hoje - Caixa Ontem` usa `caixa_anterior` como 0. Isso acontece porque o sistema tenta puxar a conciliaçÁo do dia anterior (da tabela `daily_snapshots`), mas se o usuário ainda nÁo tiver clicado no botÁo de "Salvar" o fechamento no dia anterior, o sistema nÁo encontra histórico.
**SoluçÁo:** Criar um mecanismo visual para que o gerente saiba o motivo do Caixa Anterior estar 0. Adicionar suporte para o input manual de `caixa_anterior_manual` (override provisório) caso o snapshot do dia anterior nÁo exista, permitindo que eles calibrem o sistema no "Dia 1" de uso sem a necessidade retroativa de dados.

## Risco
A alteraçÁo de `Math.abs()` impactará o motor global de cálculo da oficina, o que é a intençÁo exata. Expandir os status das OSs também fará valores passarem a aparecer onde antes era 0, o que afetará retroativamente as visualizações. Nenhuma tabela no DB será reestruturada.
