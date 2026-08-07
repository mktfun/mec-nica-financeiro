# Proposal: RefatoraçÁo da ConciliaçÁo Diária (conciliacao-diaria-refactor)

## Problema
A tela de conciliaçÁo atual permite a ediçÁo de campos como "Dinheiro MP" e calcula os totais baseados nisso, mas faltam diversos campos essenciais para o fluxo de caixa diário real da operaçÁo. Além disso, os inputs manuais devem ser coletados *durante* a importaçÁo (CentralImportWizard) para que o fechamento da conciliaçÁo seja apenas read-only (visualizaçÁo e gravaçÁo de totais finais).

## SoluçÁo Proposta
1. **Inputs Manuais na ImportaçÁo**: Mover a captura de valores manuais diários limitados (Dinheiro MP, A Receber [boletos/descontos], Outros Faturamentos, Contas a Pagar, ProvisÁo) para o `CentralImportWizard.tsx`, em um novo Step antes de salvar.
2. **Dados Extraídos do Arquivo**: Saldo Negativo vem diretamente do OFX (Itaú). Juros REDE vêm do arquivo da REDE em reais.
3. **Cálculos Baseados na ConciliaçÁo Anterior**: O Fluxo CX e o Faturamento usam os dados da *última conciliaçÁo* registrada (nÁo importando quantos dias atrás foi), prevenindo falhas de fim de semana/feriado. O Faturamento avalia a diferença do faturamento acumulado no mês hoje vs o faturamento acumulado na conciliaçÁo anterior.
4. **Armazenamento**: Adicionar colunas necessárias na tabela `daily_snapshots`.
5. **UI ResumoDiaPanel**: Remover `<input>` do componente e redesenhar os cards inferiores para apresentar os cálculos exatos solicitados, destacando a "Diferença" com formataçÁo verde/vermelha (+/- R$ 50).

## Contratos de Dados
**AlteraçÁo em `daily_snapshots`:**
Novas colunas a adicionar:
- `a_receber_manual` (numeric)
- `faturamento_outros_valor` (numeric)
- `faturamento_outros_desc` (text)
- `contas_a_pagar` (numeric)
- `provisao` (numeric)
*(Nota: Saldo negativo e juros nÁo precisam ser inseridos como colunas manuais isoladas, mas devem ser processados dos arquivos)*

## API / Interface
- `useSaveDailySnapshot`: Modificar para aceitar os novos campos.
- `CentralImportWizard.tsx`: Adicionar "Passo 4: Valores Globais" com formulário para os inputs restantes. O `handleConfirm` atualiza o `daily_snapshots`.
- `ResumoDiaPanel.tsx`: Substituir input por texto read-only. Adicionar painel inferior redesenhado (Card Grande + Card Verde "Diferença").
- `modulo1Calculations.ts`: Atualizar as fórmulas para refletirem as definições matemáticas exatas da Proposal (Fluxo CX usando a *ConciliaçÁo Anterior*, Faturamento atual - faturamento da *ConciliaçÁo Anterior*).

## Risco Principal
Os cálculos dependem de dados do `daily_snapshots` da **última conciliaçÁo fechada** (para Fluxo CX e Faturamento). A manipulaçÁo de `usePreviousDaySnapshot` precisa estar robusta no painel de Resumo e garantir fallback seguro (0) caso seja a primeira conciliaçÁo do mês.
