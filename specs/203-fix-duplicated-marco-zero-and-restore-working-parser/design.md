# Design Técnico: Restauração Fiel dos Componentes Originais (Spec 203)

## Arquitetura de Componentes

```
src/routes/importacoes.tsx
├── Aba 1: "Fechamento Diário"
│   └── <CentralImportWizard /> (Componente Original com Preview por Loja, OSs Órfãs, Stages, Logs, JSON Inspector e Correções de Integridade)
├── Aba 2: "Carga de Marco Zero"
│   └── <MarcoZeroWizard /> (Componente Original com Grid dos 15 Campos Globais, Auto-Mapeamento e RPC process_marco_zero_import)
└── Aba 3: "Histórico de Lotes"
    └── Listagem de Lotes, Cascade Delete e Limpeza Geral
```

## Ajustes Precisos no Código Original:

1. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - Usar `useStoreFileMappings(stores)` para carregar e salvar matches de arquivos com lojas no Supabase (`store_file_mappings`).
   - Garantir sanitização de transações no `handleConfirm`:
     - `type: (t.type === 'in' || t.amount > 0) ? 'in' : 'out'`
     - `amount: Math.abs(t.amount || 0)`
     - `target_date: targetDate`
     - `occurred_at: t.date || targetDate || new Date().toISOString()`
     - `import_batch_id: batch?.id`
   - Adicionar o bloco `<details>` com o **Inspetor JSON de Conciliação** no Step 3 (prévia) com botão de cópia do payload.

2. **`src/lib/parsers/marcoZeroParser.ts`:**
   - Usar `await file.arrayBuffer()` com `XLSX.read(buffer, { type: 'array', cellDates: true })`.
   - Adicionar `console.log('[MarcoZeroParser] Dados extraídos da planilha:', result)` e `console.log('[MarcoZeroParser] Globais:', globalData)`.

3. **`src/components/importacoes/MarcoZeroWizard.tsx`:**
   - Adicionar `console.log('[MarcoZeroWizard] Enviando para RPC process_marco_zero_import:', payload)`.
   - Manter a renderização dos 15 campos globais em layout de grid de alta densidade e o modal/card de sucesso com resumo da operação.
