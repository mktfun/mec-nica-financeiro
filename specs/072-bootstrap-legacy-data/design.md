# Design Document: Spec 072 (Bootstrap Legacy)

## 1. Bugfix: `useDashboardV2.ts`
- Atualmente, o dashboard varre `historicoSnapshotsRes` e só adiciona os dados manuais na chave `faturamento` e `contas` da data específica. Porém, a variável de topo `faturamentoAnterior` lê de `tx.target_date === dateAnterior` e falta somar o valor manual daquele dia.
- Correção:
  ```ts
  const snapshotAnterior = (historicoSnapshotsRes.data || []).find(s => s.date === dateAnterior);
  const fatManualAnterior = Number(snapshotAnterior?.faturamento_outros_valor || 0);
  faturamentoAnterior += fatManualAnterior;
  ```

## 2. Interface: `Bootstrap.tsx`
- Uma tela em `/admin/bootstrap` (não precisa estar no menu principal).
- Usa o hook `useStores()` para listar as lojas ativas.
- Para cada loja, exibe 3 campos `type="number"`: Saldo Bancário, Faturamento Total, e Contas Pagas.
- Um seletor de Data global no topo (Default: dia anterior ao atual).
- Um botão `Salvar Carga Inicial (Dia Zero)`.

## 3. Lógica de Salvamento
Ao salvar, para cada loja com pelo menos 1 valor preenchido:
- Insere (Upsert) em `reconciliations` o `bank_total` se > 0.
- Insere (Upsert) em `daily_snapshots` o `faturamento_outros_valor` e `contas_a_pagar`.
- (O Upsert previne duplicidade caso o usuário clique duas vezes).
