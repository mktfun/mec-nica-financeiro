---
name: sdd-debug
description: "Diagnóstico profundo e correção cirúrgica de bugs para Antigravity 2.0. Inspeciona logs reais (Next.js, Supabase, Edge), consulta o banco via SQL, formula hipóteses bayesianas e executa repair em até 3 tentativas."
triggers: [debug, corrigir bug, analisar erro, investigar erro, sdd-debug, vibe-debug]
---

# 🐛 SDD Debug — Investigação Forense & Auto-Healing

<skill>
<overview>
Diagnostica e corrige falhas em tempo de execução ou compilação através de evidências reais coletadas de logs, inspeção direta do PostgreSQL e memória histórica. Erradica tentativas cegas ou aleatórias de correção.
</overview>

<guardrails>
- <rule type="mandatory">Pesquisa real antes de tentar corrigir. Inspecione logs e banco de dados.</rule>
- <rule type="limit">Máximo de 3 tentativas de repair. Na 4ª tentativa execute git reset --hard HEAD e escale ao usuário.</rule>
- <rule type="memory">Ao solucionar um bug novo, registre a lição aprendida em .agent/memory/<modulo>.md.</rule>
</guardrails>

<protocol>
<step number="1" name="Captura e Localização de Falhas">
Capture a mensagem de erro exata e localize o arquivo afetado:
```bash
grep_search "<função ou termo citado no erro>" src/
grep_search "<mensagem de erro exata>" .
```
Consulte o grafo para entender quais componentes dependem desse módulo:
```bash
graphify explain "<modulo-com-bug>"
```
</step>

<step number="2" name="Pesquisa de Logs em Ordem de Prioridade">
<logs_provider type="Next.js">
Inspecione stderrs do build ou dev server e arquivos em `.next/server/`.
</logs_provider>

<logs_provider type="Supabase">
```bash
# Logs de API (erros de query, RLS, permissões)
supabase logs --project-ref $env:SUPABASE_PROJECT_ID --service api

# Logs de Autenticação (falha de login, tokens inválidos)
supabase logs --project-ref $env:SUPABASE_PROJECT_ID --service auth

# Logs de Edge Functions
supabase functions logs <nome-da-function> --project-ref $env:SUPABASE_PROJECT_ID
```
</logs_provider>
</step>

<step number="3" name="Inspeção Direta do Banco via SQL">
Se a falha envolver persistência, banco ou permissões:
```sql
-- Verificar colunas reais e tipos
SELECT column_name, data_type, is_nullable FROM information_schema.columns 
WHERE table_name = '<tabela>' AND table_schema = 'public';

-- Verificar políticas de segurança ativas (RLS)
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '<tabela>';

-- Verificar se a tabela tem RLS ativado
SELECT relname, relrowsecurity FROM pg_class WHERE relname = '<tabela>';
```
</step>

<step number="4" name="Formulação de Hipóteses Bayesianas">
Formule as 3 causas mais prováveis baseadas nas evidências colhidas:
- **Hipótese 1 (Alta P):** Causa raiz sustentada pelos logs -> Correção planejada.
- **Hipótese 2 (Média P):** Causa secundária caso a primeira falhe.
- **Hipótese 3 (Baixa P):** Edge case improvável.
</step>

<step number="5" name="Execução do Repair (Máximo 3 Tentativas)">
- **Tentativa 1:** Aplique a correção da Hipótese 1. Teste a compilação/teste. Se passou -> `[RESOLVED]`.
- **Tentativa 2:** Se falhou, reverta a tentativa 1 e aplique a Hipótese 2. Se passou -> `[RESOLVED]`.
- **Tentativa 3:** Abordagem alternativa documentada. Se passou -> `[RESOLVED]`.
- **Tentativa 4 -> FALHA CRÍTICA:**
  ```bash
  git reset --hard HEAD
  ```
  Pare imediatamente, apresente o diagnóstico completo ao usuário e solicite orientação.
</step>

<step number="6" name="Auto-Annealing (Registro na Memória Obsidian)">
Após solucionar o bug com sucesso, adicione a lição aprendida em `.agent/memory/<modulo>.md`:
```markdown
## [YYYY-MM-DD] — Bug: [Nome do Bug]
**Contexto:** O que causou a falha em runtime.
**Regra aprendida:** O que nunca deve ser feito ou esquecido neste módulo.
**Não fazer:** Anti-pattern identificado.
```
</step>
</protocol>
</skill>
