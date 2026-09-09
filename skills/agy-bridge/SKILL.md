---
name: agy-bridge
description: Skill de integracao com agy CLI como worker headless — ensina como spawnar, monitorar e parsear output de workers via agy.exe com fallback para subagentes nativos.
---

# agy CLI Bridge — Worker Headless Integration

## Visao Geral

O agy CLI e usado como **worker primario** para execucao paralela de tasks. Quando o agy falha (timeout, erro, nao encontrado), o sistema faz **fallback automatico** para subagentes nativos do Antigravity 2.0.

## Quando Usar agy vs Nativo

| Cenario | Usar agy CLI | Usar Nativo |
|---|---|---|
| Tasks paralelas isoladas | ✅ | ❌ |
| Tasks que precisam do contexto completo | ❌ | ✅ |
| Pesquisa web/docs | ✅ | ✅ |
| Implementacao de codigo | ✅ (com --add-dir) | ✅ |
| Auditoria read-only | ✅ | ✅ |
| agy CLI nao instalado | ❌ | ✅ (automatico) |
| Usuario forcou --native | ❌ | ✅ |

## Configuracao

### Localizar agy
```powershell
# agy esta no PATH ou em:
$agyPath = "C:\Users\admin\AppData\Local\Microsoft\WinGet\Packages\Google.AntigravityCLI_Microsoft.Winget.Source_8wekyb3d8bbwe\agy.exe"

# Verificar disponibilidade
$agy = Get-Command agy -ErrorAction SilentlyContinue
if (-not $agy) { $agy = $agyPath }
```

### Modelo Padrao
- **Default:** `gemini-3.1-pro-high`
- Pode ser overridden por task via `schemas/agy-task.schema.json`

## Como Invocar um Worker via agy

### Invocacao Basica
```powershell
# Via script helper (RECOMENDADO)
powershell -ExecutionPolicy Bypass -File scripts/spawn-agy-worker.ps1 `
  -TaskPrompt "Implemente o componente X conforme design.md" `
  -WorkerAgent "frontend-worker" `
  -Model "gemini-3.1-pro-high" `
  -TimeoutSeconds 300

# Via comando direto (para debug)
agy --print "Sua task aqui" `
    --output-format json `
    --model gemini-3.1-pro-high `
    --agent frontend-worker `
    --dangerously-skip-permissions `
    --add-dir "C:\path\to\project"
```

### Flags Importantes do agy

| Flag | Descricao | Uso |
|---|---|---|
| `--print` | Non-interactive single-shot | OBRIGATORIO para headless |
| `--output-format json` | Output JSON estruturado | OBRIGATORIO para parsing |
| `--model <name>` | Selecionar modelo | Default: gemini-3.1-pro-high |
| `--agent <name>` | Usar agent definition especifico | Nome do worker |
| `--dangerously-skip-permissions` | Auto-approve tudo | OBRIGATORIO para headless |
| `--add-dir <path>` | Adicionar dir ao workspace | Para dar acesso ao projeto |
| `--sandbox` | Terminal isolado | Opcional, mais seguro |
| `--json-schema <path>` | Forcar schema de output | schemas/worker-output.schema.json |

### Modelos Disponiveis

| Modelo | Performance | Custo | Uso Recomendado |
|---|---|---|---|
| `gemini-3.1-pro-high` | ⭐⭐⭐⭐⭐ | Alto | **DEFAULT** — Workers criticos |
| `gemini-3.8-flash-high` | ⭐⭐⭐⭐ | Medio | Tasks simples, pesquisa |
| `gemini-3.8-flash-medium` | ⭐⭐⭐ | Baixo | Validacoes rapidas |
| `claude-sonnet-4-6` | ⭐⭐⭐⭐ | Alto | Alternativa cross-model |

## Cadeia de Fallback

```
spawn-agy-worker.ps1 invocado
    │
    ├─ agy encontrado? SIM
    │   ├─ Executar com timeout
    │   ├─ Output JSON valido? SIM → Retornar resultado
    │   └─ Output invalido ou timeout?
    │       └─ FALLBACK: invoke_subagent nativo
    │
    └─ agy NAO encontrado
        └─ FALLBACK DIRETO: invoke_subagent nativo
```

## Parsing do Output

```powershell
# O output JSON do agy deve conformar com schemas/worker-output.schema.json
$result = $agyOutput | ConvertFrom-Json
if ($result.status -eq "DONE") {
    # Sucesso — usar $result.summary, $result.files_modified, etc.
} elseif ($result.status -eq "FAILED") {
    # Falha — verificar $result.errors
    # Acionar fallback nativo
}
```

## Restricoes de Seguranca

- Workers via agy NUNCA podem executar git commit/push (monopolio do Root)
- Output deve ser validado contra o schema antes de ser aceito
- Timeout maximo de 5 minutos por worker
- Se --sandbox nao estiver ativo, o worker tem acesso ao filesystem real
