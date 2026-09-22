# 📖 Manual de Operação Unificado: Antigravity 2.0 (Native AGY Edition)

Este manual é a fonte oficial de consulta e governança para desenvolvedores e agentes no ecossistema **Google Antigravity 2.0 (AGY)**.
Ele define a doutrina de execução, o ciclo determinístico de desenvolvimento (SDD), a integração com o grafo topológico e o padrão visual semântico.

---

## 1. Fundamentos da Doutrina Operacional

O Antigravity 2.0 foi arquitetado para superar as falhas comuns de desenvolvimento assistido por IA: o *loop de regressão* ("arruma hoje, quebra anteontem"), a *salada visual* e o *waffling* (prolixidade excessiva que causa amnésia de contexto).

### Os Três Pilares Invioláveis:
1. **Single-Agent Direct Execution (`Concurrency: 1`):**
   - A engenharia de software é executada diretamente pelo agente raiz do Antigravity.
   - Eliminou-se o mito do multi-agente descontrolado para código sequencial. Estudos no **SWE-bench** comprovaram que debates encadeados de IA degradam tarefas de software em **39% a 70%** e amplificam erros em até **17×** (*Error Compounding Trap*).
   - Subagentes são permitidos **apenas** para pesquisas paralelas de leitura (`read-only`) ou sob demanda explícita via `/council`.
2. **Output Policy Anti-Waffling:**
   - Comunicação de especialista para especialista: objetiva, técnica e concisa.
   - Zero pedidos de desculpas, zero prosa filosófica desnecessária.
   - Entregas estruturadas em: Diagnóstico breve -> Diff cirúrgico -> Relatório de terminal.
3. **Governança por Ferramentas e Guardrails:**
   - O agente nunca toma ações destrutivas (`git reset --hard`, exclusão de branches, force push) sem autorização explícita humana.

---

## 2. O Ciclo de Vida SDD (Spec-Driven Development)

O desenvolvimento é estruturado em uma máquina de estados finita determinística de 4 fases, com **Hard Stops (paradas obrigatórias)** entre elas:

```
[ Ideia / Tarefa ]
        │
        ▼
┌──────────────────┐
│  /sdd-proposal   │ ──(Mapeia Blast Radius com Graphify + Cria Tríade SDD)
└─────────┬────────┘
          │
    🛑 [HARD STOP: Aprovação Humana Obrigatória]
          │
          ▼
┌──────────────────┐
│    /sdd-apply    │ ──(Edição Cirúrgica + Build Gate no Terminal)
└─────────┬────────┘
          │
    🛑 [HARD STOP: Teste Humano em Localhost]
          │
          ▼
┌──────────────────┐
│   /sdd-archive   │ ──(Memória Obsidian + graphify update + Faxina + Commit)
└──────────────────┘
          │
          └─► Em caso de falhas complexas ou bugs: /sdd-debug
```

### 1. `/sdd-proposal <feature>` (Fase de Planejamento)
* **Objetivo:** Transformar a solicitação em uma especificação física determinística em `specs/<feature>/`.
* **Ações:**
  1. Consulta a inteligência topológica via `graphify explain "<modulo>"` para mapear o **Blast Radius** (quem depende dos arquivos a serem tocados).
  2. Consulta a memória modular em `.agent/memory/` e o catálogo de features em `specs/global/features.md`.
  3. Gera os 3 documentos: `proposal.md` (escopo e contratos), `design.md` (arquitetura e critérios de aceitação) e `spec-plan.md` (checklist atômico de tasks).
* **Parada Obrigatória:** **PROIBIDO** gerar código de implementação nesta fase. A IA encerra o turno e aguarda aprovação explícita.

### 2. `/sdd-apply <feature>` (Fase de Implementação Cirúrgica)
* **Objetivo:** Executar o checklist aprovado do `spec-plan.md`.
* **Ações:**
  1. Aplica alterações arquivo a arquivo via edições cirúrgicas pontuais (`replace_file_content`). **Proibida a reescrita de arquivos inteiros.**
  2. Atualiza o status das tasks no `spec-plan.md` (`[/] In Progress` -> `[x] Completed`).
  3. Executa o **Terminal Gate**: compilação via `npm run build` no terminal para garantir zero quebras de tipagem e bundling.
  4. **Zero Overhead de Frontend:** Desativados testes de browser/Playwright no apply para garantir velocidade máxima e zero latência.
