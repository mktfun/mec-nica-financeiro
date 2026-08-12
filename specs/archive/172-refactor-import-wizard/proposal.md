# Proposal: Refatoração de UI/UX do Wizard e JSON Trail (172)

## Problema
O fluxo da Central de Importação está causando forte confusão no usuário por conta do aparecimento indevido do modal de Agente durante a importação manual de arquivos, passando a falsa impressão de que a automação (bot) está tentando assumir o controle. Além disso, os logs textuais do passo final (Step 4) parecem ultrapassados em relação à nova UI animada construída para o bot, e a tela em geral precisa de um "banho de loja". Por fim, faltam recursos de auditoria para o administrador poder inspecionar os cálculos e valores finais que estão sendo lançados no banco após o parser fazer o processamento.

## Solução Proposta
1. **Desacoplar AgentRunnerModal do fluxo local**: Arquivos arrastados não devem abrir modal de agente. Em vez disso, passarão pelo processamento rápido transparente (Step 1 -> Preview Step 3 -> Step 3.5).
2. **Reaproveitar o UI do AgentRunner inline no Step 4**: Transformar o console de log textual em um console visual de stages com `AgentStageItem` (framer-motion, ícones Lucide) integrado *dentro* do painel do Passo 4, e não mais como um pop-up assustador.
3. **Download de JSON Trail**: Gerar um payload com as informações completas da importação (`osFiles`, `ofxFiles`, saldos, mapping das lojas, manual inputs) e liberar o download na tela de Sucesso do Wizard em formato `.json`.
4. **Premium Design na Importação**: Redesenhar a interface principal (`CentralImportWizard`), modernizando o dropzone, os steps de cabeçalho, e o sumário, abandonando interfaces simples para algo mais elegante (dark mode, glass effects leves de contorno se possível, paleta primária mais vibrante).

## Contratos de Dados
- Nenhuma alteração no Supabase nesta feature. As rotinas e tipos permanecem idênticos, as mudanças são exclusivamente de Frontend e de fluxo stateful (React).

## API / Interface
- Adição de novo estado em `CentralImportWizard` para armazenar `auditTrail` JSON Blob object url.
- Transformação do `importLogs` textual em um array stateful de tipagem compatível com os stages (`AgentStage`).

## Features Existentes Impactadas
- `src/components/importacoes/CentralImportWizard.tsx` (Principal área de impacto)
- Lógica do `useCentralImport` não sofre impacto, pois apenas a UX que dispara ela muda.

## Risco Principal
- **Probabilidade**: Baixa.
- **Impacto**: Parcialmente reversível (Falha visual).
- **Mitigação**: O maior risco é quebrar o pipeline sequencial de Promises durante a UI de salvamento, fazendo o botão ficar girando ad infinitum caso um Stage não seja marcado como "completed" após a Promise do backend resolver. Devemos atrelar os updates de estado rigorosamente com `await` e re-ativar o botão de fallback se der erro.
