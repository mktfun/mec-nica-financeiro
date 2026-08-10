# Design: Refatoração da View de Importações (Excel/Extrato) - 153

## Arquitetura Técnica
UX/UI focada em Data-Grid (Excel-like). 
Fluxo: Botão no Header (Store Dashboard) → Abre `ExtratosImportacaoModal` → O usuário seleciona a aba (OFX, POS, OS) → A tabela busca via `useRaw*` e renderiza um grid denso.

## Interfaces TypeScript
```typescript
interface ExtratosImportacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  targetDate: string;
}
```

## Componentes / Hooks / Funções
1. **[DELETAR]** `src/components/conciliacao/ImportSourceBadges.tsx`
2. **[DELETAR]** `src/components/conciliacao/RawOfxTable.tsx`
3. **[DELETAR]** `src/components/conciliacao/RawRedeTable.tsx`
4. **[DELETAR]** `src/components/conciliacao/RawOsTable.tsx`
5. **[NOVO]** `src/components/conciliacao/ExtratosImportacaoModal.tsx`:
   - Modal com tabs (OFX Bancário, Maquininha, OS Sistema).
   - Renderização inline de `<table className="w-full text-xs text-left border-collapse">`
   - O estilo deve replicar Excel: bordas de grid explícitas (`border border-[var(--border-subtle)]`), linhas zebradas (`even:bg-[var(--bg-surface-elevated)]`), texto tabular e denso (`py-1 px-2`), header colado (`sticky top-0 bg-[var(--bg-canvas)] shadow-sm`).
6. **[EDITAR]** `src/routes/conciliacao.$lojaId.tsx`:
   - Remover as imports das peças apagadas.
   - Adicionar o botão no topo, perto do título ou filtros, ex: `<Badge icon={Table} className="bg-zinc-800 hover:bg-zinc-700">Ver Extratos Originais</Badge>`.
   - Incluir o componente do modal.

## Fluxo de UI
1. O usuário entra na tela de conciliação de uma loja específica.
2. Em vez de ver os badges confusos de "Raio-X de Lotes" perdidos na tela, não há ruído visual.
3. No canto superior, existe um badge de ação: `📊 Extratos Brutos` (ou Extratos Originais).
4. Ao clicar, o modal abre mostrando o extrato bancário exato que foi subido (OFX), linha a linha, com colunas perfeitas (Data, Memo, Tipo, Valor). 
5. Se for crédito, verde (+). Se for débito, vermelho (-).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Clique no badge "Extratos Originais" → O modal deve abrir na aba "Banco OFX" exibindo os dados de `useRawOfx` tabulados perfeitamente.
- **Cenário 2:** Alternância de Abas → Mudar para Maquininha deve mostrar o componente de loading ou os dados imediatos em grid idêntico (Data, NSU, Bandeira, Valor Bruto, Taxa, Valor Líquido).