* **Parada Obrigatória:** Ao passar no build, a IA encerra o turno e solicita a validação humana no navegador em localhost.

### 3. `/sdd-archive <feature>` (Fase de Consolidação e Entrega)
* **Objetivo:** Concluir a feature e garantir a persistência duradoura do conhecimento.
* **Ações:**
  1. Registra lições aprendidas em `.agent/memory/<categoria>.md` (Obsidian).
  2. Atualiza o grafo de dependências com `graphify update`.
  3. **Faxina de Resíduos (Step 6.1):** Esvazia a pasta `.tmp/`, remove backups `*.bak` e garante que caches brutos de AST (`graphify-out/cache/`) não sujem o Git.
  4. Move `specs/<feature>` para `specs/archive/<feature>`.
  5. Realiza o commit seletivo via allowlist rigorosa (PROIBIDO `git add .`).

### 4. `/sdd-debug <id-ou-erro>` (Fase de Diagnóstico Forense)
* **Objetivo:** Isolar e reparar bugs que resistem à correção inicial.
* **Ações:**
  1. Inspeciona logs reais e schema do banco via SQL.
  2. Formula até 3 hipóteses técnicas isoladas.
  3. Aplica **Fast Rollback**: se uma tentativa de reparo falhar, desfaz a alteração antes de formular a próxima hipótese, impedindo o "conserto sobre conserto".

---

## 3. Inteligência Topológica com Graphify

O **Graphify** é a ferramenta nativa de análise estática e grafo do Antigravity 2.0 (comando de terminal `graphify`, pacote Python `graphifyy`).

### Como Usar:
* **Mapear Impacto de Mudança:**
  ```bash
  graphify explain "src/features/auth/AuthService.ts"
  ```
  Mostra todas as funções, rotas e componentes que dependem deste serviço, evitando alterações que quebrem outros módulos.
* **Buscar no Grafo:**
  ```bash
  graphify query "reconciliação bancária"
  ```
* **Atualizar após Implementação:**
  ```bash
  graphify update
  ```

---

## 4. Design System & Theming Dark Semântico

A regra número 1 para evitar a salada visual (cards cinzas misturados com fundos pretos arbitrários) é: **Nenhum componente JSX/HTML pode conter cores brutas ou classes arbitrárias.**

### Dicionário de Tokens Semânticos (`DESIGN.md`):
* `bg-background`: Fundo principal da viewport (Canvas).
* `bg-card`: Superfícies elevadas (Cards, containers, painéis).
* `border-border`: Bordas delimitadoras.
* `text-foreground`: Texto de alto contraste (Títulos e labels principais).
* `text-muted-foreground`: Texto secundário (Legendas, metadados).
* `bg-primary text-primary-foreground`: Ações principais e botões CTA.

### Como Mudar para "Tudo Preto Absoluto (OLED)" sem Quebrar Nada:
Você **nunca** edita os componentes para trocar cores. Você ajusta apenas o `:root` em `src/globals.css`:
```css
:root {
  --background: 0 0% 0%;       /* Preto absoluto #000000 */
  --card: 0 0% 4%;             /* Superfície quase preta com elevação sutil */
  --border: 0 0% 12%;          /* Borda ultra sutil */
  --foreground: 0 0% 98%;      /* Branco nítido */
}
```
Como todos os componentes usam `bg-background` e `bg-card`, a aplicação inteira escurece de forma **100% harmônica e uniforme**, sem deixar nenhum card cinza solto.

---

## 5. Deliberação do Conselho Multi-Agente (`/council`)

O Conselho foi preservado para o seu propósito real: **discussão estratégica e stress-test de decisões arquiteturais difíceis**. Ele nunca roda sozinho no dia a dia.

