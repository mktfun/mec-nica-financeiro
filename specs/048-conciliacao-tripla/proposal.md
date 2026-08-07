# Proposal - Conciliação Tripla e Configuração de Juros

## Objetivo
Implementar um sistema de auditoria granular ("Match Triplo") onde o usuário, ao clicar em uma loja específica num dia, visualiza linha a linha se o valor original cobrado (OS) bate com o recebido (Maquininha) e o compensado (Banco). Inclui também um módulo de Configurações para definir regras de juros cobradas aos clientes pelas maquininhas, garantindo que o Match não falhe por causa dessas divergências matematicamente esperadas.

## Requisitos
1. **Configuração de Juros/Taxas:**
   - Criar uma aba ou seção em `/configuracoes` onde o usuário pode cadastrar um Plano de Juros.
   - Exemplo: "Cartão de Crédito 12x: +15% no valor da OS".
2. **Visão Detalhada de Conciliação (Match Triplo):**
   - Ao acessar os detalhes de uma loja (`/loja/$lojaId` com o parâmetro de data), exibir uma tabela de transações.
   - A tabela deve ter colunas: `Origem (OS)`, `Adquirente (Maquininha)`, `Conta (OFX)`, `Status`.
   - **Algoritmo de Match:** Se uma OS no valor de R$ 500 foi paga em Crédito 12x, o sistema calcula `500 * 1.15 = R$ 575`. Ele procurará uma transação de maquininha de R$ 575 e um depósito bancário de R$ 575.
3. **Indicadores Visuais:**
   - ✅ **Bateu Perfeito:** OS + Juros == Maquininha == Banco.
   - ⚠️ **Parcial:** OS bate com Maquininha, mas não caiu no banco ainda (ou vice-versa).
   - ❌ **Divergente:** Valores não fecham.

## BDD Scenarios

### Cenário: Match Triplo Perfeito com Juros
- **Given (Dado):** que a taxa de Crédito é 10%. Há uma OS de R$ 1.000,00 no dia 9 paga em Crédito. A maquininha reportou R$ 1.100,00 no dia 10 (D+1). O OFX importou R$ 1.100,00.
- **When (Quando):** o usuário acessar a conciliação detalhada daquela loja.
- **Then (Então):** o sistema exibirá uma única linha consolidada mostrando OS (R$ 1.000,00) -> Maquininha (R$ 1.100,00) -> Banco (R$ 1.100,00) com um badge Verde de "Conciliado".

### Cenário: Falta de Pagamento Bancário
- **Given (Dado):** que houve uma venda na OS e na Maquininha, mas não há correspondente no OFX.
- **When (Quando):** o usuário visualizar as transações do dia.
- **Then (Então):** o status mostrará "Aguardando Depósito" (Divergência).
