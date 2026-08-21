# Design: Restaurar Tabela Exclusiva de OSs Ausentes no Preview (262)

## Arquitetura Técnica

```mermaid
graph TD
    A[Step 3: Preview de Importação] --> B[detectMissingOs Hook]
    B --> C[Buscar patio_os ativas no Supabase para as lojas mapeadas]
    B --> D[Cruzar com osArray dos arquivos importados results.osFiles]
    C & D --> E[Identificar OSs Ativas que NÃO vieram na planilha do mês]
    E --> F[missingOsList State]
    
    F --> G{missingOsList.length > 0?}
    G -- Sim --> H[Card: OSs Pendentes Ausentes no Relatório Atual]
    H --> I[Inputs Editáveis: Valor Total, Total Pago, Status]
    G -- Não --> J[Aviso Limpo: Todas as OSs ativas constam no relatório importado]
    
    I --> K[Botão: Confirmar e Gravar Conciliação]
    K --> L[executeDailyClosing: Persistir patio_os com valores auditados]
```

## Componentes / Hooks Modificados

1. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - **`detectMissingOs()`:**
     Executado sempre que `step === 3`.
     ```typescript
     const { data: dbActiveOs } = await supabase
       .from('patio_os')
       .select('id, os_number, plate, store_id, store_name, total_value, paid_value, status, opened_at, days_open')
       .in('store_id', mappedStoreIds)
       .or('status.ilike.%aberto%,status.ilike.%parcial%,status.ilike.%pendente%');
     ```
   - **Tabela no Step 3:**
     - Renderização focada exclusivamente em `missingOsList`.
     - Inputs para `total_value`, `paid_value` e `status`.
     - Exibição de: Loja, OS / Placa, Data Abertura, Valor Total (R$), Total Pago (R$), Saldo Pendente (R$) e Status.
     - Destaque em âmbar nas linhas alteradas (`isModified`).
   - **`executeDailyClosing()`:**
     - Grava as alterações de `missingOsList` no Supabase antes de concluir.

## Cenários de Verificação
- **Cenário 1 (OSs presentes no arquivo):** Planilha contém 250 OSs que batem com o banco → Tabela de OSs ausentes fica vazia/limpa sem poluir a tela.
- **Cenário 2 (OS aberta que não veio na planilha):** OS #5544 consta em aberto no banco mas não veio na planilha de 21/08 → Aparece na tabela de OSs ausentes → Operador altera o status para `finalizado` ou edita o valor pago → Ao salvar, banco é atualizado.