### Como Disparar:
```text
/council Devemos migrar nossa autenticação de JWT customizado para Supabase SSR nativo com PKCE?
```

### Estrutura das 3 Rodadas:
1. **Round 1 (Posições):** 4 especialistas analisam o tema sob lentes opostas:
   - `Architect`: Escalabilidade, elegância de design e acoplamento.
   - `Engineer`: Pragmatismo, viabilidade imediata e facilidade de manutenção.
   - `Analyst`: Custos, métricas, riscos e ROI.
   - `Contrarian`: Advogado do diabo implacável que busca as falhas fatais da ideia.
2. **Round 2 (Refutação Obrigatória):** Cada agente lê o consolidado e é obrigado a refutar ou refinar pelo menos 2 argumentos dos colegas.
3. **Round 3 (Síntese e Veredito):** O `Synthesizer` lê a memória do debate e emite a decisão executiva final: `[GO]`, `[NO-GO]` ou `[NEEDS-REWORK]`.

---

## 6. Prevenção de Regressões e Conflitos de Código

Para garantir que uma alteração de hoje nunca quebre código de anteontem:

1. **Isolamento de Escopo (Blast Radius):** Se o ticket é para arrumar o parser de OFX, o agente só tem permissão de tocar no arquivo do parser. Arquivos de UI, rotas ou tabelas vizinhas estão congelados.
2. **Edição Cirúrgica Obrigatória:** É proibido reescrever o arquivo inteiro. A IA deve usar `replace_file_content` alterando apenas o bloco estritamente necessário.
3. **Rollback Imediato:** Se o build falhar, reverta a alteração (`git checkout -- <arquivo>`) antes de formular nova hipótese. Nunca construa código em cima de um arquivo já quebrado.
4. **Staging Seletivo:** Nunca use `git add .`. Sempre adicione individualmente apenas os arquivos validados pertencentes àquela spec.

---

## 7. Padrão de Observabilidade (Sentry Breadcrumbs & Capture)

Toda mutação sensível ou chamada externa de rede (pagamentos, webhooks, campanhas, envio de mensagens) deve registrar telemetria estruturada antes e durante a execução:

```typescript
import * as Sentry from "@sentry/nextjs";

export async function executeOperation(operationId: string, payload: any) {
  // 1. Breadcrumb estruturado antes de iniciar a operação
  Sentry.addBreadcrumb({
    category: "workflow",
    message: "Iniciando operacao estruturada",
    level: "info",
    data: { operationId, timestamp: new Date().toISOString() },
  });

  try {
    const result = await processAction(payload);
    return { success: true, result };
  } catch (error) {
    // 2. Captura contextual de erro com tags de busca e extras seguros
    Sentry.captureException(error, {
      tags: { feature: "operation-handler", operationId },
      extra: { payloadSafe: sanitize(payload) },
    });
    throw error;
  }
}
```

---

## 8. GitHub Flow & Pipeline de Qualidade CI/CD

Para garantir que o código só entre em produção após auditoria automática:

### 1. Ciclo de Branches e Issues:
* **Issue Obrigatória:** Aberta via `gh issue create` com requisitos e critérios de aceite antes de iniciar o código.
* **Branch Dedicada:** `feature/<id>-<nome>` ou `fix/<id>-<nome>`.
* **Pull Request com Fechamento Automático:**
  - O PR é aberto com o template canônico de `.github/PULL_REQUEST_TEMPLATE.md`.
  - A descrição **DEVE** conter `Closes #ID` para vincular e encerrar a issue no merge.

### 2. Pipeline de Qualidade no GitHub Actions (`.github/workflows/quality.yml`):
Todo PR disparado para a branch `main` executa:
1. `bun run lint`: Validação estática de estilo (Biome / ESLint).
2. `bun run typecheck`: Compilação TypeScript estrita (`tsc --noEmit`).
3. `bun run test`: Testes unitários de regras de negócio.
4. `bun run build`: Compilação final limpa de produção.

---

**Antigravity 2.0 — Engenharia Determinística, Rápida e Impecável.**