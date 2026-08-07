# Proposal: Melhoria do Wizard de ImportaçÁo, Preview e Logs de GravaçÁo em Tempo Real (wizard-and-logs-enhancement)

## Problema
Atualmente, ao confirmar a importaçÁo na Central de ImportaçÁo (`CentralImportWizard.tsx`), o sistema exibe um alerta síncrono básico (`alert('ImportaçÁo Concluída!')`) e redireciona abruptamente para `/importacoes`. O usuário nÁo consegue visualizar o progresso da gravaçÁo no banco de dados, nem recebe métricas detalhadas dos registros gravados, nem possui um atalho direto para ir para a tela de ConciliaçÁo. Além disso, as telas de Preview e Mapeamento do Wizard precisavam de uma refatoraçÁo visual mais moderna, limpa e alinhada às diretrizes de design (Dark UI sólido, cards sem glassmorphism, contagens claras por loja).

## SoluçÁo Proposta
1. **Novo Step 4 no Wizard — Feed de Logs de GravaçÁo em Tempo Real (Terminal UI):**
   - Ao clicar em "Confirmar e Gravar ImportaçÁo", o Wizard avança para o `Step 4`.
   - Exibe uma janela estilo Terminal Headless/Dark UI (`bg-[#050711]`) com animaçÁo e feed de logs linha a linha reportando o progresso da gravaçÁo (OSs, relatórios da Rede, extrato OFX e conciliações automáticas).
2. **Painel de Sucesso & Redirecionamento Direto para ConciliaçÁo:**
   - Ao término do feed de logs, exibe um painel de celebraçÁo com resumo estatístico das movimentações gravadas.
   - Fornece um botÁo primário proeminente: **"Ir para a Tela de ConciliaçÁo"** (redireciona para `/conciliacao`), além de um botÁo secundário para ver o histórico em `/importacoes`.
3. **RefatoraçÁo Visual da Tela de Preview e Mapeamento (Step 1, 2 e 3):**
   - Reestruturar a visualizaçÁo do Step 3 (Preview) com cards estatísticos modernos (`AnimatedNumber`), separaçÁo cristalina por loja e colunas dedicadas para OSs, Maquininha e Banco OFX.
   - Melhorar o Mapeamento de Lojas (Step 2) com Badges indicando a origem do arquivo (`OS`, `Rede`, `OFX`) e indicaçÁo visual de auto-match.

## Contratos de Dados
- NÁo há alterações no schema de banco de dados do Supabase. Mutações existentes (`useBulkInsertTransactions`, `useCreateImportBatch`, `useBulkInsertConciliationMatches`, `savePatioOsAndReceivables`) continuam sendo utilizadas com tratamento progressivo de logs.

## Features Existentes Impactadas
- `src/components/importacoes/CentralImportWizard.tsx`
- `src/routes/importacoes.tsx`

## Risco Principal
Garantir que a transiçÁo para o Step 4 (Logs) ocorra de forma síncrona com o início da gravaçÁo, mantendo o controle de estados sem travar a interface e sem perder registros em caso de exceçÁo no banco.
