---
description: Planejamento cirúrgico de tarefas, priorizando planos curtos, pesquisa estruturada e hierarquia de objetivos.
---

<!-- OPENSPEC:START -->

**Prioridade de Execução (Hierarquia Mestra)**
1. Resolver a task pedida.
2. Não quebrar comportamento existente.
3. Alterar o mínimo possível na codebase.
4. Seguir padrões do projeto APENAS onde impactar a task atual.

**Modo de Pesquisa (Anti-Alucinação)**
- Não adivinhe código. Use `graphify query "feature"` para listar conexões reais ou ferramentas de busca como `grep_search`.
- **Exceção Frontend:** Para rastrear componentes (ex: Tailwind), use `graphify path "ComponentePai" "ComponenteFilho"` para mapear a hierarquia sem gastar tokens lendo arquivos complexos inteiros desnecessariamente.

**O Plano Curto (Obrigatório antes de codar)**
Gere o plano da task no seguinte formato estrito, sem abstrações ou burocracias de nomenclatura:
- **Arquivos a modificar:** (lista direta e mínima)
- **Motivo da mudança:** (ex: ligar estado do zustand ao supabase)
- **Definition of Done (DoD):** (checklist rápido. ex: botão clica e salva no banco sem erro)
- **Maior Risco:** (ex: quebrar as policies de RLS na tabela filha)

<!-- OPENSPEC:END -->
