---
description: Conclusão do ciclo da Spec — Build gate, consolidação de memória modular, atualização do grafo Graphify e Git Commit.
---

<!-- VIBEARCHIVE:START -->

**Objetivo**
Consolidar todo o aprendizado gerado na iteração, manter a base de conhecimento viva e realizar o commit rastreável.

---

## Step 1 — Quality & Build Gate Final

```bash
cmd.exe /c "npm run build"
```
Confirme que o TypeScript e o bundler passam com zero erros.

---

## Step 2 — Consolidação de Memória Modular

Identifique o domínio da feature e atualize o arquivo correto em .agent/memory/:
- memory/supabase.md → Schemas, RPCs, RLS, otimizações de query
- memory/ui.md → Novos componentes reutilizáveis, hooks e micro-interações
- memory/domain.md → Regras de negócio descobertas e validações
- memory/infra.md → Deploy, portas, ambiente e configurações

**Formato da Entrada:**
```markdown
## [YYYY-MM-DD] — [Feature ID: <id>]
**Contexto:** O que foi entregue.
**Regra aprendida:** A regra essencial que futuros agentes devem seguir.
**Risco identificado / Anti-pattern:** O que NÃO deve ser feito.
```

---

## Step 3 — Atualização do Grafo de Conhecimento (Graphify)

```bash
graphify update
```
Garante que a ontologia do projeto e as dependências entre arquivos estejam sincronizadas.

---

## Step 4 — Atualização de Features Globais (spec/global/features.md)

Registre os novos artefatos para alimentar o bloqueio anti-duplicação de proposals futuras.

---

## Step 5 — Arquivamento da Spec & Git Commit

```bash
# Arquiva a spec concluída
Move-Item "specs/<id>" "specs/archive/<id>" -Force

# Commit limpo
git add .
git commit -m "feat(<id>): <resumo claro da entrega>"
```

---

## Step 6 — Notificação Final

Apresente o resumo final ao usuário:
- ✅ Build validado
- 📝 Memórias atualizadas em .agent/memory/
- 🕸️ Grafo Graphify atualizado
- 📦 Spec arquivada em specs/archive/<id>/
- 🚀 Commit gerado com sucesso

<!-- VIBEARCHIVE:END -->
