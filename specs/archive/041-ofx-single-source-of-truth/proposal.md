# Spec 041 - OFX como Única Fonte da Verdade (DRE e Fluxo de Caixa)

## Requisitos e Contexto
O usuário propôs uma mudança arquitetural fundamental e extremamente inteligente para o ecossistema do aplicativo:
Em vez de depender das planilhas da Oficina Inteligente (Pátio, Despesas, Maquininha) para construir o **Saldo da Empresa** (o que exige disciplina perfeita para não gerar saldos negativos irreais), o sistema passará a usar o **OFX (Extrato Bancário)** como a **Única Fonte da Verdade** para o Dashboard, Histórico e DRE de Caixa.

As planilhas de OS e Despesas continuarão sendo importadas, mas **apenas com a finalidade de auditar o banco na tela de Conciliação**. Ou seja, a Conciliação servirá para justificar/explicar os números do OFX através dos lançamentos da oficina.

## BDD Scenarios

### Cenário: Dashboard alimentado puramente pelo Banco
- **Given (Dado):** O usuário importou 1 mês inteiro de OS e Despesas, mas não importou nenhum OFX ainda.
- **When (Quando):** Ele abre o Dashboard Principal (Fluxo de Caixa / Saldo).
- **Then (Então):** O sistema mostra R$ 0,00 de Saldo, porque nada pingou na conta bancária de verdade. Os lançamentos da oficina não inflam o saldo financeiro artificialmente.

### Cenário: Auditar Oficina via Conciliação
- **Given (Dado):** O Dashboard exibe R$ 10.000,00 reais de Entradas vindas de um lote de OFX importado.
- **When (Quando):** O usuário vai na tela de Conciliação para auditar de onde vieram esses R$ 10k.
- **Then (Então):** A tela compara os R$ 10.000,00 de OFX contra o "Apurado Sistema" (Pátio OS + Maquininha - Despesas) e exibe as divergências diárias. O Extrato passa a ser o juiz.
