# Proposal: CorreçÁo dos Valores e Statuses de OSs na ImportaçÁo e Pátio (fix-os-import-values-and-statuses)

## Problema
1. **Status Fixo como 'em_aberto' na GravaçÁo:**
   - Na importaçÁo de planilhas de OS (`useImportProcessor.ts`), a propriedade `status: os.status` **nÁo estava incluída** no objeto `payload` enviado ao Supabase. Com isso, o banco aplicava o valor padrÁo `'em_aberto'` para 100% das OSs importadas (mesmo que fossem finalizadas ou pagas parciais).
2. **Valor Total e Valor Pago Zerados (`R$ 0,00`):**
   - No parser de planilha (`useOsImportProcessor.ts`), se o cabeçalho nÁo contivesse uma coluna nomeada exatamente como "Valor Total" ou se os pagamentos estivessem descritos na coluna de formas de pagamento (`paymentMethod`, ex: `Credito R$ 3.949,15 PIX R$ 6.509,40`), os campos `total_value` e `paid_value` eram definidos como `0.00`.
   - As formas de pagamento eram extraídas (`parsed_credit`, `parsed_pix_transfer`), mas nÁo eram consolidadas no `total_value` nem no `paid_value`.
3. **Modal de Detalhes (`OsDetailModal.tsx`) Exibindo `Valor Total: R$ 0,00`:**
   - No componente `OsDetailModal.tsx`, a variável `totalValue` era calculada como `osData.paid_value !== undefined ? osData.paid_value : osData.total_value`. Se `paid_value` estivesse zerado, o `totalValue` era sobrescrito para `R$ 0,00`, ignorando os valores extratados de Crédito/Débito/PIX.
4. **Filtros do Pátio (`patio.tsx`):**
   - As abas de filtro (`Todas`, `Em Aberto`, `Pagas Parcial`, `Finalizadas (Período)`) nÁo refletiam com exatidÁo a situaçÁo financeira e os statuses corrigidos das OSs.

## SoluçÁo Proposta

1. **InclusÁo do Campo `status` na GravaçÁo de OS (`src/hooks/useImportProcessor.ts`):**
   - Incluir `status: os.status` no `payload` de `patio_os`, salvando no Supabase os statuses reais (`'em_aberto'`, `'pago_parcial'`, `'finalizado'`).
2. **Recálculo Inteligente de Valores no Parser (`src/hooks/useOsImportProcessor.ts`):**
   - Calcular a soma das formas de pagamento extraídas: `sumPayments = parsed_credit + parsed_debit + parsed_pix_transfer`.
   - Definir `totalValue = Math.max(rawTotalValue, paidValue + openValue, sumPayments)`.
   - Se `paidValue === 0` e `openValue === 0` e `sumPayments > 0`: definir `paidValue = sumPayments`.
   - Se `openValue > 0`: definir `paidValue = Math.max(0, totalValue - openValue)`.
   - Reavaliar rigorosamente o status:
     - `finalizado`: se statusStr contiver "finalizada"/"pago"/"entregue"/"fechada" ou se `totalValue > 0` e `(totalValue - paidValue) <= 0.05`.
     - `pago_parcial`: se statusStr contiver "parcial" ou se `paidValue > 0` e `(totalValue - paidValue) > 0.05`.
     - `em_aberto`: se `paidValue === 0` e `(totalValue - paidValue) > 0`.
3. **Ajuste de ExibiçÁo no Modal de Detalhes (`src/components/conciliacao/OsDetailModal.tsx`):**
   - Calcular `effectiveTotal = Math.max(Number(osData.total_value || 0), Number(osData.paid_value || 0), (osData.parsed_credit_debit || 0) + (osData.parsed_pix_transfer || 0))`.
   - Exibir `effectiveTotal` como Valor Total da OS e `paid_value` real como Valor Pago.
4. **HarmonizaçÁo do Card e Filtros na Tela de Pátio (`src/routes/patio.tsx`):**
   - Exibir no card de cada OS o Total real, o Valor Pago real e o Saldo em Aberto real.
   - Atualizar a filtragem das abas:
     - `Todas`: exibe todas as OSs.
     - `Em Aberto`: OSs sem pagamento efetuado (`status === 'em_aberto'` ou `paidValue === 0`).
     - `Pagas Parcial`: OSs com pagamento parcial (`status === 'pago_parcial'` ou `paidValue > 0` com saldo em aberto).
     - `Finalizadas (Período)`: OSs quitadas (`status === 'finalizado'` ou saldo em aberto $\le 0.05$).

## Contratos de Dados
- Tabela `public.patio_os`:
  - `status`: `'em_aberto' | 'pago_parcial' | 'finalizado'`
  - `total_value`: NUMERIC
  - `paid_value`: NUMERIC
  - `credit_value`: NUMERIC
  - `debit_value`: NUMERIC
  - `pix_transfer_value`: NUMERIC

## Features Existentes Impactadas
- `src/hooks/useOsImportProcessor.ts`: Leitura e interpretaçÁo do Excel de OS.
- `src/hooks/useImportProcessor.ts`: GravaçÁo no banco Supabase (`patio_os`).
- `src/routes/patio.tsx`: Tela de carros no pátio, estatísticas e abas de filtro.
- `src/components/conciliacao/OsDetailModal.tsx`: Modal de detalhes da OS.

## Risco Principal
OSs antigas ou já existentes no Supabase com `status = 'em_aberto'` e `total_value = 0`.
*MitigaçÁo:* Criar lógica de fallback nos componentes do frontend para calcular `effectiveTotal` e `effectivePaid` dinamicamente com base em `credit_value + debit_value + pix_transfer_value` mesmo para registros já salvos.
