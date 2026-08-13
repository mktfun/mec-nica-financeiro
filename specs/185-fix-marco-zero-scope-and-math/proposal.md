# Proposal: Isolamento de Data do Marco Zero e Ajuste de Matemática Incremental na Conciliação (185)

## Problema
Após importar o Marco Zero para um dia específico (ex: dia 10/08/2026), dois erros graves ocorrem:
1. **Contaminação de Outros Dias:** Dias anteriores (do dia 01 ao dia 09) passam a exibir dados e OSs do Marco Zero. Isso acontece porque as OSs estavam sendo gravadas com suas datas de abertura antigas (`os.data_os`), e as rotinas do sistema usam a trava `opened_at <= p_date`, fazendo a pendência vazar para todos os dias anteriores de agosto.
2. **Rombo de -1.36 Milhão na Conciliação Diária:** Ao abrir a tela de Conciliação Diária no dia 10/08/2026, a `Diferença Final` aponta **-R$ 1.363.867,91** (em vez do **-R$ 0,27** que apareceu no preview da planilha). Isso ocorre por dois fatores:
   - O `ResumoDiaPanel.tsx` não lia o `caixa_anterior` (186k) nem o `faturamento_anterior` (208k) salvos no `metadata` do snapshot do dia 10 quando não há snapshot no dia 09.
   - O cálculo do `valor_disp_contas` na biblioteca `modulo1Calculations.ts` não aplicava o Faturamento Incremental do Período (`faturamento_atual - faturamento_anterior`), que é o modelo matemático oficial da planilha da oficina.

## Solução Proposta
1. **Isolamento de Data do Marco Zero (`MarcoZeroWizard.tsx`):**
   - Garantir que todas as OSs importadas pelo Marco Zero sejam salvas com `opened_at = targetDate` (a data selecionada para a implantação, ex: 10/08/2026). Assim, dias anteriores a essa data não verão nenhuma OS do Marco Zero.
2. **Leitura dos Valores Anteriores (`ResumoDiaPanel.tsx`):**
   - Atualizar a hidratação de `faturamentoAnteriorGlobal` e `caixaAnteriorGlobal` para ler do `metadata` do snapshot atual (`currentSnapshot?.metadata?.faturamento_anterior` e `currentSnapshot?.metadata?.caixa_anterior`) como fallback quando o dia anterior não possuir snapshot gravado.
3. **Fórmula Matemática do Período (`modulo1Calculations.ts`):**
   - Atualizar `calculateGlobalConciliacao` para computar `faturamento_periodo = faturamento_atual - faturamento_anterior` e usar `valor_disp_contas = faturamento_periodo - fluxo_cx`.
   - Isso reproduz a matemática da planilha da oficina com precisão de centavos (Caixa: 222.7k, Fluxo: 36.4k, Disponível: 12.3k, Diferença: **-R$ 0,27**).

## Contratos de Dados
- Nenhuma alteração em tabelas do Supabase.
- Utilização dos campos existentes `metadata.caixa_anterior` e `metadata.faturamento_anterior` em `daily_snapshots`.

## API / Interface
- `handleSave` em `src/components/importacoes/MarcoZeroWizard.tsx`
- `ResumoDiaPanel.tsx` em `src/components/conciliacao/ResumoDiaPanel.tsx`
- `calculateGlobalConciliacao` em `src/lib/modulo1Calculations.ts`

## Features Existentes Impactadas
- Implantação Marco Zero
- Tela de Conciliação Diária (`/conciliacao`)
- Relatório por Loja

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Totalmente Reversível
- **Mitigação:** Validação direta com os valores reais da planilha (Caixa: 222.798,65, Diferença: -0,27).
