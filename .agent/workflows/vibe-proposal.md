---
description: Transforma requisitos em uma Especificação física completa (SDD) de forma rápida e direta por um único agente (sem subagentes) — inspeciona código legado com AST Skeleton, consulta Obsidian e Grafo, gerando a tríade de spec com Hard Stop.
---

<!-- OPENSPEC:START -->

<workflow name="vibe-proposal" execution_mode="single_agent_direct">

<overview>
Planejamento determinístico e rápido conduzido inteiramente pelo agente principal. Elimina overhead e latência de subagentes, mantendo rigor técnico absoluto.
</overview>

<guardrails>
- <rule type="prohibition">NÃO ESCREVA CÓDIGO de implementação nesta fase. Seu único output são arquivos .md em specs/<id>/.</rule>
- <rule type="execution">Execução direta por UM ÚNICO AGENTE. Não use invoke_subagent.</rule>
- <rule type="circuit_breaker">PARADA OBRIGATÓRIA (HARD STOP) no final. Proibido auto-engatar o apply.</rule>
</guardrails>

<steps>
<step number="1" name="Contexto Rápido: Memória + Grafo + Código Legado">
Execute diretamente em seu contexto:
1. **Memória Obsidian:** Leia a memória correspondente em `.agent/memory/` (`ui.md`, `supabase.md`, `auth.md` ou `domain.md`).
2. **Grafo:** Execute `graphify explain "<modulo-central>"` para mapear quem depende dos arquivos que serão tocados.
3. **Código Legado (AST Skeleton):** Use `view_file` nos arquivos legados reais e copie as interfaces TypeScript e tipos de retorno. Proibido supor tipos ou inventar mocks.
4. **Anti-Duplicação:** Se o componente, hook ou tabela já existe, REUTILIZE.
</step>

<step number="2" name="Geração da Tríade SDD">
Crie os 3 arquivos essenciais em `specs/<id>/`:

1. `specs/<id>/proposal.md`:
   - Problema, solução proposta, contratos de dados reais e risco principal mitigado.

2. `specs/<id>/design.md`:
   - Diagrama do fluxo, interfaces TypeScript reais copiadas do código legado e 2 cenários de teste (SCAN -> INFER -> VERIFY -> FIX).

3. `specs/<id>/spec-plan.md`:
   - Checklist atômico de tasks marcadas estritamente como `- [ ] Pending`.
</step>

<step number="3" name="Apresentação e Hard Stop Obrigatório">
Apresente ao usuário o resumo da Spec:
- Identificador: `specs/<id>/`
- Arquivos legados reutilizados vs novos
- Checklist do `spec-plan.md`

<hard_stop>
<directive>
PARE IMEDIATAMENTE AQUI.
- NÃO chame ferramentas adicionais de código.
- NÃO edite arquivos fora de specs/.
- NÃO marque nenhuma task como [/] ou [x].
- Finalize sua resposta exclusivamente com:
  "Especificação da Spec <id> concluída. Aguardando sua aprovação. Para implementar, digite: /vibe-apply <id>."
</directive>
</hard_stop>
</step>
</steps>

</workflow>
<!-- OPENSPEC:END -->
