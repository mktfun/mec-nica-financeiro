---
name: ia
trigger: always_on
---

# 🪐 Antigravity Vibe Coding Orchestration Rules v4 (2026 Edition)

## 0. ⛔ OVERRIDE SUPREMO (Prioridade Máxima — acima de tudo)

**Se o usuário mencionar `/teamwork-preview`, pedir uma análise conjunta ou delegar para equipe de IA: PARE TUDO IMEDIATAMENTE.** Não conclua o step atual, não tente resolver sozinho, não ignore. Acione os subagentes via `invoke_subagent` e siga o protocolo de delegação. Isto se aplica em qualquer workflow.

## 1. Core Principles

- **Desconfie do Vibe Coding Puro**: Nenhuma feature grande deve ser iniciada escrevendo código direto. Toda mudança estrutural precisa de uma Especificação (Proposal) com arquivos físicos em `specs/` antes.
- **Memória Modular**: O agente deve aprender categoricamente. Antes de qualquer task, leia os arquivos relevantes em `.agent/memory/` (ex: `memory/supabase.md`, `memory/ui.md`, `memory/ofx.md`). O que for aprendido em `/vibe-apply` deve ser consolidado por categoria em `/vibe-archive` — não jogar tudo num `memory.md` geral.
- **Headless CLI Enforcement**: JAMAIS use comandos interativos que exijam browser ou input no terminal. Para autenticação no Github ou Supabase, carregue silenciosamente do `.env` usando SOMENTE e EXCLUSIVAMENTE variáveis de ambiente (`GH_TOKEN` e `SUPABASE_ACCESS_TOKEN`).
- **CLI Fallback Obrigatório**: Se o comando `git` não for encontrado no `PATH`, use o caminho absoluto do MinGit: `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`.
- **Regras Estritas de PowerShell**: NUNCA utilize o operador `&` para encadear comandos no PowerShell. Use `;` ou execute os comandos um por vez. Se houver erro de Execution Policy com scripts `.ps1` (como `npm.ps1`), envolva o comando em um subshell CMD: `cmd.exe /c "seu comando aqui"`.
- **Git Identity Override**: Caso ocorra o erro "Author identity unknown" no momento do commit, configure imediatamente as propriedades locais antes de commitar: `git config user.email "ai@clawhub.com"` e `git config user.name "ClawHub Agent"`.
- **Validação Prévia de QA Visual**: A IA DEVE validar explicitamente a existência de credenciais de teste (ex: `TEST_USER_EMAIL` e `TEST_USER_PASSWORD`) no `.env` antes de acionar qualquer fluxo automatizado de Playwright (E2E) em rotas protegidas por autenticação. Se não existirem, o teste deve ser interrompido imediatamente (Bloqueado por Segurança de Auth) para evitar falsos timeouts.
- **Optimistic UI em Realtime**: Mutações otimistas que dependem de hooks de tempo real (como `useChat` ou webhooks) devem ser executadas **imediatamente** na UI. O `insert`/`update` no banco de dados deve ocorrer como *background promise* (sem `await` bloqueante na mesma thread que alimenta a interface), para evitar starvation e congelamento da UI (ex: exigindo refresh/F5 para ver mensagens).

## 2. ⛔ Regra Anti-Alucinação e Repetição

**ANTES de criar qualquer coisa nova, você DEVE pesquisar o que já existe, ler a Memória e consultar o Grafo.**

