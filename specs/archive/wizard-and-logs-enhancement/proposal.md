# Proposal: Melhoria do Wizard de Importação, Preview e Logs de Gravação em Tempo Real (wizard-and-logs-enhancement)

## Problema
Atualmente, ao confirmar a importação na Central de Importação (`CentralImportWizard.tsx`), o sistema exibe um alerta síncrono básico (`alert('Importação Concluída!')`) e redireciona abruptamente para `/importacoes`. O usuário não consegue visualizar o progresso da gravação no banco de dados, nem recebe métricas detalhadas dos registros gravados, nem possui um atalho direto para ir para a tela de Conciliação. Além disso, as telas de Preview e Mapeamento do Wizard precisavam de uma refatoração visual mais moderna, limpa e alinhada às diretrizes de design (Dark UI sólido, cards sem glassmorphism, contagens claras por loja).

## Solução Proposta
1. **Novo Step 4 no Wizard — Feed de Logs de Gravação em Tempo Real (Terminal UI):**
   - Ao clicar em "Confirmar e Gravar Importação", o Wizard avança para o `Step 4`.
   - Exibe uma janela estilo Terminal Headless/Dark UI (`bg-[#050711]`) com animação e feed de logs linha a linha reportando o progresso da gravação (OSs, relatórios da Rede, extrato OFX e conciliações automáticas).
2. **Painel de Sucesso & Redirecionamento Direto para Conciliação:**
   - Ao término do feed de logs, exibe um painel de celebração com resumo estatístico das movimentações gravadas.
   - Fornece um botão primário proeminente: **"Ir para a Tela de Conciliação"** (redireciona para `/conciliacao`), além de um botão secundário para ver o histórico em `/importacoes`.
3. **Refatoração Visual da Tela de Preview e Mapeamento (Step 1, 2 e 3):**
   - Reestruturar a visualização do Step 3 (Preview) com cards estatísticos modernos (`AnimatedNumber`), separação cristalina por loja e colunas dedicadas para OSs, Maquininha e Banco OFX.
   - Melhorar o Mapeamento de Lojas (Step 2) com Badges indicando a origem do arquivo (`OS`, `Rede`, `OFX`) e indicação visual de auto-match.

## Contratos de Dados
- Não há alterações no schema de banco de dados do Supabase. Mutações existentes (`useBulkInsertTransactions`, `useCreateImportBatch`, `useBulkInsertConciliationMatches`, `savePatioOsAndReceivables`) continuam sendo utilizadas com tratamento progressivo de logs.

## Features Existentes Impactadas
- `src/components/importacoes/CentralImportWizard.tsx`
- `src/routes/importacoes.tsx`

## Risco Principal
Garantir que a transição para o Step 4 (Logs) ocorra de forma síncrona com o início da gravação, mantendo o controle de estados sem travar a interface e sem perder registros em caso de exceção no banco.
