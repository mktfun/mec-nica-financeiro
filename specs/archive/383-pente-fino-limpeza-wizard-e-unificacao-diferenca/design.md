# Design: Pente Fino, Limpeza Visual do Wizard e Unificação da Diferença Contábil (383)

## Arquitetura e Fluxo de Dados
A higienização de interface e unificação matemática unifica a visualização entre o Wizard de Importação (`/importacoes`) e o Painel Principal de Conciliação (`/conciliacao`):

```
[CentralImportWizard - Step 1 (Preview)]
  └─ Foco exclusivo em: "Valores Manuais do Dia" (Odômetro, Dinheiro MP, A Receber, Contas)
  └─ ELIMINADOS: 3 cards do topo, card intermediário de receitas extras e inspetor JSON

[CentralImportWizard - Conclusão Pós-Gravação]
  └─ Foco exclusivo em: Ícone de Sucesso + Mensagem de confirmação + Ações diretas
  └─ ELIMINADOS: Grid de 4 contagens de lote e banner de auto-healing com deltas assustadores

[Step4FinalAuditAndClose - Fechamento Definitivo]
  └─ ELIMINADOS: Canal 1 (Tesouraria Real) e Canal 2 (Produção WIP ΔP4)
  └─ GRID 1: Ativos de Caixa (Saldo Bancos + Cofre, Dinheiro MP, A Receber, Pátio)
  └─ GRID 2: Fluxo Contábil & DRE (Caixa Atual, Caixa Anterior, Fluxo de Caixa, Faturamento, Valor Disponível, Contas a Cobrir)
  └─ HERO PLACAR: Diferença Final Apurada rigorosamente idêntica ao ResumoDiaPanel
```

## Interfaces TypeScript

Não há novas interfaces externas. As tipagens existentes em `src/hooks/useBackendConciliacao.ts` (`DailyReconciliationSummary`) e `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` (`Step4FinalAuditAndCloseProps`) permanecem com contratos estritos:

```typescript
export interface CalculatedClosingMetrics {
  totalSaldoBanco: number;
  saldoBancosPositivo: number;
  saldoNegativoItau: number;
  dinheiroMp: number;
  aReceber: number;
  naLojaOs: number;
  faturamentoDia: number;
  fatAnterior: number;
  odometroHoje: number;
  faturamentoPeriodo: number;
  caixaAtual: number;
  caixaAnterior: number;
  fluxoCaixa: number;
  valorDispContas: number;
  jurosRede: number;
  contasFinal: number;
  subtotalContas: number;
  diferencaFinal: number;
  isOk: boolean;
  isWarning: boolean;
}
```

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/CentralImportWizard.tsx`
- **Remover Bloco 1 (Topo Step 1):** Eliminar o grid `grid-cols-1 md:grid-cols-3 gap-4` contendo os 3 cards (*Total OS*, *Maquininha*, *Saldo Total Bancário*).
- **Remover Bloco 2 (Meio Step 1):** Eliminar `<RevenueAdjustmentsCard ... />` do Step 1 (permanece acessível em Justificativas).
- **Remover Bloco 3 (Rodapé Step 1):** Eliminar `<details className="group p-4 bg-zinc-950 rounded-xl ...">` com o Inspetor de Conciliação JSON e o botão de copiar JSON.
- **Remover Bloco 4 (Tela Conclusão):** Na condicional `saveFinished ?`, remover o grid de 4 cards (`totalOsCount`, `totalRedeCount`, `totalOfxCount`, `formattedTargetDate`) e o container `autoHealingData`. Manter apenas o ícone, o texto limpo de sucesso e os botões de navegação.

### 2. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`
- **Remover Painel Bicanal:** Excluir os cards de *Canal 1: Tesouraria Líquida Real* e *Canal 2: Balanço de Produção & WIP*.
- **Estruturação da DRE e Ativos:** Exibir os 4 cards de Ativos de Caixa e a equação contábil limpa.
- **Placar de Diferença Unificado:** Usar exatamente a fórmula canônica:
  ```typescript
  const diferencaFinal = valorDispContas - subtotalContas;
  ```
  Sem divergência entre Step 4 e o Painel de Conciliação Diária.
- **Textos de Ajuda:** Corrigir a mensagem de dica orientando: *"Dica: Se necessário, clique em 'Voltar para Ajustar' para revisar vínculos ou justificativas."*

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Visual Step 1):** Carregar o Step 1 do Wizard. Verificar que não há os 3 cards incorretos no topo, que o card de receitas extras intermediário não aparece e que o payload JSON não está exposto. O foco deve ser 100% nos *Valores Manuais do Dia*.
- **Cenário 2 (Visual Conclusão):** Ao concluir o salvamento de um lote, verificar que a tela exibe uma mensagem de sucesso limpa sem o card de deltas de auto-healing residual nem os 4 cards de contagem de lote.
- **Cenário 3 (Visual e Numérico Step 4):** Carregar o Step 4. Verificar ausência de Canal 1 e Canal 2. Conferir se a Diferença Final Apurada, o Faturamento e o Subtotal de Contas coincidem com o Painel de Conciliação (`/conciliacao`).
- **Cenário 4 (Build Gate):** Executar `npm run build` comprovando 0 erros TypeScript.
