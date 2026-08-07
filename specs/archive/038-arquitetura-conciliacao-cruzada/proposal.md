# Spec 038 - Arquitetura de Conciliação Cruzada e DRE Financeira

## Requisitos
O usuário precisa de uma validação e representação visual da lógica financeira do sistema. O ecossistema processa 4 fontes de dados que se chocam na Conciliação Diária:
1. **Pátio / OS:** Fonte de Receitas. Quando o cliente parcela no cartão, a OS possui o valor original e o valor com juros (que o cliente pagou a mais). O sistema registra no "Sistema (Cartão+Din)" a soma com juros, pois é o valor bruto que a adquirente processará.
2. **Juros Rede (Taxas):** Fonte de Despesas Indiretas. A maquininha cobra taxas sobre a transação. Essa taxa é importada e registrada como Saída (`type='out'`) no "Sistema".
3. **Contas a Pagar (Despesas):** Fonte de Despesas Diretas. Tudo que a loja gasta, registrado como Saída (`type='out'`) no "Sistema".
4. **Extrato Bancário (OFX):** A Fonte da Verdade Líquida. O valor que cai no banco é exatamente `OS(com juros) - Taxas`.

O sistema só alcança **Divergência = R$ 0,00** quando:
`Extrato Bancário (Net) = Pátio(Bruto com Juros do Cliente) - Juros Rede(Taxa da Maquininha) - Contas a Pagar`.

## BDD Scenarios

### Cenário: Matemática Perfeita com Maquininha
- **Given (Dado):** Uma OS de R$ 1.000,00 que o cliente paga em 12x. Ele assume o Juros do Cartão e paga R$ 1.140,00. A maquininha cobra uma taxa de R$ 40,00 da loja.
- **When (Quando):** A Loja importa o Pátio, importa a Planilha de Juros Rede (Taxas) e importa o Extrato (OFX).
- **Then (Então):** 
  - O Sistema registra: Entrada de +R$ 1.140,00 (OS) e Saída de -R$ 40,00 (Taxa). Saldo do Sistema: R$ 1.100,00.
  - O Banco registra: Entrada líquida de +R$ 1.100,00 (OFX).
  - A divergência na Conciliação Diária será de R$ 0,00.

### Cenário: Maquininha como Espelho
- **Given (Dado):** O usuário importa o relatório da Maquininha (Recebíveis).
- **When (Quando):** Os dados são processados.
- **Then (Então):** Eles não somam saldo no "Sistema" da Conciliação (pois duplicaria as OSs). Eles ficam guardados na aba "Recebíveis" apenas para cruzar previsões de caixa e confirmar se as taxas e valores informados pelo banco conferem com a provedora do cartão.
