---
name: sdd-proposal
description: "Planejamento e especificação física determinística (SDD) rápida e direta para Antigravity 2.0. Um único agente inspeciona o código legado, consulta Obsidian e Grafo, e gera proposal.md, design.md e spec-plan.md com Hard Stop obrigatório (sem subagentes)."
triggers: [proposal, planejar feature, criar spec, planejar, sdd-proposal, especificação, vibe-proposal]
---

# 📋 SDD Proposal — Planejamento Rápido, Direto & Anti-Alucinação

<skill>
<overview>
Transforma requisitos em uma especificação técnica determinística física em `specs/<id>/` de forma rápida e direta por um único agente (sem latência de subagentes). Inspeciona código legado e dependências reais para garantir alucinação zero, finalizando com Hard Stop obrigatório.
</overview>

<guardrails>
- <rule type="prohibition">NÃO ESCREVA CÓDIGO de implementação nesta fase (src/, lib/, supabase/). Seu único output são arquivos .md em specs/<id>/.</rule>
- <rule type="execution">Execução direta por UM ÚNICO AGENTE. Não lance subagentes por tarefa (zero invoke_subagent).</rule>
- <rule type="mandatory">Inspecione o código legado e a memória Obsidian ANTES de propor. Zero suposições de tipos.</rule>
- <rule type="requirements">Toda spec exige obrigatoriamente: 1 Happy Path, 1 Edge Case, Critérios de Aceitação Verificáveis, Lista de Arquivos Afetados e Plano de Rollback.</rule>
- <rule type="circuit_breaker">PARADA OBRIGATÓRIA (HARD STOP) no final. Proibido auto-engatar o apply ou marcar tasks no spec-plan.</rule>
</guardrails>

<workflow_steps>
<step number="1" name="Scan Rápido de Contexto (Legado + Grafo + Memória)">
Execute diretamente no seu contexto em menos de 1 minuto:
1. **Memória Obsidian:** Leia a memória relevante em `.agent/memory/` (`ui.md`, `supabase.md`, `auth.md` ou `domain.md`).
2. **Grafo / Dependências:** Execute `graphify explain "<modulo-central>"` para saber quem depende do arquivo que você vai mexer (ou use `grep_search` para rastrear imports).
3. **Código Legado (AST Skeleton):** Abra os arquivos legados existentes com `view_file` e copie as interfaces TypeScript reais e tipos de retorno. **Proibido inventar tipos de cabeça.**
4. **Anti-Duplicação:** Se a tabela, componente ou função já existe no projeto, **REUTILIZE**. Não crie stubs duplicados.
5. **Roteamento de Skills Especializadas (Carregamento Sob Demanda):**
   Consulte as skills canônicas do domínio afetado ANTES de redigir a especificação:
   - **Se envolver UI / Telas / Componentes:** Consulte `DESIGN.md` e `skills/frontend-design-pro/SKILL.md`. A spec DEVE exigir tokens do design system (Zinc-950), superfícies por luminância (dark.design), conformidade com os 48 princípios de Rauno Freiberg e bloqueio de anti-patterns do catálogo de AI Slop.
   - **Se envolver Backend / Server Actions / APIs:** Consulte `skills/backend-patterns/SKILL.md`. A spec DEVE exigir Server Actions tipadas com `ActionResult<T>`, validação com Zod e mutações CRUD com revalidação de cache.
   - **Se envolver Banco de Dados / Migrations:** Consulte `skills/database/SKILL.md`. A spec DEVE exigir migrations idempotentes (`IF NOT EXISTS`), políticas de RLS multi-tenant (`tenant_id`) e índices de query.
   - **Se envolver Autenticação / Sessão / Permissões:** Consulte `skills/auth/SKILL.md` e `skills/security/SKILL.md`. A spec DEVE exigir `getUser()` no servidor (zero `getSession()`), Taint Analysis de entradas e salvaguardas OWASP Top 10.
</step>

<step number="2" name="Geração Rápida da Tríade SDD">
Crie os 3 arquivos essenciais em `specs/<id>/`:

1. `specs/<id>/proposal.md`:
   - **Problema:** O que está quebrando ou faltando.
   - **Solução Proposta:** O que será feito e escopo técnico.
   - **Skills Especializadas Aplicadas:** Liste quais skills de domínio foram consultadas (`frontend-design-pro`, `backend-patterns`, `database`, `security`, `auth`).
   - **Contratos de Dados:** Tabelas, colunas, RPCs ou tipos de API.
   - **Arquivos Afetados:** Lista explícita separando [Arquivos Existentes Reutilizados/Modificados] de [Arquivos Novos].
   - **Plano de Rollback:** Estratégia clara para reverter as alterações sem perda de dados caso a implementação falhe ou seja cancelada.
   - **Risco Principal:** O que pode quebrar e estratégia de mitigação.

2. `specs/<id>/design.md`:
   - **Arquitetura de Fluxo:** Caminho ponta a ponta dos dados (Source -> Sanitizer/Zod -> Server Action -> Database/RLS -> UI).
   - **Design System & UI Standards (se houver frontend):** Tokens exatos de `DESIGN.md`, componentes base do `skills/ui-components/SKILL.md`, micro-interações ≤200ms de `skills/ui-motion/SKILL.md` e zero AI Slop.
   - **Interfaces TypeScript Reais:** Interfaces exatas sem `any`, tipos de Server Action `ActionResult<T>` e schemas Zod.
   - **Cenários Obrigatórios:**
     - **Happy Path:** Fluxo nominal completo esperado com sucesso.
     - **Edge Case:** Pelo menos 1 cenário de falha, dados ausentes (Empty States), timeout ou concorrência.
   - **Critérios de Aceitação Verificáveis:** Condições claras e testáveis (ex: "Build passa sem erros de TS", "Query retorna 200 com payload X", "Botão desabilita durante loading", "Zero segredos no código").
   - **2 Cenários de Teste:** [SCAN -> INFER -> VERIFY -> FIX] aplicando as regras de bom senso de `references/inference-rules.md` (Empty States, feedback visual, skeletons de loading e confirmação de exclusão).

3. `specs/<id>/spec-plan.md`:
   - Lista enxuta de tasks atômicas marcadas estritamente como `- [ ] Pending` agrupadas por domínio (ex: `[DB]`, `[BACKEND]`, `[FRONTEND]`, `[SECURITY/TEST]`).
   - Cada task deve ter a skill canônica de referência e o critério de verificação via terminal atrelado.
</step>

<step number="3" name="Apresentação e Hard Stop Obrigatório">
Apresente ao usuário:
- Resumo da Spec criada (`specs/<id>/`)
- Arquivos legados reutilizados vs novos
- Checklist do `spec-plan.md`
- Plano de Rollback e Critérios de Aceitação

<hard_stop>
<directive>
PARE IMEDIATAMENTE AQUI.
- NÃO chame nenhuma ferramenta de código nem crie arquivos fora de specs/.
- NÃO execute comandos de modificação em src/, lib/ ou supabase/.
- NÃO marque nenhuma task como [/] ou [x].
- Finalize sua resposta exclusivamente informando:
  "Especificação da Spec <id> concluída. Aguardando sua aprovação. Para implementar, digite: /vibe-apply <id> (ou /sdd-apply <id>)."
</directive>
</hard_stop>
</step>
</workflow_steps>
</skill>
