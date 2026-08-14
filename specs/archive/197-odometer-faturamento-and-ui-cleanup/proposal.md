# Proposal: Odometer Faturamento Logic, Read-Only Locks & UI Cleanup (197)

## Problema
1. **Divergência na Regra de Faturamento:** O faturamento inserido pelo operador na verdade funciona como a leitura de um "odômetro" (leitura bruta acumulada do mês até hoje). O faturamento real (líquido) do dia deve ser a diferença incremental: `Faturamento Líquido (Dia) = Faturamento Acumulado Hoje (Input) - Faturamento Acumulado de Ontem (Ant)`. O sistema estava tratando inputs diretos de forma inconsistente sem preservar a leitura acumulada como base para o dia seguinte.
2. **Edição Não-Bloqueada no Painel:** Os campos manuais no `ResumoDiaPanel.tsx` (Dinheiro MP, A Receber, Contas Manual) permitiam alteração inline direta sem confirmação explícita de edição (`isEditing`), gerando poluição visual, acidentes de digitação e re-renderizações indesejadas.
3. **Poluição Visual no Modal de Importação:** O modal de importação (`CentralImportWizard.tsx`) possui acúmulo de steppers redundantes e blocos de logs técnicos expostos na tela principal, causando atrito visual e lentidão de renderização.

## Solução Proposta
1. **Lógica de Faturamento Odômetro:**
   - No `src/lib/modulo1Calculations.ts` e `src/components/conciliacao/ResumoDiaPanel.tsx`, implementar a fórmula exata:
     $$\text{Faturamento Líquido (Dia)} = \text{Faturamento Acumulado Hoje} - \text{Faturamento Acumulado Anterior (Ant)}$$
   - Persistir o `Faturamento Acumulado Hoje` no banco de dados (`daily_snapshots.faturamento`) para servir como o `Ant` do dia seguinte.
   - Utilizar o `Faturamento Líquido (Dia)` no fechamento: `Valor Disp. Contas = Faturamento Líquido (Dia) - Fluxo de Caixa`.
2. **Modo Leitura com Trava de Edição (`isEditing`):**
   - No `ResumoDiaPanel.tsx`, criar estado `isEditing = false` por padrão.
   - Quando `isEditing === false`, renderizar os valores manuais (Faturamento Acumulado, Dinheiro MP, A Receber, Contas Manual) como texto e badges formatados em Dark UI sólido, exibindo apenas o botão "Editar Fechamento".
   - Quando `isEditing === true`, exibir inputs numéricos com botões de ação "Salvar Alterações" e "Cancelar" (que reverte aos valores salvos).
3. **Faxina e Padronização no Modal de Importação:**
   - Remover os steppers lineares redundantes do topo da tela.
   - Mover logs técnicos e mensagens de console para um drawer/painel colapsável monospaced (Logs de Depuração) sob demanda.
   - Centralizar a interface nos **cards dos agentes** por loja (status limpo, progresso e validação unificada).

## Contratos de Dados
- **Tabelas Supabase Envolvidas:**
  - `daily_snapshots`: Gravação e leitura de `faturamento` (leitura acumulada), `dinheiro_mp`, `a_receber_manual`, `contas_a_pagar`, `juros_rede`, `caixa_atual`.
  - `reconciliations`: Gravação de status e `na_loja_os`.
- **Mutações de Estado:**
  - `saveDailySnapshot.mutateAsync`: Grava o snapshot com `faturamento = faturamentoAcumuladoHoje`.
  - RLS existente respeitada sem necessidade de alterações DDL destrutivas.

## API / Interface
- **Funções TypeScript:**
  - `calculateGlobalConciliacao(input: GlobalConciliacaoInput)`: Garante `faturamento_periodo = faturamento_anterior > 0 ? (faturamento_atual - faturamento_anterior) : faturamento_atual`.
- **Componentes React:**
  - `src/components/conciliacao/ResumoDiaPanel.tsx`: Modo leitura por padrão, toggle `isEditing`, inputs controlados com reversão em "Cancelar".
  - `src/components/importacoes/CentralImportWizard.tsx`: Limpeza de steppers no topo, encapsulamento de logs técnicos em accordion/drawer colapsável.

## Features Existentes Impactadas
- `specs/global/features.md`:
  - `Painel de Conciliação Global (ResumoDiaPanel)`: Leitura por padrão, cálculo por odômetro.
  - `Wizard de Importação Centralizada (CentralImportWizard)`: Interface simplificada e fluida.

## Risco Principal
- **Risco:** O usuário digitar um faturamento acumulado menor que o anterior (ex: erro de digitação gerando faturamento negativo).
  - **Probabilidade:** Baixa
  - **Impacto:** Reversível
  - **Mitigação:** Alerta visual na UI caso `Faturamento Acumulado Hoje < Faturamento Anterior`, destacando em tom de aviso para conferência antes de salvar.
