# Design: Correções de Conciliação (075)

## Arquitetura Técnica
A lógica de somatório da UI lerá o total de transações reais de entrada `(val.in)` em vez do saldo estático do OFX `(val.rawBalance)`.
`src/routes/conciliacao.index.tsx` → Calcula `totalBancarioIn` → Passa para `ResumoDiaPanel.tsx` → Salva no `daily_snapshots`.

## Interfaces TypeScript
Nenhuma nova interface será criada. Utilizaremos o já existente `GlobalConciliacaoInput`.

## Componentes / Hooks / Funções
1. `src/routes/conciliacao.index.tsx` (Componente Principal da Rota)
   - Remover a validação `getDefaultDate()` no botão do picker e mudar para `new Date().toISOString().substring(0, 10)` (ou data atual da view).
2. `src/components/conciliacao/ResumoDiaPanel.tsx` (Componente Visual)
   - Ajustar o construtor do `inputForCalculation` para usar `totalBancarioIn` no lugar de `totalBancarioRaw`.

## Fluxo de UI
1. O usuário entra na Conciliação.
2. Pode clicar na seta de "Próximo" livremente até a data de hoje.
3. Ao visualizar o Saldo Banco Itaú, verá a soma justa de `R$ 145.291,30` (sumatório de todas as lojas) ao invés do assustador multiplicador holding `17.998.662,00`.

## Infra / Deploy
Sem alterações de infraestrutura. Frontend deployment normal (Vite).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** [estado inicial] `10 OFX de 17 Milhões importados` → [ação] `Entrar na tela de Conciliação` → [resultado esperado] `Saldo Banco Itaú exibe a soma de "in" de todas as lojas, normalizado`.
- **Cenário 2:** [edge case] `Usuário clicando em amanhã no calendário` → [ação] `Avançar o DatePicker` → [resultado esperado] `Botão deve bloquear caso tente ir para uma data futura (maior que hoje)`.
