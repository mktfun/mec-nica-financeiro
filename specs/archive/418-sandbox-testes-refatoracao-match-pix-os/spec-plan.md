# 📋 Plano de Implementação — Spec 418: Sandbox de Testes e Refatoração do Algoritmo de Match de PIX/OS

## Checklist de Tarefas

### [MOCK DATA]
- [x] Task 1: Criar `src/lib/matchers/mockDataConciliacao.ts` contendo um payload JSON realista de 10 transações OFX (PIX com memo, valores e datas) e 10 ordens de serviço (OSs com cliente, total, parsed_pix e datas) cobrindo casos de match exato, desempate e falsos positivos de nomes comuns.

### [PURE ALGORITHM / FUNNEL]
- [x] Task 2: Criar a função pura `matchTransactionsV2` em `src/lib/matchers/matchTransactionsV2.ts` implementando a Heurística de Funil em dois passos:
  - Step 1 (Hard Match): Filtro estrito por valor exato (`abs(ofx.amount) == os.parsed_pix_transfer` ou `total_value` ou `paid_value` com tolerância de R$ 0,05) e janela temporal (D-1 a D+1).
  - Step 2 (Tie-breaker): Desempate por similaridade de strings (Levenshtein e tokenização limpa sem stopwords) apenas para OSs que passaram pelo Step 1.
  - Registro explícito de `matches_confirmados`, `falsos_positivos_evitados` e `orphans`.

### [FRONTEND / SANDBOX UI]
- [x] Task 3: Criar a rota `src/routes/teste.import.tsx` com visualização 100% in-memory (sem conexão com Supabase), provendo:
  - Controles de parametrização (Data Alvo, Tolerância de Data, Tolerância de Valor).
  - Botão de execução "Rodar Conciliação Sandbox" e "Resetar Mocks".
  - Cards de KPI e abas para navegar entre Matches Confirmados, Falsos Positivos Evitados, Órfãos e JSON Bruto.
  - Formatação com design system Zinc-950 per `DESIGN.md`.

### [VERIFICATION / QA]
- [x] Task 4: Criar script Node de teste unitário/E2E em `scripts/test-match-v2.cjs` para validar programmaticamente todos os cenários de funil e imunidade a falsos positivos.
- [x] Task 5: Executar `npm run build` para validar compilação limpa do Vite e TanStack Router (Exit Code 0).
