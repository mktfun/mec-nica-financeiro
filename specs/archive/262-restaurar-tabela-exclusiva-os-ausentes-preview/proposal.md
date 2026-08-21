# Proposal: Restaurar Tabela Exclusiva de OSs Ausentes no Preview (262)

## Problema
1. **Poluição Visual com Todas as OSs Importadas:**
   - Na Spec 261, foi adicionada uma tabela contendo todas as 200+ OSs lidas da planilha importada (`allImportedOsList`).
   - Isso tornou impossível para o operador identificar o que realmente precisa de auditoria e intervenção manual, pois as OSs presentes na planilha já possuem seus valores e status atualizados diretamente pelo arquivo.
2. **Propósito Real da Edição no Preview:**
   - O único conjunto de OSs que necessita de conferência e ajuste manual no Step 3 são as **OSs Ausentes / Órfãs** (aquelas que constam como ativas/em aberto no banco de dados de dias anteriores, mas **NÃO VIERAM** no relatório atual de carros em pátio importado).
   - O operador precisa ver exclusivamente essa lista de OSs ausentes para decidir se elas foram quitadas, canceladas ou tiveram seus valores alterados.

## Solução Proposta
1. **Remoção da Tabela Genérica de Todas as OSs Importadas:**
   - Remover `allImportedOsList`, `filteredImportedOsList`, `paginatedImportedOsList` e a tabela genérica de todas as OSs do Step 3 do `CentralImportWizard.tsx`.
2. **Restauração e Aprimoramento da Tabela Exclusiva de OSs Ausentes (`missingOsList`):**
   - Restaurar a rotina automática `detectMissingOs` que busca no Supabase as OSs com status ativo (`em_aberto`, `pago_parcial`, `PENDENTE`, etc.) das filiais mapeadas e subtrai todas as OSs presentes na planilha importada do dia.
   - Renderizar no Step 3 a **Tabela de OSs Pendentes Ausentes no Relatório Atual**:
     - Exibe apenas as ordens que o banco possui ativas mas que não constam no arquivo.
     - Inputs editáveis para: **Valor Total (R$)**, **Total Pago (R$)** e **Status** (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`).
     - Cálculo em tempo real do **Saldo Pendente** (`Math.max(0, total_value - paid_value)`).
     - Destaque em âmbar nas linhas alteradas pelo operador.
     - Campo de busca rápida por placa/OS/loja dentro das OSs ausentes.
3. **Persistência Atômica das OSs Ausentes Editadas em `executeDailyClosing`:**
   - Ao confirmar o fechamento, as OSs ausentes alteradas pelo operador são atualizadas diretamente em `patio_os` (com `closed_at = targetDate` caso finalizadas).

## Contratos de Dados
- `patio_os`:
  - Query de detecção: `.in('store_id', mappedStoreIds).or('status.ilike.%aberto%,status.ilike.%parcial%,status.ilike.%pendente%')`.
  - Mutação: `.update({ total_value, paid_value, status, closed_at }).eq('id', os.id)`.

## API / Interface
- `src/components/importacoes/CentralImportWizard.tsx`:
  - Remoção de `allImportedOsList` e estados auxiliares desnecessários.
  - Reativação completa do hook `useEffect` com `detectMissingOs`.
  - Renderização limpa do card `missingOsList` no Step 3.

## Features Existentes Impactadas
- Feature 258: Motor de Auto-Healing (continua operando normalmente).
- Feature 260: Pareamento Inteligente de OSs Pendentes (alimentado pelas OSs do pátio).

## Risco Principal
- **Risco:** O operador alterar o status de uma OS ausente para `finalizado` e não registrar a data de fechamento.
- **Mitigação:** Gravação automática de `closed_at: targetDate` e `last_payment_date: targetDate` para todas as OSs ausentes marcadas como finalizadas ou com pagamento incrementado.
