---
name: github-ops
description: Headless Git & GitHub CLI operations — commits, branches, PRs, and release automations without manual interaction. Token-driven workflow.
triggers: [git, github, commit, pr, pull request, branch, repo, gh, push, release]
---

# GitHub Operations & Automation Guide (Headless)

Operational standards for autonomous Git and GitHub CLI operations in CI/CD and AI agent environments.

---

## 1. Headless Authentication (Mandatory)

**NEVER** execute `gh auth login` directly — it opens an interactive browser prompt and hangs the execution environment.

### PowerShell (Windows)
```powershell
# Load GH_TOKEN silently from .env
$env:GH_TOKEN = (Get-Content .env | Select-String "GH_TOKEN").Line.Split("=")[1].Trim()
```

### Bash (Linux/macOS)
```bash
export GH_TOKEN=$(grep '^GH_TOKEN=' .env | cut -d '=' -f2)
```

Required `.env` entry:
```env
GH_TOKEN=ghp_YOUR_TOKEN_HERE
```
*Permissions required*: `repo`, `workflow`, `read:org`.

---

## 2. Identity Configuration & MinGit Windows Fallback

### Local Identity Setup
If "Author identity unknown" error occurs:
```bash
git config user.name "AI Agent"
git config user.email "agent@saas-builder.local"
```

### Windows MinGit Fallback
When standard `git` is not in PowerShell `$env:PATH`:
```powershell
$git = "C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe"
& $git status
& $git add .
& $git commit -m "feat(auth): add supabase ssr session handler"
& $git push origin main
```

---

## 3. Essential Commands & Conventional Commits

### Status & Inspection
```bash
git status
git log --oneline -5
git diff --stat HEAD
```

### Conventional Commit Format
```bash
git add .
git commit -m "<type>(<scope>): <concise description>"
git push origin <branch-name>
```

| Type | Purpose | Example |
|---|---|---|
| `feat` | New feature or capability | `feat(auth): implement oauth pkce callback` |
| `fix` | Bug fix or regression patch | `fix(db): handle null organization id in rls` |
| `refactor`| Code restructuring without behavior change | `refactor(ui): extract card header component` |
| `docs` | Documentation update | `docs(readme): add docker deployment guide` |
| `chore` | Build/deps maintenance | `chore(deps): upgrade next to 14.2.0` |

### Branch Management
```bash
git checkout -b feature/short-name
git push -u origin feature/short-name
```

---

## 4. GitHub Flow & CLI (`gh`) Automation

### 1. Criar Issue Antes de Codificar
Toda nova feature, correção de bug ou melhoria DEVE ter uma Issue aberta:
```bash
gh issue create \
  --title "feat(<modulo>): <descricao concisa>" \
  --body "## Objetivo`n`n<Descricao do que sera feito>`n`n## Criterios de Aceite`n- [ ] Criterio 1`n- [ ] Criterio 2"
```

### 2. Criar Branch Dedicada
```bash
git checkout -b feature/<id>-<descricao-curta>
# ou para bugs:
git checkout -b fix/<id>-<descricao-curta>
```

### 3. Criar Pull Request com Vínculo (`Closes #ID`)
O PR deve obrigatoriamente referenciar a Issue criada para fechamento automático:
```bash
gh pr create \
  --title "feat(<modulo>): <descricao concisa>" \
  --body "## Resumo`nImplementa <modulo> conforme spec.`n`n## Issue Relacionada`nCloses #<numero-da-issue>`n`n## Alteracoes`n- Adicionado <x>`n- Atualizado <y>`n`n## Testes Realizados`n- [x] Build compila sem erros`n- [x] Testes unitarios passando" \
  --base main \
  --head feature/<id>-<descricao-curta>
```

### 4. CI Status & Release
```bash
# Verificar status do CI GitHub Actions
gh run list --limit 5
gh run view <run-id> --log-failed

# Automacao de Releases
gh release create v1.0.0 --title "v1.0.0 — Production Release" --notes "Release de producao validada"
```

---

## 5. Security Rules & Pre-Commit Verification

| ❌ Forbidden | ✅ Required Standard |
|---|---|
| `git push --force` to main | Standard push or `--force-with-lease` on feature branch |
| Committing `.env` / credentials | Verify `.env*` in `.gitignore` |
| Committing `node_modules/` or `.next/` | Check `.gitignore` before initial commit |
| Plaintext tokens in code | Store strictly in environment variables |
| Interactive `gh auth login` | Headless `$env:GH_TOKEN` / `export GH_TOKEN` |

### Pre-Commit Checklist
Before committing:
- [ ] No `.env` or sensitive credentials staged (`git status`)
- [ ] TypeScript passes with zero errors: `cmd.exe /c "npx tsc --noEmit"`
- [ ] Production build succeeds: `cmd.exe /c "npm run build"`
- [ ] Commit message follows conventional format
