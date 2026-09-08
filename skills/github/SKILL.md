---
name: github
description: Operações Git e GitHub CLI headless — commits, branches, PRs e automações sem interação manual. Uso exclusivo de token via env var.
---

# GitHub — Guia Operacional para IA (Headless)

## Autenticação Headless (OBRIGATÓRIO)

**JAMAIS** rode `gh auth login` — isso abre o browser e trava o agente.

```powershell
# Carregar do .env silenciosamente (PowerShell)
$env:GH_TOKEN = (Get-Content .env | Select-String "GH_TOKEN").Line.Split("=")[1].Trim()
```

```bash
# Linux/Mac
export GH_TOKEN=$(grep GH_TOKEN .env | cut -d '=' -f2)
```

Variável necessária no `.env`:
```
GH_TOKEN=<personal access token com permissões: repo, workflow>
```

## Configuração Local de Identidade

Se ocorrer o erro "Author identity unknown":
```bash
git config user.email "ai@clawhub.com"
git config user.name "ClawHub Agent"
```

## Git Fallback Windows

Se o `git` não estiver no PATH do PowerShell:
```powershell
$git = "C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe"
& $git status
& $git add .
& $git commit -m "mensagem"
& $git push origin main
```

## Comandos Essenciais

### Status e Inspeção
```bash
git status
git log --oneline -10
git diff --stat HEAD
```

### Commit Padrão
```bash
git add .
git commit -m "tipo(escopo): descrição clara do que foi feito"
git push origin main
```

**Tipos de commit:**
- `feat`: nova funcionalidade
- `fix`: correção de bug
- `refactor`: refatoração sem mudança de comportamento
- `docs`: documentação
- `chore`: tarefas de manutenção (deps, config)

### Branches (se necessário)
```bash
git checkout -b feature/nome-da-feature
git push -u origin feature/nome-da-feature
```

### GitHub CLI (gh)
```bash
# Criar PR
gh pr create --title "feat: descrição" --body "Descrição detalhada"

# Ver status das actions
gh run list --limit 5

# Ver issues
gh issue list --limit 10
```

## Regras de Segurança Git

| ❌ Proibido | ✅ Correto |
|---|---|
| `git push --force` | `git push` normal ou `--force-with-lease` em último caso |
| Commitar `.env` | `.env` deve estar no `.gitignore` |
| Commitar `node_modules/` | Verificar `.gitignore` antes do primeiro commit |
| Strings de token/senha no código | Usar env vars |
| `gh auth login` interativo | Usar `GH_TOKEN` env var |

## Verificação Pré-Commit

Antes de fazer commit, confirme:
- [ ] Nenhum arquivo `.env` incluído no `git add`
- [ ] Nenhuma chave ou token hardcoded no código
- [ ] Build passa (`npm run build`)
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
