# Proposal: Correção na Importação de OSs (Status, Valor Total = Pago + Aberto) e Ajuste da Tela de OSs (fix-os-import-parsing-and-patio-metrics)

## Problema

1. **Valores Incorretos e Perda de Status na Importação de OSs:**
   - Ao importar o relatório Excel de OSs do ERP, o parser estava forçando falsos status de `finalizado` e ignorando a coluna de status vinda do Excel (coluna D / Situação).
   - O valor total da OS não computava a soma do valor pago com o valor em aberto (`total_value = paid_value + open_value`), resultando em OSs com valor total idêntico ao valor pago e valor em aberto igual a R$ 0,00.

2. **Divergências nos KPIs da Tela de OSs (`/patio`):**
   - O KPI **Total em Aberto** marcava `R$ 0,00` pois todas as OSs tinham `total_value - paid_value = 0`.
   - Os cards da lista de OSs mostravam `em aberto` no status, mas com `Total: R$ 1.300,00 | Pago: R$ 1.300,00`, sem exibir o valor remanescente em aberto.
   - Os contadores de **Sem Pagamento** e **Pagas Parcialmente** ficavam distorcidos.

## Solução Proposta

1. **Reformulação do Parser de OSs em `src/hooks/useOsImportProcessor.ts`:**
   - **Cálculo do Valor Total:** Definir `total_value = paid_value + open_value` (lendo as colunas 'Valor Pago' e 'Valor em Aberto'/'Restante'/'Falta'/'Saldo' do Excel).
   - **Leitura do Status Real do Excel (Coluna Status / D4):** Respeitar rigorosamente a string de status vinda do Excel (`raw_status`), mapeando para:
     - `em_aberto`: se o texto do Excel contiver "Em Aberto" / "Aberto" e `paid_value === 0`.
     - `pago_parcial`: se o texto do Excel contiver "Em Aberto" ou "Parcial" e houver `paid_value > 0` e `open_value > 0`.
     - `finalizado`: se o texto contiver "Finalizada", "Pago", "Entregue" ou "Fechada".
   - **Atualização Procedural:** Permitir que novas importações atualizem o status e os valores das OSs proceduralmente via `upsert` em `patio_os`.

2. **Ajuste Completo da Tela de OSs (`src/routes/patio.tsx`):**
   - **Total em Aberto:** Somar o saldo em aberto real `(total_value - paid_value)` de todas as OSs ativas (`em_aberto` e `pago_parcial`).
   - **Maior OS:** Exibir o maior `total_value` das OSs em aberto.
   - **Sem Pagamento:** Contar OSs ativas com `paid_value === 0`.
   - **Pagas Parcialmente:** Contar OSs ativas com `paid_value > 0` e `(total_value - paid_value) > 0.05`.
   - **Visualização da OS:** Exibir em cada card da lista o valor **Total**, **Pago** e **Em Aberto** (quando houver saldo pendente).

## Contratos de Dados
- Tabela `patio_os` (campos `total_value`, `paid_value`, `status`, `raw_status`, `days_open`)
- Interface `ParsedOS` em `src/hooks/useImportProcessor.ts`

## Features Existentes Impactadas
- `src/hooks/useOsImportProcessor.ts`
- `src/hooks/useImportProcessor.ts`
- `src/routes/patio.tsx`

## Risco Principal
OSs com apenas 1 coluna de valor no Excel ficarem sem fracionamento.
*Mitigação:* Se houver apenas 1 coluna de valor, usar a string de status do Excel para determinar se o valor é pago ou em aberto.
