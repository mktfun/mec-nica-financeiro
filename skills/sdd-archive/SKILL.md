---
name: sdd-archive
description: "Conclusão definitiva do ciclo SDD para Antigravity 2.0 — Quality Gate de build, escrita obrigatória na memória Obsidian por categoria, elevação de regras universais /learn, atualização do grafo e commit controlado."
triggers: [archive, arquivar spec, commitar spec, finalizar feature, sdd-archive, vibe-archive]
---

# 📦 SDD Archive — Consolidação de Memória, Grafo & Commit

<skill>
<overview>
Conclui o fluxo da Spec garantindo que a entrega não quebrou o build, registrando o conhecimento adquirido na memória persistente Obsidian por categoria, atualizando o grafo de dependências e efetuando o commit controlado no repositório.
</overview>

<guardrails>
- <rule type="mandatory">Build obrigatório. Se o build falhar, é proibido commitar ou arquivar.</rule>
- <rule type="mandatory">Escrita de memória obrigatória. NUNCA pule o registro de lições na memória modular.</rule>
- <rule type="prohibition">JAMAIS use git push --force.</rule>
- <rule type="safety">Arquivos voláteis em .tmp/ nunca devem ser incluídos no commit.</rule>
</guardrails>

<steps>
<step number="1" name="Quality Gate & Auditor Verification">
Execute o build completo da aplicação:
```bash
cmd.exe /c "npm run build"
```
Se o build falhar, pare a execução imediatamente. O archive é proibido em código com erro de TypeScript ou compilação.
</step>

<step number="2" name="Escrita na Memória Modular Obsidian">
Leia `skills/obsidian/SKILL.md`. Identifique a categoria de conhecimento gerada e grave no arquivo correspondente em `.agent/memory/`:
- `memory/ui.md`: Componentes criados, convenções visuais, seletores Tailwind.
- `memory/supabase.md`: Tabelas novas, RPCs, regras de RLS, triggers.
- `memory/auth.md`: Sessões, tokens, middlewares de proteção.
- `memory/infra.md`: Configurações de VPS, Cloudflare, domínios, deploy.
- `memory/domain.md`: Lógica e regras de negócio do produto.

<template>
```markdown
## [YYYY-MM-DD] — [Feature ID: <id>]

**Contexto:** O que foi implementado e qual problema resolvia.
**Regra aprendida:** A lógica crítica que não pode ser esquecida.
**Risco identificado:** O que quase quebrou ou pode quebrar no futuro.
**Não fazer:** Anti-pattern explicitamente identificado.
```
</template>
</step>

<step number="3" name="Self-Annealing & Elevação para a Constituição (/learn)">
Avalie: *"Algum comportamento da IA gerou erro que não deve se repetir em NENHUM projeto futuro?"*
- Se SIM: Proponha ao usuário e, com aprovação, injete a regra universal em `.agent/rules/ia.md`.
- Se NÃO: Registre explicitamente que nenhum guardrail universal foi identificado nesta iteração.
</step>

<step number="4" name="Atualização do Grafo Topológico">
Reindexe os arquivos modificados para manter o grafo 100% sincronizado com a realidade do código:
```bash
graphify update
```
</step>

<step number="5" name="Atualização do Mapa Global de Features">
Adicione os artefatos novos criados nesta iteração em `specs/global/features.md`:
- Componentes e hooks novos
- Tabelas e RPCs novas
- Regras de negócio implementadas
Isso alimenta o bloqueio anti-duplicação das próximas propostas.
</step>

<step number="6" name="Arquivamento da Spec">
Mova a pasta de spec ativa para o diretório de histórico:
```powershell
Move-Item "specs/<id>" "specs/archive/<id>"
```
</step>

<step number="7" name="Commit & Push Controlado">
```bash
git add .
git commit -m "feat(<id>): <resumo do que foi implementado>"
git push origin main
```
Inclua no commit: código modificado, `graphify-out/`, `specs/archive/`, `.agent/memory/` e `.agent/rules/ia.md`.
</step>
</steps>

<completion>
Notifique o usuário com o resumo:
- ✅ Build verificado
- 📝 Lições registradas na memória Obsidian
- 📊 Grafo de dependências atualizado
- 📦 Spec arquivada em `specs/archive/<id>/`
- 🔗 Hash do commit gerado
</completion>
</skill>
