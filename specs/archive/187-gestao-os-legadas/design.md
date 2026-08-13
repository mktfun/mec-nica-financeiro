# Design: Gestão de OSs Legadas do Marco Zero (187-gestao-os-legadas)

## Arquitetura Técnica
`src/routes/conciliacao.$lojaId.tsx` (Verifica isMarcoZero) 
   → Renders `<LegacyOsTable />` 
   → Fetches OSs via Supabase client (`SELECT * FROM patio_os WHERE store_id = X AND opened_at = Y`)
   → Liquida (Manual/Lote) chamando RPC `liquidate_legacy_os([ids])`
   → Supabase RPC executa UPDATE atômico `SET status='pago', paid_value=total_value`
   → React Query Cache Invalidation (`patio_os`, `reconciliation_views`, `dashboard_metrics`)
   → Componente Atualiza (Badge reflete Status novo, Total Pendente Deduzido).

## Interfaces TypeScript
```typescript
// Component Props
interface LegacyOsTableProps {
  storeId: string;
  date: string;
}

// OS Model
interface LegacyOs {
  id: string;
  os_number: string;
  plate: string;
  total_value: number;
  paid_value: number;
  status: 'em_aberto' | 'pago' | 'pago_parcial' | 'conciliado';
}
```

## Componentes / Hooks / Funções
1. **Componente:** `src/components/conciliacao/LegacyOsTable.tsx`
   Responsabilidade: Renderizar a tabela ativa de OSs com seleção em lote e cards de totalizadores no topo (Total OSs, Pago, Pendente).
2. **Hook de Injeção de Data:** Adição do hook `useDailySnapshot` dentro de `src/routes/conciliacao.$lojaId.tsx` para interceptar a flag `is_marco_zero` (já existente no `metadata` do snapshot).
3. **Supabase RPC:** Migration contendo `CREATE OR REPLACE FUNCTION liquidate_legacy_os(p_os_ids uuid[])`.

## Fluxo de UI
1. Usuário acessa `/conciliacao` e seleciona a data correspondente ao Marco Zero.
2. Clica no Card de uma loja (ex: "Loja Principal").
3. A rota filha renderiza a interface dedicada de Marco Zero, escondendo as abas de "Cartão", "Pix", etc.
4. Exibe a tabela de OSs:
   - Header com Totais Reativos: 
     - **Valor Total Legado:** Soma de todas as OSs.
     - **Já Pago/Liquidado:** Soma de OSs com status `pago`.
     - **Restante Pendente:** Soma de OSs com status `em_aberto`.
   - Grid de dados (Colunas: Checkbox, OS, Placa, Status, Valor, Ações).
   - Botão flutuante ou no topo "Liquidar Selecionadas" habilitado apenas se houver seleção.
5. Ao confirmar liquidação, spinner de loading aparece, RPC executa, Tabela atualiza badges e Totais recalculam. (UI Restrição: Dark Mode Zinc-950, botões Emerald/Primary).

## Infra / Deploy
- Nenhuma variável de ambiente adicional ou alteração de topologia. Uso nativo do Supabase REST API (RPCs).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Acessar data do Marco Zero na loja → `<LegacyOsTable>` deve ser renderizada ao invés do layout padrão de conciliação diária.
- **Cenário 2:** Clicar em "Baixar OS" individualmente → Status da OS deve mudar de 'em_aberto' (Badge Laranja) para 'pago' (Badge Verde), e o valor deduzir do "Restante Pendente".
- **Cenário 3:** Selecionar múltiplas OSs (batch) e "Liquidar" → Todas devem constar como pagas simultaneamente.
- **Cenário 4:** Acessar a mesma loja em data operacional normal (D+1) → As abas padrão devem ser exibidas normalmente.
