# Proposal: Correção de Inserção e Filtro de Competência (053)

## 1. O Problema
O usuário relatou dois bugs críticos resultantes do processo unificado de importação (`CentralImportWizard`):
1. **Inflação Irreal no Fechamento (479k vs 46k):** A importação centralizada está pegando **todas** as linhas da planilha de OS e Maquininha (que muitas vezes contêm o histórico do mês inteiro) e atribuindo-as à `targetDate` na tabela de transações. Isso joga centenas de milhares de reais num único dia da conciliação.
2. **Abismos nas Telas "Pátio" e "Recebíveis":** O novo Wizard injetou os dados diretamente na tabela `transactions` para a conciliação, mas não inseriu os dados brutos nas suas tabelas corretas (`patio_os` e `receivables`). O resultado é que as telas que monitoram o status real dos carros e recebíveis ficaram vazias.

## 2. A Solução
O fluxo de inserção do `CentralImportWizard` será reescrito para respeitar a arquitetura relacional e a temporalidade dos dados:

1. **Inserção Massiva com Preservação de Histórico:**
   - **Pátio:** Todas as OSs parseadas na planilha serão salvas na tabela `patio_os`. Isso garante que a tela "Carros no Pátio" volte a funcionar, exibindo o status correto (Em aberto, finalizado, pago parcial) independentemente do dia em que a OS foi criada.
   - **Recebíveis:** Todos os itens da Maquininha serão salvos na tabela `receivables`, restaurando a tela de monitoramento de fluxo de caixa futuro.

2. **Filtro Estrito de Competência (D+1):**
   - Na hora de gerar as `transactions` para alimentar o card de Conciliação do dia, vamos aplicar um **filtro estrito de data**:
     - **Sistema (OS):** Apenas as OSs cujo fechamento/pagamento (`closed_at` ou, na ausência, `opened_at`) for **extamente igual** ao `targetDate` escolhido.
     - **Maquininha:** Apenas as vendas (`dateVenda`) que ocorreram no `targetDate`.
     - **Extrato (OFX):** Permanece o fluxo normal, porém com as datas reais de transação preservadas.
   - Isso garante que se o usuário subir a planilha de Junho inteiro, mas escolher a competência "09/06/2026", apenas as OSs finalizadas dia 09 entrarão na conciliação do dia 09. O restante servirá apenas para histórico no "Pátio".

## 3. Riscos Mitigados (Bayesian / Adaptive)
- **Risco:** O OFX não tem "D+1" explícito no OFX, apenas as datas de crédito. Se limitarmos os OFXs do `targetDate`, podemos perder o "crédito D+1" que cai no dia 10.
- **Mitigação:** O filtro estrito de `targetDate` será aplicado apenas sobre os dados extraídos das **planilhas (OS e Rede)** que são inseridos sinteticamente como `transactions`. As transações OFX já carregam sua data de ocorrência real no campo `occurred_at`, e a Engine de conciliação lidará com a varredura D+1. O alvo desta spec é barrar o despejo de OSs irrelevantes dentro da data alvo.
