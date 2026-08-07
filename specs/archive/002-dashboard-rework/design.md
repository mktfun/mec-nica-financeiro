# Design de ImplementaçÁo (002-dashboard-rework)

## 1. Arquitetura de Banco (Supabase)
O schema nÁo precisa de migraçÁo estrutural. Vamos apenas preencher melhor os campos que já existem em `ReconciliationRow`:
- `os_total` (float) -> Valor bruto lido da planilha
- `financial_total` (float) -> Valor líquido lido da planilha
- `daily_cash` (float) -> Input lateral (Físico/Terminal)
- `divergence` (float) -> `financial_total - daily_cash`
- `status` -> `approved` se `divergence == 0 && financial_total > 0`, `divergence` se != 0, caso contrário `pending`.

## 2. DivisÁo de Front-end (UI)

### Componente A: Lojas Grid (em `src/routes/conciliacao.tsx`)
- Alterar `className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"` 
- Para `className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"`
- Melhorar o padding interno dos cards.
- Exibir a quebra do valor: mostrar tanto "Faturado (OS)" quanto "Caixa Físico" no mesmo card para que o usuário bata o olho e veja *o porquê* deu divergência, ao invés de só mostrar "R$ 0,00".

### Componente B: Lógica de MutaçÁo (`src/hooks/useConciliacao.ts`)
Vamos injetar inteligência de negócio na camada de hooks (Client-side, já que estamos operando serverless via Supabase e calculando no front antes do `upsert`):

**Atualizar `useSaveDailyCash`**:
- Buscar o registro existente (via `.select()`).
- Inserir/Atualizar o `daily_cash`.
- Calcular `divergence` e `status` baseado no `financial_total` existente.

**Criar `useSaveImportedReport`**:
- Mesma lógica do `useSaveDailyCash`, mas ele vai atualizar `financial_total` e manter o `daily_cash` existente para refazer a conta.

### 3. Mapa de Dependências
```text
ImportReportDialog.tsx 
  └─> Usa: useSaveImportedReport (novo hook)
          └─> Atualiza banco (financial_total, divergence, status)

conciliacao.tsx (Grid Lojas)
  └─> Lê banco (exibe dados recalculados)

conciliacao.tsx (Salvar Valores Laterais)
  └─> Usa: useSaveDailyCash (hook atualizado)
          └─> Atualiza banco (daily_cash, divergence, status)
```
