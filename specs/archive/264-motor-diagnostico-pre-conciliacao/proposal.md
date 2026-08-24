# Proposal: Motor de Diagnóstico Pré-Conciliação no Step 3 (264)

## Problema

No fluxo atual de importação (`CentralImportWizard.tsx`), o Step 3 exibe o preview dos dados importados — OSs, maquininha, OFX — mas **o operador não sabe se os números fecham antes de confirmar**. A diferença financeira só aparece depois de gravar tudo (Step 4), quando é tarde demais para corrigir sem manualidade. O operador precisa abrir a tela de conciliação, navegar para o painel, e caçar a diferença sozinho.

O pedido do usuário: **"antes de terminar os matches e os krl na tela de importação lá mesmo"** — ou seja, ainda no Step 3, antes do botão Confirmar, o sistema deve calcular, comparar com o histórico e **diagnosticar em qual fonte está a diferença** — sem cara de IA, sem bots visíveis, sem interface robótica.

## Solução Proposta

Adicionar um **Painel de Diagnóstico de Fechamento** no Step 3 do `CentralImportWizard.tsx`, renderizado logo acima do botão "Confirmar e Gravar".

O painel:
1. **Calcula automaticamente** o Caixa Atual projetado com os dados do preview ainda não gravados
2. **Busca o histórico** dos últimos 5 dias úteis em `daily_snapshots` para benchmarking por fonte
3. **Compara fonte a fonte** (Pátio, Banco OFX, Dinheiro/MP, A Receber, Contas) contra o padrão histórico
4. **Exibe diagnóstico visual limpo** — sem linguagem de bot, sem balões de chat — apenas um card de auditoria com semáforo por fonte e, se houver diferença > threshold, uma linha de suspeita específica
5. **Permite input mínimo** direto no card: se a suspeita apontar uma OS ou valor, o operador pode confirmar/corrigir inline sem sair do Step 3

### O que NÃO será feito:
- Nada de balões de chat, assistentes ou linguagem estilo "Olá, sou a IA..."
- Nada de ações automáticas — o motor apenas lê e diagnostica
- Nada de novo modal — fica embutido no Step 3 existente

## Contratos de Dados

### Tabelas envolvidas (somente leitura no Step 3):
- `daily_snapshots` — histórico dos últimos 5 dias úteis: `saldo_bancario`, `dinheiro_mp`, `a_receber_manual`, `total_patio`, `contas_a_pagar`, `juros_rede`, `faturamento`
- `patio_os` — OSs ativas para cruzamento com as importadas (já buscada pelo `detectMissingOs` existente)

### Nenhuma tabela nova. Nenhum INSERT/UPDATE no Step 3.

### Campos calculados no frontend (sem chamada extra ao banco):
```typescript
interface DiagnosticResult {
  // Caixa projetado com os dados do preview atual
  projectedCaixaAtual: number;        // totalOfxIn + manualDinheiroMp + manualAReceber + totalPatioEstoqueGlobal
  projectedContas: number;            // contasManual + jurosRedeTotal estimado
  projectedDiff: number;              // projetado vs histórico médio

  // Por fonte
  sources: DiagnosticSource[];        // array com 4–5 fontes

  // Suspeita principal (se threshold ultrapassado)
  mainSuspect: DiagnosticSource | null;
  isWithinThreshold: boolean;         // |projectedDiff| <= threshold
  threshold: number;                  // max(500, faturamentoMedio * 0.02)
}

interface DiagnosticSource {
  key: 'patio' | 'banco' | 'dinheiro' | 'a_receber' | 'contas';
  label: string;
  currentValue: number;         // valor calculado do preview
  historicAvg: number;          // média dos últimos 5 dias
  deviation: number;            // currentValue - historicAvg
  deviationPct: number;         // deviation / historicAvg * 100
  status: 'ok' | 'warning' | 'alert';
}
```

### Busca histórica (1 query, somente leitura):
```sql
SELECT saldo_bancario, dinheiro_mp, a_receber_manual, total_patio, contas_a_pagar, juros_rede, faturamento
FROM daily_snapshots
WHERE date < :targetDate
ORDER BY date DESC
LIMIT 5
```

## API / Interface

### Hook novo: `useDiagnosticEngine`
- **Localização:** `src/hooks/useDiagnosticEngine.ts`
- **Input:** valores já calculados no wizard (`totalOfxIn`, `totalPatioEstoqueGlobal`, `manualDinheiroMp`, `manualAReceber`, `contasManual`, `targetDate`)
- **Output:** `DiagnosticResult | null`
- Roda somente quando `step === 3` e os dados de OS estão carregados (`isLoadingMissingOs === false`)
- Faz 1 query ao Supabase para buscar o histórico de 5 dias

### Componente novo: `DiagnosticPanel`
- **Localização:** `src/components/importacoes/DiagnosticPanel.tsx`
- **Props:** `{ diagnostic: DiagnosticResult | null; isLoading: boolean; onManualInput?: (key, value) => void }`
- **Integração:** renderizado dentro do `{step === 3 && (...)` do `CentralImportWizard.tsx`, logo acima dos botões de ação do Step 3

### Design do componente (sem cara de IA):
- Título: **"Auditoria de Fechamento"** (não "Análise da IA")
- Card sóbrio com borda `border-zinc-700`, fundo `bg-zinc-900`, fontes Inter
- Tabela compacta com 5 linhas (uma por fonte), colunas: Fonte | Valor Atual | Média 5 dias | Variação | Status
- Status via ícone simples: `✓` verde (ok), `△` âmbar (atenção), `✕` vermelho (alerta)
- Se `mainSuspect !== null` e `!isWithinThreshold`: uma linha de destaque âmbar abaixo da tabela com o texto exato da suspeita (ex: "Pátio: R$ 14.900 acima da média — verifique OSs não lançadas ou valores editados")
- Sem emoji excessivo, sem gradientes coloridos, sem animações chamativas — aparência de planilha de auditoria

## Features Existentes Impactadas

- `CentralImportWizard.tsx` — recebe o `DiagnosticPanel` no Step 3 sem alterar nenhuma lógica existente
- `allPreviewOsList` / `totalOs` / `totalPatioEstoqueGlobal` / `totalOfxIn` — apenas lidos, não modificados
- `missingOsList` + `detectMissingOs` — o diagnóstico aguarda `isLoadingMissingOs === false` para garantir que as OSs ausentes já foram detectadas e seus valores já estão no `allPreviewOsList`
- `manualDinheiroMp` / `manualAReceber` — lidos como inputs já existentes no Step 3

## Risco Principal

**Diagnóstico errado por timing:** O motor pode rodar antes do operador terminar de preencher `manualDinheiroMp` e `manualAReceber` — exibindo falsa divergência na fonte "Dinheiro/MP". Mitigação: o `DiagnosticPanel` exibe uma nota inline "Valores manuais ainda não preenchidos — o diagnóstico considera zero para estas fontes" e recalcula reativo a qualquer mudança nos inputs.
