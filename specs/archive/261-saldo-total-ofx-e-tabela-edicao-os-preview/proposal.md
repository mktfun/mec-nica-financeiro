# Proposal: Saldo Total OFX e Tabela de Edição de OSs no Preview (261)

## Problema
1. **Conferência e Exibição de Extratos Bancários (OFX):**
   - O usuário prefere manter a contabilização do saldo total do arquivo OFX (sem filtro diário rígido), mas com nomenclatura transparente: o card e os resumos devem indicar claramente que se trata do **Saldo Total dos Extratos OFX**.
2. **Edição Livre das OSs Importadas no Preview (Step 3):**
   - O usuário precisa auditar e ajustar livremente os valores de **Valor Total da OS** (`total_value`) e **Total Pago** (`paid_value`) diretamente na tabela do Step 3 do `CentralImportWizard.tsx` antes de confirmar e salvar a conciliação.

## Solução Proposta
1. **Ajuste no Card de Extratos Bancários:**
   - Atualizar a nomenclatura do Card 3 para **Saldo Total Bancário (OFX)** / **Total Extratos OFX**, exibindo o montante total consolidado das entradas do arquivo OFX e o total de transações.
2. **Tabela Interativa de Ordens de Serviço Importadas no Step 3:**
   - Exibir no Step 3 uma tabela expansível, moderna e pesquisável com todas as OSs carregadas em `results.osFiles`.
   - Inputs editáveis inline para:
     - `Valor Total (R$)` (`total_value`)
     - `Total Pago (R$)` (`paid_value`)
     - `Status` (`em_aberto`, `pago_parcial`, `finalizado`)
   - Recálculo reativo em tempo real dos cards de resumo (`Total OS (Recebimentos do Dia)`, `Estoque em Pátio`) e Previsão por Loja.
   - Persistência dos valores editados pelo usuário ao executar `executeDailyClosing` (`patio_os`, `reconciliations`, `daily_snapshots`).

## Contratos de Dados
- `patio_os`: Gravação dos valores editados (`total_value`, `paid_value`, `status`, `delta_paid`).
- `daily_snapshots`: Consolidação automática dos totais com base nas OSs auditadas.
- `reconciliations`: Atualização precisa de `na_loja_os`.

## API / Interface
- `CentralImportWizard.tsx`:
  - Função `updateImportedOs(fileName: string, osNumber: string, field: 'total_value' | 'paid_value' | 'status', value: any)`.
  - Tabela com filtros de loja, busca textual por placa/OS e status.
  - Card de OFX com rótulo "Saldo Total Bancário (OFX)".
