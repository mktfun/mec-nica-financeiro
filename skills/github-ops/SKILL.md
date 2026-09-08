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
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
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

## 4. GitHub CLI (`gh`) Automation

```bash
# Create Pull Request non-interactively
gh pr create --title "feat(api): add stripe billing webhook" --body "Implements webhook signature verification and plan status sync." --base main --head feature/stripe-billing

# Check GitHub Actions CI status
gh run list --limit 5
gh run view <run-id> --log-failed

# Release automation
gh release create v1.0.0 --title "v1.0.0 — Production Release" --notes "Initial production deployment"
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
