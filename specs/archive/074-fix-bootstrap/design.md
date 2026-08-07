# Design: CorreçÁo de Salvar Bootstrap (074-fix-bootstrap)

## Arquitetura Técnica
`bootstrap.tsx` (handleSave) → Agrega Totais das Lojas → `Supabase (daily_snapshots)` (UPSERT global único)
`bootstrap.tsx` (handleSave) → Loop de Lojas → `Supabase (reconciliations)` (UPSERT por loja)

## Fluxo de UI
A experiência do usuário (UI) nÁo muda. O usuário continua digitando os valores por loja. O Javascript no handler de salvamento cuidará de fazer a soma antes de enviar para o banco.

## Componentes / Hooks / Funções
- **src/routes/bootstrap.tsx** (`handleSave`): Atualizada para iterar sobre `formData` acumulando variáveis globais (`totalFaturamento`, `totalContas`, `totalSaldo`). Efetua `supabase.from('daily_snapshots').upsert()` APENAS UMA VEZ no final da funçÁo, usando apenas `{ onConflict: 'date' }`.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [estado inicial do bootstrap] → [inserir valores e clicar em salvar] → [A requisiçÁo 400 Bad Request nÁo ocorre, e uma mensagem de sucesso verde aparece].
