# Spec Plan: Nomenclatura e Diferença (097)

## Tasks

- [x] [FRONTEND] Editar `src/routes/conciliacao.index.tsx`
  - Renomear a variável `faturamento` ou substituí-la conceitualmente pela variável `previstoPlanilhas` para representar a soma de Maquininha + PIX.
  - Inverter a conta da diferença: `const diferenca = faturamentoBanco - previstoPlanilhas;`.
  - Atualizar os rótulos dos Cards no Grid da loja:
    - Alterar label "Saldo" para "Faturam. Banco".
    - Alterar label "Faturamento" para "Previsto".
  - Ajustar a renderizaçÁo da Diferença: formatar a exibiçÁo da cor dependendo se é sobra (positivo, verde) ou furo (negativo, vermelho).
- [x] [FRONTEND] Garantir que o valor exibido em "Previsto" (antigo Faturamento) seja a soma `maquininha + pixOs`, e nÁo mais `saldo_banco_itau`.
