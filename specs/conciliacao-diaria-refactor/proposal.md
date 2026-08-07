# Proposal: Refatoração da Conciliação Diária (conciliacao-diaria-refactor)

## Problema
A tela de conciliação atual permite a edição de campos como "Dinheiro MP" e calcula os totais baseados nisso, mas faltam diversos campos essenciais para o fluxo de caixa diário real da operação. Além disso, os inputs manuais devem ser coletados *durante* a importação (CentralImportWizard) para que o fechamento da conciliação seja apenas read-only (visualização e gravação de totais finais).

## Solução Proposta
1. **Inputs Manuais na Importação**: Mover a captura de valores manuais diários limitados (Dinheiro MP, A Receber [boletos/descontos], Outros Faturamentos, Contas a Pagar, Provisão) para o `CentralImportWizard.tsx`, em um novo Step antes de salvar.
2. **Dados Extraídos do Arquivo**: Saldo Negativo vem diretamente do OFX (Itaú). Juros REDE vêm do arquivo da REDE em reais.
3. **Cálculos Baseados na Conciliação Anterior**: O Fluxo CX e o Faturamento usam os dados da *última conciliação* registrada (não importando quantos dias atrás foi), prevenindo falhas de fim de semana/feriado. O Faturamento avalia a diferença do faturamento acumulado no mês hoje vs o faturamento acumulado na conciliação anterior.
4. **Armazenamento**: Adicionar colunas necessárias na tabela `daily_snapshots`.
5. **UI ResumoDiaPanel**: Remover `<input>` do componente e redesenhar os cards inferiores para apresentar os cálculos exatos solicitados, destacando a "Diferença" com formatação verde/vermelha (+/- R$ 50).

## Contratos de Dados
**Alteração em `daily_snapshots`:**
Novas colunas a adicionar:
- `a_receber_manual` (numeric)
- `faturamento_outros_valor` (numeric)
- `faturamento_outros_desc` (text)
- `contas_a_pagar` (numeric)
- `provisao` (numeric)
*(Nota: Saldo negativo e juros não precisam ser inseridos como colunas manuais isoladas, mas devem ser processados dos arquivos)*

## API / Interface
- `useSaveDailySnapshot`: Modificar para aceitar os novos campos.
- `CentralImportWizard.tsx`: Adicionar "Passo 4: Valores Globais" com formulário para os inputs restantes. O `handleConfirm` atualiza o `daily_snapshots`.
- `ResumoDiaPanel.tsx`: Substituir input por texto read-only. Adicionar painel inferior redesenhado (Card Grande + Card Verde "Diferença").
- `modulo1Calculations.ts`: Atualizar as fórmulas para refletirem as definições matemáticas exatas da Proposal (Fluxo CX usando a *Conciliação Anterior*, Faturamento atual - faturamento da *Conciliação Anterior*).

## Risco Principal
Os cálculos dependem de dados do `daily_snapshots` da **última conciliação fechada** (para Fluxo CX e Faturamento). A manipulação de `usePreviousDaySnapshot` precisa estar robusta no painel de Resumo e garantir fallback seguro (0) caso seja a primeira conciliação do mês.
