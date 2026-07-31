# Tasks - Spec 039 (Fechamento por Lote & Pagamentos Parciais)

## Backend Engineer
- [x] 1. Em `src/hooks/useImportProcessor.ts`, localizar o processamento de Pátio OS (`// 1. Process Patio OS`).
- [x] 2. Modificar o construtor do `toInsert` e `toUpdate`. Calcular a variável `delta_paid = newPaid - oldPaid`.
- [x] 3. Se `delta_paid > 0`, agrupar esse delta em uma estrutura que será usada mais abaixo no "Passo 3: Agrupar OSs por data de fechamento".
- [x] 4. Remover o filtro `os.status === 'finalizado'` na iteração principal. Todas as OS com `delta_paid > 0` devem gerar uma transação de entrada, independentemente do status da OS.
- [x] 5. Na inserção das `transactions` para o Pátio, usar o valor calculado do `delta_paid` e assinalar a transação com `occurred_at = targetDate`. Remover a trava de `existingOsNumbers` que impedia inserção de uma mesma OS mais de uma vez.

## Frontend Engineer
- [x] 1. Em `src/routes/conciliacao.tsx`, localizar o alerta superior e corrigir a string de "O total arrecadado no sistema não confere com a soma de (Físico + Maquininha)" para a nova nomenclatura DRE.
- [x] 2. Garantir que as labels de `Extrato Bancário` e divergência estão claras para o usuário como "Fechamento do Dia".
