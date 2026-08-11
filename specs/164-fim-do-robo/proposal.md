# Proposal: O Fim do Robô e Conciliação Híbrida (164)

## Problema
A dependência de robôs de scraping (Playwright) para coletar dados do "Oficina Inteligente" tornou-se um gargalo de instabilidade. O robô quebra, tem limitação de data e não consegue buscar de forma confiável o histórico de OSs pendentes (o "passivo" das lojas). Isso gera retrabalho e furos no fluxo de caixa diário, pois OSs antigas pagas hoje não dão match perfeitamente sem o histórico.

## Solução Proposta
Abolir os scrapers e implementar uma arquitetura híbrida de **"Estoque de OS"**:
1. **Marco Zero (Implantação de Saldo):** Importação de uma planilha legada (ex: `CONCILIAÇÃO 1008.xlsx`) que "fotografa" o saldo de D-1 (Dinheiro MP, A Receber, Negativo, Caixa Atual) e varre a aba "OS" para criar um passivo real (`estoque_os_pendente`) de tudo que está sem pagamento.
2. **Novo Wizard de Conciliação Diária:**
   - **Upload Bruto:** OFXs, Rede e Relatório OI (Excel exportado manualmente) do mês atual.
   - **Match Automático:** Cruzamento entre Rede e OI do mês atual (cartões). Soma dos OFX.
   - **Match Manual (A "Matadora"):** Tela UI de 2 colunas para baixar transações OFX (ex: PIX) que ficaram órfãs diretamente contra o Passivo de OS (`estoque_os_pendente`).
   - **Virada de Mês:** As OSs do Excel OI que chegarem no fim do mês sem baixa são transferidas automaticamente (`INSERT`) para a tabela `estoque_os_pendente`, renovando o ciclo.

## Contratos de Dados
- **Nova Tabela:** `estoque_os_pendente`
  - `id` (uuid, pk)
  - `store_id` (text, fk para `stores(id)`)
  - `numero_os` (text)
  - `data_os` (date)
  - `valor_os` (numeric)
  - `status` (text - 'PENDENTE' | 'PAGA')
  - `data_baixa` (timestampz, nulo até o match)
- **Modificação (reconciliations):**
  - Garantir inserção segura de `previous_balance` (`caixa_anterior`) e os campos manuais na tabela para fechamento diário, que será servido no "Marco Zero".
- **Mutações de Estado:**
  - O "Match Manual" dará um `UPDATE estoque_os_pendente SET status = 'PAGA', data_baixa = NOW() WHERE id = X`.

## API / Interface
- **Marco Zero (`MarcoZeroWizard.tsx` ou Aba Específica):** Upload da planilha legada, extraindo a aba "SALDO" (valores fixos para D-1) e a aba "OS" (filtrando as sem "PAGAMENTO") para `estoque_os_pendente`.
- **Wizard Diário (`CentralImportWizard.tsx` V3):**
  - Passo 1: Upload (OFX, Rede, Excel OI Mês Atual).
  - Passo 2: Match Automático (Lógica local React/JS).
  - Passo 3: Input Manual + Match de Passivo (Duas colunas: OFX Órfãos vs `estoque_os_pendente` do Banco).
  - Passo 4: Resumo Final e `INSERT` em batch no Supabase.
- **RPC:** Criar uma function `liquidar_os_passivo` (ou gerenciar no React e enviar updates em lote) para dar baixa nas OSs manuais simultaneamente ao salvamento do dia.

## Features Existentes Impactadas
- O atual `AgentRunnerModal` e fluxos de bots serão depreciados/removidos.
- Cálculos do painel diário (`ResumoDiaPanel.tsx` e `useConciliacao.ts`) deixarão de consultar `patio_os` instável para consultar o real `estoque_os_pendente` + `na_loja_mes_atual` dinâmico. (ref. [099-revert-manual-and-fix-patio], [096-fix-math-rage]).

## Risco Principal
- **Migração do Marco Zero:** Se o parser falhar na leitura exata das abas `SALDO` e `OS` devido a formatações exóticas (linhas puladas, células mescladas) na planilha legada, o passivo inicial ficará errado, corrompendo a base do novo sistema. (Mitigação: usar regex flexível no parser e checar os totais antes do COMMIT).
