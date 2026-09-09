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
</step>

<step number="2" name="Geração Rápida da Tríade SDD">
Crie os 3 arquivos essenciais em `specs/<id>/`:

1. `specs/<id>/proposal.md`:
   - **Problema:** O que está quebrando ou faltando.
   - **Solução Proposta:** O que será feito e escopo técnico.
   - **Contratos de Dados:** Tabelas, colunas, RPCs ou tipos de API.
   - **Arquivos Afetados:** Lista explícita separando [Arquivos Existentes Reutilizados/Modificados] de [Arquivos Novos].
   - **Plano de Rollback:** Estratégia clara para reverter as alterações sem perda de dados caso a implementação falhe ou seja cancelada.
   - **Risco Principal:** O que pode quebrar e estratégia de mitigação.

2. `specs/<id>/design.md`:
   - **Arquitetura de Fluxo:** Caminho ponta a ponta dos dados.
   - **Interfaces TypeScript Reais:** Interfaces exatas sem `any`.
   - **Cenários Obrigatórios:**
     - **Happy Path:** Fluxo nominal completo esperado com sucesso.
     - **Edge Case:** Pelo menos 1 cenário de falha, dados ausentes (Empty States), timeout ou concorrência.
   - **Critérios de Aceitação Verificáveis:** Condições claras e testáveis (ex: "Build passa sem erros de TS", "Query retorna 200 com payload X", "Botão desabilita durante loading").
   - **2 Cenários de Teste:** [SCAN -> INFER -> VERIFY -> FIX] aplicando as regras de bom senso de `references/inference-rules.md` (Empty States, feedback visual, skeletons de loading e confirmação de exclusão).

3. `specs/<id>/spec-plan.md`:
   - Lista enxuta de tasks atômicas marcadas estritamente como `- [ ] Pending` (ex: `[DB]`, `[BACKEND]`, `[FRONTEND]`, `[TEST]`).
   - Cada task deve ter um critério de verificação atrelado.
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
