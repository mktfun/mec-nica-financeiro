# Proposal: Manual OS Diff Resolution in Import Modal (198)

## Problema
1. **Divergência de Pátio / OSs Ausentes no Relatório Mensal:**
   - O relatório de "Carros em Pátio" exportado pelo ERP abrange apenas o recorte do mês corrente.
   - OSs mais antigas que ainda continuam abertas no pátio físico ou no contas a receber somem do relatório importado, mas permanecem ativas no banco de dados (`patio_os`).
   - Sem uma visão comparativa direta durante a importação, o operador não consegue analisar e ajustar manualmente o saldo ou o status dessas ordens.
2. **Rejeição a Automações / Baixas Mágicas:**
   - O operador exige **controle manual absoluto**. O sistema não deve fazer baixas automáticas nem ocultar registros com automações presumidas.
   - É necessário renderizar uma tabela simples e direta dentro do modal de importação com campos editáveis de Valor Total, Total Pago e Status para cada OS ausente, persistindo tudo em lote somente ao clicar em "Confirmar e Gravar Importação".

## Solução Proposta
1. **Detecção no Client-side no Wizard de Importação (`CentralImportWizard.tsx`):**
   - Ao carregar os arquivos de OSs, buscar no Supabase todas as ordens de serviço ativas (`status IN ('em_aberto', 'pago_parcial')`).
   - Identificar as **OSs Ausentes**: aquelas presentes e ativas no banco de dados, mas que **não** constam nas planilhas de pátio recém-importadas.
2. **Tabela de Ajuste Manual Direto no Modal:**
   - Na etapa de conferência / preview (Step 3 do modal de importação), renderizar uma seção limpa intitulada:
     **"OSs Pendentes Ausentes no Relatório Atual"**.
   - Exibir cada OS ausente com inputs livres e diretos:
     - `Valor Total`: `<input type="number" step="0.01" />` (pré-preenchido com o valor atual do banco, editável).
     - `Total Pago`: `<input type="number" step="0.01" />` (pré-preenchido com o valor pago do banco, editável).
     - `Status`: `<select>` com as opções: `em_aberto`, `pago_parcial`, `finalizado`, `cancelado`.
     - Indicador visual do `Saldo Pendente Atualizado` (`Valor Total - Total Pago`).
3. **Persistência em Lote (Sem Disparos Prematuros):**
   - As alterações ficam armazenadas unicamente no estado React local (`missingOsEdits`).
   - A gravação no Supabase só é efetuada no Step 4, quando o operador clica no botão principal **"Confirmar e Gravar Importação"**, enviando todos os updates das OSs alteradas junto com os novos lotes.

## Contratos de Dados
- **Tabelas Supabase:**
  - `patio_os`:
    - `id`, `store_id`, `os_number`, `plate`, `total_value`, `paid_value`, `status`, `updated_at`.
- **Mutações:**
  - `supabase.from('patio_os').update(...)` executado em lote para todas as OSs ausentes editadas pelo operador ao confirmar a importação.

## API / Interface
- **Componentes React:**
  - `src/components/importacoes/CentralImportWizard.tsx`: Integração da busca de OSs ativas, detecção de ausentes, renderização da tabela de ajuste manual e inclusão dos updates no lote final.

## Features Existentes Impactadas
- `specs/global/features.md`:
  - `Wizard de Importação Centralizada (CentralImportWizard)`: Inclusão do painel de resolução manual de OSs ausentes.

## Risco Principal
- **Risco:** O operador alterar o status de uma OS por engano.
  - **Mitigação:** Os valores originais permanecem no estado até o clique em "Confirmar e Gravar Importação", permitindo conferência e cancelamento fácil.
