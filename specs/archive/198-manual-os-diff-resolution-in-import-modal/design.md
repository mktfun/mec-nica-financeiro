# Design: Manual OS Diff Resolution in Import Modal (198)

## Arquitetura Técnica

```
[ Step 1 & 2: Upload e Mapeamento de Lojas ]
                    │
                    ▼
[ Transição para Step 3: Pré-visualização ]
  ├── 1. Extrair OSs dos arquivos importados (Set de os_number)
  ├── 2. Buscar no Supabase: `patio_os` (status IN ('em_aberto', 'pago_parcial'))
  └── 3. Filtrar OSs Ausentes: (os_no_banco NOT IN os_dos_arquivos)
                    │
                    ▼
[ Seção: "OSs Pendentes Ausentes no Relatório Atual" ]
  ├── Tabela com inputs diretos:
  │     - Valor Total (<input type="number" />)
  │     - Total Pago (<input type="number" />)
  │     - Status (<select>: 'em_aberto' | 'pago_parcial' | 'finalizado' | 'cancelado')
  └── Estado Local: `missingOsEdits: Record<string, { total_value, paid_value, status }>`
                    │
                    ▼
[ Step 4: Clica em "Confirmar e Gravar Importação" ]
  ├── Grava OSs novas/atuais do arquivo
  ├── Aplica updates em lote para as OSs ausentes editadas
  └── Grava transações, maquininha e snapshot diário
```

## Interfaces TypeScript

```typescript
export interface MissingPatioOsEdit {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name: string;
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  total_value: number;
  paid_value: number;
  status: string;
  opened_at?: string;
  days_open?: number;
}
```

## Componentes / Hooks / Funções

1. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - Estado `missingOsList: MissingPatioOsEdit[]`
   - `useEffect` / Handler ao entrar no Step 3:
     - Consulta `patio_os` para as lojas mapeadas com `status IN ('em_aberto', 'pago_parcial')`.
     - Cruza com os `os_number` presentes em `results.osFiles`.
     - Popula `missingOsList`.
   - Renderização da tabela:
     - Se `missingOsList.length > 0`, renderizar card com destaque âmbar/azul informando:
       `"Detectamos X OSs ativas no sistema que não constam nas planilhas do mês importadas. Você pode ajustar valores e status manualmente abaixo:"`
     - Linhas da tabela com inputs livres e select de status.
   - No `handleConfirm`:
     - Para cada OS em `missingOsList`, se houve alteração em relação aos valores originais, incluir no lote de atualização do Supabase:
       `supabase.from('patio_os').update({ total_value, paid_value, status, updated_at }).eq('id', os.id)`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Sem OSs Ausentes):**
  - *Ação:* Importar arquivo de pátio onde todas as OSs abertas do banco estão presentes no arquivo.
  - *Resultado Esperado:* A seção de OSs ausentes não é exibida e o fluxo segue normal.
- **Cenário 2 (OSs Ausentes Detectadas e Ajustadas):**
  - *Ação:* Importar arquivo do mês onde 3 OSs antigas do banco não constam na planilha.
  - *Resultado Esperado:* O wizard exibe a tabela com as 3 OSs. O operador altera o status de uma para `finalizado` e ajusta o valor pago de outra.
- **Cenário 3 (Gravação em Lote Consistente):**
  - *Ação:* Clicar em "Confirmar e Gravar Importação".
  - *Resultado Esperado:* As OSs ausentes editadas são atualizadas no banco, as novas OSs são salvas, e o resumo de conciliação diária reflete imediatamente os novos saldos.
