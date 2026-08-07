# Design: CorreçÁo do Pátio Pendente (Na Loja OS) e Bug de Salvamento (078)

## Arquitetura Técnica
O fluxo de resoluçÁo do Pátio Pendente no frontend deve obedecer a ordem de precedência:
1. Existe snapshot em `reconciliations` para a loja e data HOJE? -> Usa ele.
2. (NOVO) Se nÁo houver snapshot para HOJE, procura o último snapshot anterior a hoje. Usa ele como base. (Porque Pátio Pendente nÁo some a menos que seja pago).
3. (Opcional Futuro) Se houver novas OSs no `patio_os` abertas HOJE, elas seriam somadas a base. Mas para simplificar nesta iteraçÁo e consertar o furo de 13k vs 1k, vamos apenas manter o valor de D-1 como projeçÁo primária até o salvamento.

O bug do React no painel global:
`ResumoDiaPanel.tsx` -> `handleSave` -> Usa `storesData` para iterar e gravar os snapshots parciais em `reconciliations`.

## Componentes / Hooks / Funções
- `src/components/conciliacao/ResumoDiaPanel.tsx`: Ajustar variável.
- `src/hooks/useConciliacao.ts`: No hook `useModulo1StoresData`, adicionar uma query secundária ou order-by-descending para resgatar o `na_loja_os` se nÁo existir para o dia corrente.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- Cenário 1: Dia sem movimento, mas Bootstrap de D-1 definiu `Na Loja OS` como 13000. Hoje deve herdar 13000 em vez de 0.
- Cenário 2: Clicar no botÁo "Gravar Fechamento Diário" com a variável correta nÁo joga erro e o ícone de sucesso aparece.
