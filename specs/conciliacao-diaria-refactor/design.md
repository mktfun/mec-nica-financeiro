# Design: RefatoraçÁo da ConciliaçÁo Diária (conciliacao-diaria-refactor)

## Arquitetura Técnica
`CentralImportWizard` (UI ImportaçÁo) → Coleta Formulário Manual → `useSaveDailySnapshot` (Hook) → Upsert na tabela `daily_snapshots`.
`ResumoDiaPanel` (UI ConciliaçÁo) → Lê de `daily_snapshots` (Hook) → Usa `calculateModulo1Saldo` → Renderiza Read-Only.

## Interfaces TypeScript
```typescript
export type DailySnapshotRow = {
  // ... campos existentes
  a_receber_manual: number;
  faturamento_outros_valor: number;
  faturamento_outros_desc: string | null;
  contas_a_pagar: number;
  provisao: number;
}
```

## Componentes / Hooks / Funções
1. **`CentralImportWizard.tsx`**: Novo *Step* no Wizard para Valores Globais. Formulário para capturar: Dinheiro MP, A Receber, Faturamento Outros, Contas a Pagar e ProvisÁo. O Saldo Negativo e Juros REDE vêm automatizados dos relatórios importados.
2. **`useDailySnapshot.ts`**: Atualizar tipagens de `DailySnapshotRow` para abranger as novas colunas.
3. **`modulo1Calculations.ts`**: Adicionar as chaves novas na interface de cálculo e implementar as equações no `globalCalculated`:
   - Saldo = soma de todos os saldos OFX do dia.
   - Dinheiro MP = input manual `dinheiro_mp`.
   - A receber = input manual `a_receber_manual`.
   - Na loja = soma OS pendentes.
   - Caixa atual = (Saldo + MP + Receber + Na Loja) - `saldo_negativo_itau` (do OFX).
   - Fluxo CX = Caixa atual - Caixa da **CONCILIAÇÁO ANTERIOR**.
   - Faturamento = (Faturamento Acumulado Mês Atual - Faturamento Acumulado Mês até **CONCILIAÇÁO ANTERIOR**) + `faturamento_outros_valor`.
   - Valor Disp Contas = Faturamento + Fluxo CX.
   - Valor Contas = `juros_rede` (do relatorio REDE) + `contas_a_pagar` + `provisao`.
   - Diferença = Valor Disp Contas - Valor Contas.
4. **`ResumoDiaPanel.tsx`**: 
   - Remover `<input>` do Dinheiro MP.
   - Ajustar UI dos totais inferiores para um card grandÁo e um só com o verdinho para diferença.
   - A Diferença fica verde se `>= -50` e `<= 50`, vermelha se ultrapassar essa faixa de tolerância.

## Fluxo de UI
1. O usuário entra em Importações e faz o upload dos arquivos (OFX, REDE, Pátio).
2. O sistema extrai as métricas automáticas (Saldo, Saldo Negativo Itaú, Juros REDE em reais).
3. O usuário preenche (Input) "Dinheiro MP", "A Receber (Boleto+Desc)", "Outros Faturamentos", "Contas a Pagar", "ProvisÁo".
4. Clica em "Finalizar ImportaçÁo" → Salva no DB em `daily_snapshots`.
5. O usuário abre a aba "ConciliaçÁo". Escolhe o dia atual.
6. A tela exibe o "Resumo Dia Panel" em read-only, lendo os dados e a última conciliaçÁo efetuada (CONCILIAÇÁO ANTERIOR).
7. O Card de "Diferença" formata sua cor com base na margem de tolerância.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar OFX com saldo negativo. O sistema deve capturar isso sem exigir input manual para Saldo Negativo.
- **Cenário 2:** Diferença de faturamento final de semana. Garantir que a "CONCILIAÇÁO ANTERIOR" referencie Sexta-feira se a conciliaçÁo for feita na Segunda.
- **Cenário 3:** Diferença exata de R$ 30,00. Card "Diferença" verde. Diferença de R$ -60,00. Card fica Vermelho.
