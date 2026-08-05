---
name: ia
trigger: always_on
---

# ü™ê Antigravity Vibe Coding Orchestration Rules v4 (2026 Edition)

## 0. ‚õî OVERRIDE SUPREMO (Prioridade M√°xima ‚Äî acima de tudo)

**Se o usu√°rio mencionar `/teamwork-preview`, pedir uma an√°lise conjunta ou delegar para equipe de IA: PARE TUDO IMEDIATAMENTE.** N√£o conclua o step atual, n√£o tente resolver sozinho, n√£o ignore. Acione os subagentes via `invoke_subagent` e siga o protocolo de delega√ß√£o. Isto se aplica em qualquer workflow.

## 1. Core Principles

- **Desconfie do Vibe Coding Puro**: Nenhuma feature grande deve ser iniciada escrevendo c√≥digo direto. Toda mudan√ßa estrutural precisa de uma Especifica√ß√£o (Proposal) com arquivos f√≠sicos em `specs/` antes.
- **Mem√≥ria Modular**: O agente deve aprender categoricamente. Antes de qualquer task, leia os arquivos relevantes em `.agent/memory/` (ex: `memory/supabase.md`, `memory/ui.md`, `memory/ofx.md`). O que for aprendido em `/vibe-apply` deve ser consolidado por categoria em `/vibe-archive` ‚Äî n√£o jogar tudo num `memory.md` geral.
- **Headless CLI Enforcement**: JAMAIS use comandos interativos que exijam browser ou input no terminal. Para autentica√ß√£o no Github ou Supabase, carregue silenciosamente do `.env` usando SOMENTE e EXCLUSIVAMENTE vari√°veis de ambiente (`GH_TOKEN` e `SUPABASE_ACCESS_TOKEN`).
- **CLI Fallback Obrigat√≥rio**: Se o comando `git` n√£o for encontrado no `PATH`, use o caminho absoluto do MinGit: `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`.
- **Regras Estritas de PowerShell**: NUNCA utilize o operador `&` para encadear comandos no PowerShell. Use `;` ou execute os comandos um por vez. Se houver erro de Execution Policy com scripts `.ps1` (como `npm.ps1`), envolva o comando em um subshell CMD: `cmd.exe /c "seu comando aqui"`.
- **Git Identity Override**: Caso ocorra o erro "Author identity unknown" no momento do commit, configure imediatamente as propriedades locais antes de commitar: `git config user.email "ai@clawhub.com"` e `git config user.name "ClawHub Agent"`.
- **Valida√ß√£o Pr√©via de QA Visual**: A IA DEVE validar explicitamente a exist√™ncia de credenciais de teste (ex: `TEST_USER_EMAIL` e `TEST_USER_PASSWORD`) no `.env` antes de acionar qualquer fluxo automatizado de Playwright (E2E) em rotas protegidas por autentica√ß√£o. Se n√£o existirem, o teste deve ser interrompido imediatamente (Bloqueado por Seguran√ßa de Auth) para evitar falsos timeouts.
- **Optimistic UI em Realtime**: Muta√ß√µes otimistas que dependem de hooks de tempo real (como `useChat` ou webhooks) devem ser executadas **imediatamente** na UI. O `insert`/`update` no banco de dados deve ocorrer como *background promise* (sem `await` bloqueante na mesma thread que alimenta a interface), para evitar starvation e congelamento da UI (ex: exigindo refresh/F5 para ver mensagens).

## 2. ‚õî Regra Anti-Alucina√ß√£o e Repeti√ß√£o

**ANTES de criar qualquer coisa nova, voc√™ DEVE pesquisar o que j√° existe, ler a Mem√≥ria e consultar o Grafo.**

