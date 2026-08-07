# Proposal: Painel Módulo 1 (Aba SALDO Consolidada por Loja) e IntegraçÁo dos Módulos 1-4 (conciliacao-modulo-saldo-completo)

## Problema
A tela principal de conciliaçÁo (`/conciliacao`) atualmente exibe apenas cards simplificados de "Apurado Sistema" e "Entradas OFX", deixando de fora a **Cadeia de Fórmulas Financeiras de Saldos e Resultados** definida no Módulo 1 da planilha `CONCILIACAO-2307.xlsx`.

Faltam no sistema os cálculos essenciais da Aba SALDO por loja e consolidados:
1. **Fórmulas Vivas da Aba SALDO (G13 a G31):**
   - `SALDO` (Soma dos saldos bancários do Itaú das lojas)
   - `DINHEIRO MP` (Fórmula viva: Soma do dinheiro de todas as lojas + lançamentos "NÁO ENTROU" + boletos + cheques)
   - `A RECEBER` (Soma dos recebíveis dos blocos credores do Módulo 3)
   - `NA LOJA` (Soma das OSs em aberto do Módulo 2 por unidade)
   - `SALDO TOTAL` = `SALDO` + `DINHEIRO MP` + `A RECEBER` + `NA LOJA`
   - `CAIXA ATUAL` = `SALDO TOTAL` - `Limite Consolidado`
   - `FLUXO CAIXA` = `CAIXA ATUAL` - `CAIXA ANTERIOR`
   - `FATURAMENTO ATUAL` = `(Faturamento Atual - Faturamento Anterior)` + `Seguro/Sinistro` + `Juros`
   - `VALOR DISPONÍVEL P/ CONTAS` = `FATURAMENTO ATUAL` - `FLUXO CAIXA`
   - `RESULTADO FINAL` = `VALOR DISPONÍVEL` - `VALOR DAS CONTAS` (Saldo livre real por loja e consolidado)
2. **Falta do campo Limite de Crédito por Loja:** O limite bancário digitado por loja era mantido apenas em planilha e nÁo figurava nas tabelas do sistema.
3. **IntegraçÁo Viva dos Módulos 2 (OSs), 3 (Recebíveis) e 4 (Cartório):** Os subtotais das abas de OS e Recebíveis devem alimentar dinamicamente os campos `NA LOJA` e `A RECEBER` do painel.

## SoluçÁo Proposta
Implementar o **Painel Consolidado da Aba SALDO (Módulo 1)** na rota `/conciliacao` e nas páginas individuais de loja (`/conciliacao/$lojaId`):

1. **Novo Componente `Modulo1SaldoPanel.tsx` (`src/components/conciliacao/Modulo1SaldoPanel.tsx`):**
   - Tabela/painel financeiro espelhando a estrutura exata do Módulo 1 da planilha `CONCILIACAO-2307.xlsx`.
   - Exibe linha a linha: Saldo Banco Itaú, Limite, Dinheiro, Cartões ENTROU/NÁO ENTROU, SALDO (G13), DINHEIRO MP (G14 viva), A RECEBER (G15), NA LOJA (G16), SALDO TOTAL (G17), CAIXA ATUAL (G21), FLUXO CAIXA (G23), FATURAMENTO ATUAL (G27), DISPONÍVEL P/ CONTAS (G29), VALOR DAS CONTAS (G30) e RESULTADO FINAL (G31).
   - Alternância entre visÁo **Consolidada Todas as Lojas** e visÁo **Individual por Loja** (Rei do Módulo, Planalto, Mauá, Kennedy, etc.).

2. **Gerenciamento de Limites e Configurações por Loja:**
   - Adicionar ao hook `useStores` / Supabase a persistência dos campos de `limite_credito` e `caixa_anterior` por loja.

3. **ConexÁo Viva dos Módulos:**
   - **`NA LOJA`**: calculado como `SUM(patio_os.total_value - patio_os.paid_value)` para OSs com `status != 'ENTROU'`.
   - **`A RECEBER`**: calculado a partir dos blocos da tabela `receivables` pendentes.
   - **`RESULTADO FINAL`**: apuraçÁo do saldo livre real do período.

## Contratos de Dados
- **Tabela `stores`**:
  - AdiçÁo dos campos `credit_limit` (NUMERIC) e `previous_caixa` (NUMERIC) para persistência do Limite de Crédito e Caixa Anterior por loja.
- **Tabela `reconciliations` / snapshot**:
  - Armazena o registro dos totais calculados (G13 a G31) por loja e por data alvo.

## Features Existentes Impactadas
- `src/routes/conciliacao.index.tsx` (SubstituiçÁo da visualizaçÁo genérica pelo Painel Módulo 1 completo)
- `src/routes/conciliacao.$lojaId.tsx` (InclusÁo do resumo do Módulo 1 específico da loja)
- `src/hooks/useConciliacao.ts` (ExtensÁo da query de saldos para calcular a cadeia G13-G31)
- `src/hooks/useStores.ts` (Persistência dos limites de crédito por loja)

## Risco Principal
Garantir que a cadeia de cálculos da planilha seja 100% matemática no frontend e sincronizada com as importações de extrato e OS.
*MitigaçÁo:* Criar um utilitário central `calculateModulo1Saldo` com testes de contrato das fórmulas exatas da planilha `=SUM(G13:G16)`, `=G17-G18`, `=G29-G30`.
