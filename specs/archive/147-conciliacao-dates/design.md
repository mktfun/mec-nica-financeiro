# Design: Navegação Inteligente de Datas na Conciliação (147-conciliacao-dates)

## Arquitetura Técnica
1. **Componente de Rota (`conciliacao.index.tsx`):**
   - Dispara o hook `useAvailableConciliacaoDates()`.
   - Se retornar um array preenchido e não houver data selecionada, seta `selectedDate` para a última data do array (índice final).
2. **Hook (`useAvailableConciliacaoDates` em `useDailySnapshot.ts`):**
   - Executa uma RPC no Supabase (se necessário) ou query de `select('date')` das tabelas `daily_snapshots` e `transactions` (agrupadas). Para evitar query pesada em transações, consultar `daily_snapshots` e `import_logs` é suficiente, pois qualquer dia com movimentação bancária foi importado via `import_logs`.
   - Retorna um `string[]` ordenado cronologicamente ascendente.
3. **Componente de UI (`ResumoDiaPanel.tsx`):**
   - Recebe `availableDates` como prop.
   - `onDayChange(offset)`: encontra o índice da `selectedDate` atual. 
   - Se `offset === -1` (anterior), vai para `index - 1`. 
   - Se `offset === 1` (próximo), vai para `index + 1`.
   - Desabilita as setas nos limites do array (index === 0 e index === length - 1).

## Interfaces TypeScript
```typescript
// Em src/hooks/useDailySnapshot.ts (ou novo arquivo)
export function useAvailableConciliacaoDates(): UseQueryResult<string[], Error>;

// Alteração nas Props do ResumoDiaPanel
interface ResumoDiaPanelProps {
  // ... props originais ...
  availableDates: string[]; // <--- Nova Prop
}
```

## Componentes / Hooks / Funções
- **`src/hooks/useConciliacao.ts` ou `useDailySnapshot.ts`:** Criar a função que busca o DISTINCT de datas.
- **`src/routes/conciliacao.index.tsx`:** Controlar o estado inicial da data usando o novo hook. Aguardar o loading do array de datas antes de definir o dia.
- **`src/components/conciliacao/ResumoDiaPanel.tsx`:** Atualizar os botões de `<ChevronRight>` (setas) para navegar no array `availableDates` em vez de adicionar `±1` dia cego.

## Fluxo de UI
1. Usuário entra em `/conciliacao/`.
2. A tela exibe "Carregando..." enquanto busca as datas com conciliações já existentes.
3. Ao retornar (ex: `['2026-08-05', '2026-08-06', '2026-08-08']`), o sistema escolhe `2026-08-08` como selecionado.
4. O usuário clica na Seta Esquerda. O sistema muda para `2026-08-06` (pulando o dia 07 que está vazio).
5. Se o usuário clicar no Input de Data (calendário nativo), ele só poderá selecionar as datas presentes no array. Dias vazios estarão visualmente desabilitados ou a seleção saltará para o mais próximo válido (dependendo da limitação do input HTML, implementaremos um input customizado se necessário, mas a regra é restrição total).

## Infra / Deploy
Sem alterações de infraestrutura (Edge Functions, variáveis de ambiente ou topologias). Tudo será tratado no client combinando as requisições das tabelas Supabase.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Acessar a tela sem data explícita → Deve puxar o dia mais recente do banco que possui importação/fechamento, não o `new Date()`.
- **Cenário 2:** Clicar na Seta Esquerda → Deve ir para a data do banco IMEDIATAMENTE ANTERIOR, ignorando eventuais dias úteis sem lançamento no meio.
- **Cenário 3:** Forçar uma data vazia no input de calendário → Deve carregar zerado e não travar (fallback normal).
- **Cenário 4:** O banco não tem nenhuma data → Deve voltar ao comportamento padrão de `new Date()` para que o sistema não trave em um loop.