- **No Frontend**: Leia `memory/ui.md`. Consulte `spec/global/features.md`. Ative as skills `frontend-design-pro` e `afrexai-nextjs-production`.
- **No Backend**: Leia `memory/supabase.md`. Verifique o schema existente. Ative as skills `supabase` (com RLS) e `backend`.
- **Graphify (Anti-Alucina√ß√£o):** O Graphify √© uma ferramenta **Python** (n√£o NPM). Comandos corretos:
  - Instalar: `uv tool install graphifyy` (dois Y's no pacote, um Y no comando)
  - Consultar: `graphify query "<feature>"` ou `graphify explain "<Modulo>"`
  - Atualizar: `graphify update`
  - NUNCA use `npx @baml/graphify` ‚Äî esse pacote n√£o existe
- **Geral**: Se j√° existe ‚Üí USE. Crie um wrapper se precisar, N√ÉO duplique. NUNCA crie tabela, RPC, ou pol√≠tica sem verificar o que existe no banco e na mem√≥ria.

## 3. Workflows Oficiais

Toda itera√ß√£o passa exclusivamente por estes comandos:

1. `/setup`: Cria as pastas locais, memory.md e inicializa as integra√ß√µes com ClawHub no projeto atual.
2. `/vibe-proposal "Feature name"`: Planejamento guiado. L√™ a mem√≥ria com `obsidian`, raciocina com `bayesian-reasoning` e `adaptive-reasoning`. Cria `specs/<id>/proposal.md`, `design.md` e `spec-plan.md`.
3. `/vibe-apply <id>`: Implementa√ß√£o hardcore baseada nos 3 arquivos de spec. Usa as skills especialistas (React, Supabase, etc). Salva save-state no `spec-plan.md`.
4. `/vibe-archive <id>`: Build gate, mem√≥ria modular, **/learn** (eleva guardrails universais para este arquivo `ia.md`), Graphify update, arquiva spec, commit + push.
5. `/learn` (manual): Pode ser invocado isoladamente para elevar uma aprendizagem cr√≠tica para `ia.md` fora do ciclo normal de archive.

## 4. Skills Integradas (ClawHub)
Voc√™ opera sob a jurisdi√ß√£o de 8 skills fundamentais. Elas n√£o precisam ser ativadas via bundles porque os workflows j√° invocam as combina√ß√µes exatas no momento certo:
- Racioc√≠nio: `deciqai-bayesian-reasoning`, `adaptive-reasoning`
- Engenharia: `frontend-design-pro`, `frontend-design-3`, `afrexai-nextjs-production`, `backend`, `supabase`
- Mem√≥ria e DevOps: `obsidian`, `github`

## 5. Regra de SeparaÁ„o de Fontes Financeiras (Ledger vs. Receivables)

**NUNCA** insira em 	ransactions dados que vÍm de relatÛrios de adquirentes (Rede, Cielo, Stone, planilhas de maquininha), mesmo que exista lÛgica de "match" com OS ou OFX.

- 	ransactions = Livro-Raz„o banc·rio. Apenas dados parseados de arquivos **OFX** s„o inseridos aqui.
- eceivables = RecebÌveis e vendas. Dados da Rede, Maquininha e Cart„o v„o aqui via savePatioOsAndReceivables.
- Misturar as duas fontes em 	ransactions causa dupla contagem no Faturamento e no Extrato, pois o OFX j· registra a entrada real quando o adquirente liquida a venda.

**Guardrail:** Antes de qualquer .push() em arrays que alimentam useBulkInsertTransactions, responda: **"Este dado veio de um OFX?"** ó Se n„o, ele N√O vai para 	ransactions.

## 6. Regra: Inspecionar Antes de Teorizar (Zero PresunÁıes sobre Estrutura de Arquivos)

**ANTES** de diagnosticar qualquer problema relacionado a parsing, importaÁ„o ou estrutura de arquivos (OFX, XLSX, CSV, JSON, ZIP), a IA DEVE:

1. Verificar se o arquivo est· disponÌvel no sistema (Downloads, workspace, etc.)
2. Ler o conte˙do real do arquivo antes de qualquer diagnÛstico
3. **NUNCA** afirmar que um arquivo È "global", "corporativo", "compartilhado" ou tem qualquer estrutura especÌfica sem evidÍncia direta do conte˙do do prÛprio arquivo

O critÈrio de verdade È sempre o arquivo, n„o a teoria da IA.

**Comportamento proibido:** Diagnosticar "o OFX È um extrato corporativo ˙nico compartilhado entre lojas" sem ter lido o arquivo.
**Guardrail:** Se o usu·rio mencionar arquivo de dados e h· um problema de parsing/estrutura, SEMPRE peÁa o arquivo ou inspecione antes de teorizar.

## 7. Regra: git status ObrigatÛrio Antes de Qualquer Commit

**SEMPRE** execute git status (ou C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe status) ANTES de qualquer sequÍncia de git add + git commit + git push.

Verifique EXPLICITAMENTE:
- Changes not staged for commit ? arquivos modificados mas n„o adicionados ao stage
- Untracked files ? arquivos novos criados mas n„o rastreados
- Changes to be committed ? confirme que todos os artefatos da sess„o est„o listados

**Comportamento proibido:** Fazer commit + push sem rodar git status primeiro, presumindo que todos os arquivos editados foram automaticamente incluÌdos.
**Guardrail:** Use git add -A ou liste explicitamente cada arquivo modificado na sess„o para garantir que nada fica fora do commit. Um commit incompleto para produÁ„o (Lovable, Vercel, etc.) pode fazer o usu·rio levar uma build quebrada com parte das correÁıes aplicadas e parte faltando.
