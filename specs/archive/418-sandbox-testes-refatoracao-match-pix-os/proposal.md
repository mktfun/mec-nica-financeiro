# 📋 Proposta Técnica — Spec 418: Sandbox de Testes e Refatoração do Algoritmo de Match de PIX/OS

## 1. Contexto & Diagnóstico

O algoritmo de conciliação bancária existente (`autoMatchingEngine.ts`) apresenta fragilidades estruturais que geram **falsos positivos graves** no cruzamento de transações bancárias (PIX do extrato OFX) com Ordens de Serviço (OSs):
1. **Priorização Indevida de Similaridade Textual:** Em camadas de matching (especialmente Tier 1.5 e Tier 1), nomes e sobrenomes comuns da língua portuguesa (ex: *Silva*, *Souza*, *Santos*, *Lima*, *Pereira*, *Oliveira*, *Maria*, *João*) satisfazem critérios frouxos de tokenização (`if (ct.length >= 4) return true;`).
2. **Casamentos Discrepantes de Valor:** Devido a essa heurística falha, transações bancárias de baixo valor (ex: PIX avulso de R$ 50,00 de "Maria Silva") acabavam vinculando-se a OSs de alto valor (ex: R$ 1.500,00 de "Carlos Silva") simplesmente por coincidência de sobrenome, gerando distorções no faturamento e conciliação de filiais.
3. **Falta de Ambiente de Experimentação Segura:** Desenvolvedores e analistas não possuíam uma sandbox isolada para inspecionar o comportamento do algoritmo e avaliar logs de decisão sem alterar o banco de dados Supabase em produção.

---

## 2. Solução Proposta

### A. Rota Isolada de Sandbox (100% In-Memory)
- Criar a rota `src/routes/teste.import.tsx` (`/teste/import`) utilizando **TanStack Router**.
- Operação **100% in-memory**: Nenhuma mutação ou consulta de rede ao Supabase é executada.
- Interface orientada a auditoria com UI Dark Zinc-950 per `DESIGN.md`:
  - Visão geral com contadores de KPI (Confirmados, Falsos Positivos Evitados, Órfãos OFX e Órfãos OS).
  - Listagem dos pares confirmados com pontuação e justificativa do match.
  - Painel de **Falsos Positivos Evitados** explicitando onde houve similaridade de nome, mas o funil barrou pelo valor numérico ou data divergente.
  - Painel de Órfãos remanescentes de cada lado.
  - Visualizador de JSON bruto formatado com opção de cópia e editor interativo para testar cenários customizados.

### B. Heurística de Funil Determinística (`matchTransactionsV2`)
Isolar a lógica em função pura desacoplada em `src/lib/matchers/matchTransactionsV2.ts`:
- **Step 1 (Hard Match — Valor e Data):**
  - O valor do PIX (`abs(ofx.amount)`) deve coincidir estritamente com `os.parsed_pix_transfer` (se preenchido), `os.total_value` ou `os.paid_value`, respeitando tolerância contábil de arredondamento de até R$ 0,05.
  - A data da transação deve estar dentro da janela configurável (tolerância padrão: D-1 a D+1 em relação à OS ou data alvo).
  - Se NENHUMA OS atender aos critérios de valor e data, a transação bancária NÃO é vinculada. Se o nome da contraparte possuir semelhança com algum cliente, esse evento é registrado como **Falso Positivo Evitado**.
  - Se EXATAMENTE UMA OS atender a valor e data sem concorrência, o match é confirmado de forma unívoca (`exact_value_unique_period`).
- **Step 2 (Tie-breaker — String Similarity Decisivo):**
  - Apenas acionado se o Step 1 retornar **duas ou mais OSs candidatas** com idêntico valor na mesma janela temporal.
  - Higieniza termos de pagamento do memo ("PIX QRS", "PIX ENVIADO", "TRANSF", CPFs/CNPJs).
  - Executa desempate por similaridade de string (Levenshtein e Jaccard com exclusão de stopwords e sobrenomes ultra-comuns).
  - Caso a similaridade seja inconclusiva ou inferior ao limiar de segurança (0.6), o sistema **NÃO chuta**: ambas as OSs e a transação permanecem órfãs para revisão humana.

### C. Mock de Dados Rigoroso Baseado no Histórico
- Criar `src/lib/matchers/mockDataConciliacao.ts` contendo um payload realista com transações extraídas do histórico recente de conciliação:
  - Casos nominais de PIX com valor idêntico e nome claro.
  - Casos de colisão de valor (duas OSs de R$ 350,00 no mesmo dia) desempatadas com precisão pelo nome.
  - Casos clássicos de falso positivo (nomes com "Silva" e valores R$ 50 vs R$ 1.200) onde o funil rejeita.
  - Transações sem correspondência (órfãos bancários e de pátio).

---

## 3. Skills Especializadas Aplicadas

- `frontend-design-pro`: Padrões do `DESIGN.md` (Shadcn/UI + Tailwind Zinc-950), superfícies semânticas (`bg-background`, `bg-card`, `border-border`, `text-foreground`), zero cores arbitrárias, acessibilidade e micro-interações fluidas.
- `backend-patterns`: Funções puras sem efeitos colaterais, determinismo matemático, tipagem TypeScript estrita sem `any`.
- `security`: Sandbox 100% isolada do banco de dados, sem exposição de credenciais ou vazamento de estado.

---

## 4. Arquivos Afetados

### Novos Arquivos:
1. `src/lib/matchers/matchTransactionsV2.ts` (Algoritmo puro de funil Step 1 e Step 2)
2. `src/lib/matchers/mockDataConciliacao.ts` (Mock rigoroso de OFX e OSs para testes locais)
3. `src/routes/teste.import.tsx` (Página de sandbox visual no TanStack Router)
4. `specs/418-sandbox-testes-refatoracao-match-pix-os/proposal.md`
5. `specs/418-sandbox-testes-refatoracao-match-pix-os/design.md`
6. `specs/418-sandbox-testes-refatoracao-match-pix-os/spec-plan.md`

### Arquivos Existentes Modificados:
- *Nenhum arquivo de produção existente será alterado nesta fase*, garantindo **Blast Radius ZERO** para os fluxos existentes.

---

## 5. Plano de Rollback

Caso a rota ou o algoritmo precisem ser revertidos, basta remover os 3 arquivos criados (`src/routes/teste.import.tsx`, `src/lib/matchers/matchTransactionsV2.ts` e `src/lib/matchers/mockDataConciliacao.ts`). Nenhum dado em banco, tabela ou rota de produção é afetado.

---

## 6. Critérios de Aceitação Verificáveis

1. **Isolamento Total:** Acessar `/teste/import` no navegador sem que nenhuma requisição de rede ou mutação no Supabase seja disparada.
2. **Bloqueio de Falsos Positivos:** O caso de teste onde um PIX de "Silva" de R$ 50,00 disputa com uma OS de "Silva" de R$ 1.200,00 é rejeitado com sucesso e catalogado em `falsos_positivos_evitados`.
3. **Desempate Efetivo (Tie-break):** Havendo duas OSs de mesmo valor (ex: R$ 350,00) na mesma data, o Step 2 desempata corretamente pelo nome do cliente e vincula a OS correta.
4. **Interface Completa:** Renderização de métricas, cards de matches confirmados, lista de rejeições defensivas e visualizador de JSON bruto.
5. **Quality Gate:** `npm run build` passa com **Exit Code 0** sem nenhum erro de TypeScript.
