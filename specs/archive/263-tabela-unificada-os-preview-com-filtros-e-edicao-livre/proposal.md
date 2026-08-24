# Proposal: Tabela Unificada de OSs no Preview com Filtros Rápidos e Edição Livre (263)

## Problema
1. **Omissão Completa da Tabela no Preview:**
   - Na Spec 262, ao tentar isolar apenas as OSs ausentes (`missingOsList.length > 0`), quando o lote importado não continha OSs ausentes do banco, a tabela inteira deixava de ser renderizada.
   - O operador chegou ao Step 3 com 293 OSs carregadas (R$ 683.475,88) nos cards de resumo, mas sem nenhuma tabela na tela para conferir, pesquisar ou auditar o **Valor Total** e **Total Pago** das ordens de serviço.
2. **Necessidade de Visibilidade Total + Filtro de Ausentes:**
   - O operador precisa ver a lista de OSs no Step 3 para poder alterar o valor total e o valor pago de qualquer OS.
   - Ao mesmo tempo, precisa de um filtro direto e intuitivo para alternar entre **"Todas as OSs"**, **"Apenas Ausentes no Relatório"**, **"Pagamentos do Dia"** e **"Em Aberto no Pátio"**, sem sumir com a interface.

## Solução Proposta
1. **Renderização Permanente da Tabela de Ordens de Serviço no Step 3:**
   - A tabela de Ordens de Serviço é sempre renderizada no Step 3 quando houver OSs importadas ou ativas no banco.
2. **Abas / Pílulas de Filtro Rápido:**
   - `Todas as OSs ({total})`: visualização completa com paginação e busca.
   - `Ausentes no Relatório ({count})`: filtra exclusivamente as OSs ativas no banco que não vieram na planilha do mês.
   - `Recebimentos do Dia ({count})`: filtra as OSs que tiveram pagamento/baixa hoje (`paid_value > 0`).
   - `Estoque em Pátio ({count})`: filtra as OSs pendentes (`em_aberto` ou `pago_parcial`).
3. **Edição Inline Direta:**
   - Inputs editáveis para: **Valor Total OS (R$)**, **Total Pago (R$)** e seletor de **Status** (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`).
   - Cálculo em tempo real do **Saldo Pendente** (`Math.max(0, total_value - paid_value)`).
   - Badge identificador de origem: `[Planilha do Dia]`, `[Ausente no Relatório]` ou `[Editado]`.
   - Busca instantânea por placa, número da OS ou nome da filial.
4. **Sincronização e Persistência:**
   - Toda edição atualiza reativamente os reducers do preview (`totalOs`, `totalPatioEstoqueGlobal`, previsões por loja) e é persistida em `patio_os`, `reconciliations` e `daily_snapshots` durante `executeDailyClosing`.

## Contratos de Dados
- `results.osFiles` e `missingOsList`:
  - Unificados no hook de visualização com flag `is_missing: boolean` e `is_edited: boolean`.
- `patio_os`:
  - Gravação de todas as OSs importadas e atualizações das OSs ausentes/editadas.

## API / Interface
- `src/components/importacoes/CentralImportWizard.tsx`:
  - Unificação do estado de exibição das OSs com filtros por aba, loja e busca textual.
  - Inputs numéricos e seletores de status na tabela com recálculo reativo.

## Features Existentes Impactadas
- Feature 260: Pareamento Inteligente de OSs Pendentes.
- Feature 261: Saldo Total Bancário OFX.

## Risco Principal
- **Risco:** Descompasso de paginação ao alternar entre as abas de filtro.
- **Mitigação:** Resetar a página atual para `1` sempre que o usuário mudar a aba de filtro, filtro de loja ou termo de busca.
