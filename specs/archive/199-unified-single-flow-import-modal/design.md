# Design: Unified Single-Flow Import & Reconciliation Modal (199)

## Arquitetura Técnica

```
[ Usuário abre ImportConciliacaoModal ]
                 │
                 ├── Carrega matches persistentes do Supabase (`store_file_mappings`)
                 │
                 ▼
[ Single-Flow Block (2 Colunas no Dark UI Zinc-950) ]
 ┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
 │ COLUNA ESQUERDA                              │ COLUNA DIREITA                               │
 │                                              │                                              │
 │ 1. Upload Unificado (Dropzone)               │ 1. Tabela de Ajuste de OSs Órfãs             │
 │    - Arquivos OFX, Pátio, Rede               │    - Lista OSs ativas ausentes na planilha   │
 │    - Match de loja carregado do Supabase     │    - Inputs: Valor Total, Total Pago         │
 │    - Dropdown para alterar match (salva DB)  │    - Select: Status livre                    │
 │                                              │    - Zero baixas automáticas                 │
 │ 2. Card de Dados Manuais do Dia              │                                              │
 │    - Odômetro Acumulado Hoje                 │ 2. Resumo de Conferência                     │
 │    - Dinheiro MP                             │    - Total Pátio, Rede, Bancos               │
 │    - A Receber                               │                                              │
 │    - Contas (Manual)                         │                                              │
 └──────────────────────────────────────────────┴──────────────────────────────────────────────┘
                 │
                 ▼
 [ Botão: "Confirmar e Gravar Fechamento" (bg-emerald-600) ]
                 │
                 ▼ (Batch Mutation no Supabase)
 ├── 1. Atualizar OSs órfãs modificadas no `patio_os`
 ├── 2. Inserir/Atualizar novas OSs do arquivo
 ├── 3. Inserir transações OFX e Rede
 └── 4. Salvar snapshot diário (`daily_snapshots`)
```

## Schema SQL Migration (`supabase/migrations/20260814120000_create_store_file_mappings.sql`)

```sql
CREATE TABLE IF NOT EXISTS public.store_file_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_alias TEXT NOT NULL UNIQUE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  store_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.store_file_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to store_file_mappings" ON public.store_file_mappings
  FOR ALL USING (true) WITH CHECK (true);
```

## Interfaces TypeScript

```typescript
export interface StoreFileMappingRow {
  id: string;
  file_alias: string;
  store_id: string;
  store_name: string;
  created_at: string;
  updated_at: string;
}

export interface ImportConciliacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  onSuccess?: () => void;
}

export interface OrphanPatioOs {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name?: string;
  total_value: number;
  paid_value: number;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado' | 'cancelado';
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  opened_at?: string;
}

export interface FechamentoManualState {
  odometroHoje: number;
  dinheiroMp: number;
  aReceber: number;
  contasManual: number;
}
```

## Componentes / Hooks / Funções

1. **`src/hooks/useStoreFileMappings.ts`:**
   - Consulta `store_file_mappings` no Supabase.
   - Mutação para salvar/atualizar match de arquivo com loja no Supabase:
     `upsert({ file_alias, store_id, store_name, updated_at })`.
   - Popula automaticamente o mapa de lojas sem depender apenas de `localStorage`.

2. **`src/components/conciliacao/ImportConciliacaoModal.tsx`:**
   - Modal em `bg-zinc-950` sólido, com layout de 2 colunas responsivas (`grid grid-cols-1 lg:grid-cols-2 gap-6`).
   - Gerencia estado único de upload (`parsedData`), inputs manuais (`manualInputs`) e OSs órfãs (`orphanOsList`).
   - Hook de dropzone integrado para parsing imediato client-side.
   - Detecção em tempo real de OSs órfãs no Supabase assim que planilhas de pátio são carregadas.
   - Rotina `handleConfirmAndSave`:
     - Executa gravação em lote atômica sem re-renderizações intermediárias.
     - Emite toast de sucesso, invalida os caches do React Query e fecha o modal.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Matches Persistentes no Banco):**
  - *Ação:* Vincular "CAP MP" à loja "Matriz" no modal e recarregar em aba anônima.
  - *Resultado Esperado:* O mapeamento é carregado diretamente do Supabase e "CAP MP" já aparece associado à "Matriz".
- **Cenário 2 (Visual 2 Colunas sem Steppers):**
  - *Ação:* Abrir o modal de importação na tela de conciliação.
  - *Resultado Esperado:* Visual limpo em 2 colunas, fundo Zinc-950 sólido, sem steppers de passos no topo.
- **Cenário 3 (Gravação em Lote):**
  - *Ação:* Preencher os inputs manuais, ajustar uma OS órfã e clicar em "Confirmar e Gravar Fechamento".
  - *Resultado Esperado:* O modal grava todos os dados de uma só vez, atualiza os saldos e retorna à conciliação consolidada.
