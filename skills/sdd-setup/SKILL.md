---
name: sdd-setup
description: "Configuração inicial do ambiente headless para Antigravity 2.0 — validação de credenciais, bootstrap da memória modular Obsidian e indexação inicial do grafo determinístico com Graphify."
triggers: [setup, configurar ambiente, inicializar projeto, bootstrap, configurar tokens]
---

# 🚀 SDD Setup — Inicialização Headless & Bootstrap de Memória

<skill>
<overview>
Configura o ambiente de desenvolvimento de forma 100% headless (sem pop-ups ou navegador interativo). Inicializa os arquivos de memória persistente Obsidian em `.agent/memory/` e o grafo topológico de dependências com Graphify.
</overview>

<guardrails>
- <rule type="mandatory">Operação EXCLUSIVAMENTE headless. Jamais tente comandos interativos que exijam login no browser.</rule>
- <rule type="prohibition">NUNCA rode containers docker localmente. Containers rodam exclusivamente em VPS remota.</rule>
- <rule type="security">Nunca exiba tokens ou chaves em texto puro. Mantenha `.env` protegido e no `.gitignore`.</rule>
- <rule type="isolation">Credenciais de teste e agentes residem em `.agent/.env_agent`, separadas do `.env` da aplicação.</rule>
</guardrails>

<steps>
<step number="1" name="Validação de Credenciais">
Verifique a existência das variáveis de ambiente necessárias no arquivo `.env`:
- `GH_TOKEN` (GitHub Personal Access Token)
- `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_ID`

Se ausentes, solicite ao usuário os links diretos para emissão:
- GitHub PAT: https://github.com/settings/tokens
- Supabase Token: https://supabase.com/dashboard/account/tokens
</step>

<step number="2" name="Injeção Silenciosa Headless">
No Windows PowerShell, injete silenciosamente as variáveis antes de qualquer comando de CLI:
```powershell
$env:GH_TOKEN = "<valor>"
$env:SUPABASE_ACCESS_TOKEN = "<valor>"
git config --global user.name "Agent"
git config --global user.email "agent@project.local"
```
</step>

<step number="3" name="Bootstrap da Memória Modular Obsidian">
Crie os diretórios de estrutura do agente e os arquivos de memória vazios com cabeçalho padrão:
```bash
mkdir -p .agent/memory .agent/agents .agent/workflows .agent/rules specs/global
```

Inicialize cada arquivo em `.agent/memory/`:
- `memory/ui.md` (Padrões de UI, componentes criados, paleta, anti-patterns)
- `memory/supabase.md` (Tabelas, RPCs, regras de RLS, triggers)
- `memory/auth.md` (Sessão, permissões, JWT, middleware)
- `memory/infra.md` (Deploy, VPS, SSH, Cloudflare, domínios)
- `memory/domain.md` (Regras de negócio específicas do projeto)

Formato do cabeçalho inicial:
```markdown
# [Categoria] Memory — Projeto: [Nome]
> Criado em: [Data]. Atualizado pelo sdd-archive após cada feature.
<!-- Entradas adicionadas pelo sdd-archive -->
```
</step>

<step number="4" name="Indexação Inicial do Grafo (Graphify)">
O Graphify é um pacote Python (dois Y's no pacote, um Y no comando):
```bash
uv tool install graphifyy
graphify .
graphify update
```
Confirme a geração de `graphify-out/graph.json`.
</step>

<step number="5" name="Confirmação Final">
Execute um teste rápido de status:
```bash
gh auth status
supabase projects list
```
Reporte ao usuário que o setup foi concluído com sucesso.
</step>
</steps>
</skill>