- **No Frontend**: Leia `memory/ui.md`. Consulte `spec/global/features.md`. Ative as skills `frontend-design-pro` e `afrexai-nextjs-production`.
- **No Backend**: Leia `memory/supabase.md`. Verifique o schema existente. Ative as skills `supabase` (com RLS) e `backend`.
- **Graphify (Anti-Alucinação):** O Graphify é uma ferramenta **Python** (não NPM). Comandos corretos:
  - Instalar: `uv tool install graphifyy` (dois Y's no pacote, um Y no comando)
  - Consultar: `graphify query "<feature>"` ou `graphify explain "<Modulo>"`
  - Atualizar: `graphify update`
  - NUNCA use `npx @baml/graphify` — esse pacote não existe
- **Geral**: Se já existe → USE. Crie um wrapper se precisar, NÃO duplique. NUNCA crie tabela, RPC, ou política sem verificar o que existe no banco e na memória.

- **Validação Estrita de Schema Supabase**: No PL/pgSQL, o PostgreSQL muitas vezes mascara colunas inexistentes durante o `CREATE FUNCTION`, quebrando a aplicação em tempo real com `400 Bad Request`. O agente NUNCA deve inventar, assumir ou tentar adivinhar nomes de colunas. Antes de montar ou atualizar queries SQL, o agente é OBRIGADO a verificar o schema exato da tabela referenciada (lendo as migrations anteriores ou `.agent/memory/supabase.md`).

## 3. Workflows Oficiais

Toda iteração passa exclusivamente por estes comandos:

1. `/setup`: Cria as pastas locais, memory.md e inicializa as integrações com ClawHub no projeto atual.
2. `/vibe-proposal "Feature name"`: Planejamento guiado. Lê a memória com `obsidian`, raciocina com `bayesian-reasoning` e `adaptive-reasoning`. Cria `specs/<id>/proposal.md`, `design.md` e `spec-plan.md`.
3. `/vibe-apply <id>`: Implementação hardcore baseada nos 3 arquivos de spec. Usa as skills especialistas (React, Supabase, etc). Salva save-state no `spec-plan.md`.
4. `/vibe-archive <id>`: Build gate, memória modular, **/learn** (eleva guardrails universais para este arquivo `ia.md`), Graphify update, arquiva spec, commit + push.
5. `/learn` (manual): Pode ser invocado isoladamente para elevar uma aprendizagem crítica para `ia.md` fora do ciclo normal de archive.

## 4. Skills Integradas (ClawHub)
Você opera sob a jurisdição de 8 skills fundamentais. Elas não precisam ser ativadas via bundles porque os workflows já invocam as combinações exatas no momento certo:
- Raciocínio: `deciqai-bayesian-reasoning`, `adaptive-reasoning`
- Engenharia: `frontend-design-pro`, `frontend-design-3`, `afrexai-nextjs-production`, `backend`, `supabase`
- Memória e DevOps: `obsidian`, `github`

## 5. Regra de Separa��o de Fontes Financeiras (Ledger vs. Receivables)

**NUNCA** insira em 	ransactions dados que v�m de relat�rios de adquirentes (Rede, Cielo, Stone, planilhas de maquininha), mesmo que exista l�gica de "match" com OS ou OFX.

- 	ransactions = Livro-Raz�o banc�rio. Apenas dados parseados de arquivos **OFX** s�o inseridos aqui.
- eceivables = Receb�veis e vendas. Dados da Rede, Maquininha e Cart�o v�o aqui via savePatioOsAndReceivables.
- Misturar as duas fontes em 	ransactions causa dupla contagem no Faturamento e no Extrato, pois o OFX j� registra a entrada real quando o adquirente liquida a venda.

**Guardrail:** Antes de qualquer .push() em arrays que alimentam useBulkInsertTransactions, responda: **"Este dado veio de um OFX?"** � Se n�o, ele N�O vai para 	ransactions.

## 6. Regra: Inspecionar Antes de Teorizar (Zero Presun��es sobre Estrutura de Arquivos)

**ANTES** de diagnosticar qualquer problema relacionado a parsing, importa��o ou estrutura de arquivos (OFX, XLSX, CSV, JSON, ZIP), a IA DEVE:

1. Verificar se o arquivo est� dispon�vel no sistema (Downloads, workspace, etc.)
2. Ler o conte�do real do arquivo antes de qualquer diagn�stico
3. **NUNCA** afirmar que um arquivo � "global", "corporativo", "compartilhado" ou tem qualquer estrutura espec�fica sem evid�ncia direta do conte�do do pr�prio arquivo

O crit�rio de verdade � sempre o arquivo, n�o a teoria da IA.

**Comportamento proibido:** Diagnosticar "o OFX � um extrato corporativo �nico compartilhado entre lojas" sem ter lido o arquivo.
**Guardrail:** Se o usu�rio mencionar arquivo de dados e h� um problema de parsing/estrutura, SEMPRE pe�a o arquivo ou inspecione antes de teorizar.

## 7. Regra: git status Obrigat�rio Antes de Qualquer Commit

**SEMPRE** execute git status (ou C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe status) ANTES de qualquer sequ�ncia de git add + git commit + git push.

Verifique EXPLICITAMENTE:
- Changes not staged for commit ? arquivos modificados mas n�o adicionados ao stage
- Untracked files ? arquivos novos criados mas n�o rastreados
- Changes to be committed ? confirme que todos os artefatos da sess�o est�o listados

**Comportamento proibido:** Fazer commit + push sem rodar git status primeiro, presumindo que todos os arquivos editados foram automaticamente inclu�dos.
**Guardrail:** Use git add -A ou liste explicitamente cada arquivo modificado na sess�o para garantir que nada fica fora do commit. Um commit incompleto para produ��o (Lovable, Vercel, etc.) pode fazer o usu�rio levar uma build quebrada com parte das corre��es aplicadas e parte faltando.

