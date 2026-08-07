# Design: Fix OFX Target Date Accumulation (082)

## Arquitetura Técnica
1. `CentralImportWizard.tsx`: Durante o parseamento e injeção do OFX (bloco de iterar `results.ofxItems.forEach`), o campo `target_date` é preenchido. Em vez de herdar de forma fixa o `targetDate` do estado do React (que representa a data em que a importação está sendo executada), ele deve extrair a data real da transação (`tx.date`), e fazer o trim da hora usando `.split('T')[0]`.
2. `ResumoDiaPanel.tsx`: A interface de Conciliação possui cards de leitura que montam o cenário do fechamento. O card com título "SALDO BANCO ITAÚ" (que confunde o usuário) deve apontar para a variável `totalBancarioRaw` ao invés de `calculated.saldo` no componente visual, ou o `inputForCalculation.saldo_bancario` deve ser alimentado com o `totalBancarioRaw`. No entanto, como `calculated.saldo` pode ser usado matematicamente para verificar divergência (já que a divergência compara Entradas OFX vs Entradas Sistema), vamos apenas mudar a **exibição** no JSX do card para `totalBancarioRaw` (saldo bancário verdadeiro).

## Interfaces TypeScript
Nenhuma.

## Componentes Editados
- `src/components/importacoes/CentralImportWizard.tsx`:
  ```typescript
  // Antes:
  target_date: targetDate,
  
  // Depois:
  target_date: (tx.date ? tx.date.split('T')[0] : targetDate),
  ```

- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  ```tsx
  // Antes:
  <AnimatedNumber value={calculated.saldo} format="currency" />
  <span className="text-[10px] text-[var(--text-tertiary)] block">Extrato bancário OFX global</span>
  
  // Depois:
  <AnimatedNumber value={totalBancarioRaw} format="currency" />
  <span className="text-[10px] text-[var(--text-tertiary)] block">Saldo real da conta</span>
  ```

## Cenários de Verificação
- **Cenário 1**: Reimportar um OFX contendo 3 dias de vendas no Wizard.
- **Resultado Esperado**: Em vez das 93 entradas acumularem em "04/08", elas são distribuídas corretamente. O Faturamento Atual do Dashboard de 04/08 cairá drasticamente para igualar o Apurado Sistema (~R$ 16k).
- **Cenário 2**: Abrir a Conciliação Diária de 04/08.
- **Resultado Esperado**: O Card "SALDO BANCO ITAÚ" mostra ~17 milhões, não 107 mil.
