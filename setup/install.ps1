# antigravity-config — install.ps1
# Configura o ambiente para uso das skills e workflows no Windows (PowerShell)

$RepoUrl = "https://github.com/davi-449/antigravity-config"
$GeminiDir = "$env:USERPROFILE\.gemini\antigravity"
$SkillsTarget = "$GeminiDir\skills"
$ConfigDir = "$GeminiDir\antigravity-config"

Write-Host "🪐 antigravity-config — Setup (Windows)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Verificar dependências
Write-Host "→ Verificando dependências..." -ForegroundColor Yellow
try {
    git --version | Out-Null
    Write-Host "  ✓ git encontrado" -ForegroundColor Green
} catch {
    Write-Error "❌ git não encontrado. Instale git primeiro: https://git-scm.com/"
    exit 1
}

# 2. Criar diretórios necessários
Write-Host "→ Criando estrutura de diretórios..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $GeminiDir | Out-Null
New-Item -ItemType Directory -Force -Path $SkillsTarget | Out-Null
Write-Host "  ✓ $GeminiDir criado" -ForegroundColor Green

# 3. Clonar ou atualizar o repo
if (Test-Path $ConfigDir) {
    Write-Host "→ Repositório já existe. Atualizando..." -ForegroundColor Yellow
    Push-Location $ConfigDir
    git pull origin main
    Pop-Location
} else {
    Write-Host "→ Clonando antigravity-config..." -ForegroundColor Yellow
    git clone --depth=1 $RepoUrl $ConfigDir
}

# 4. Copiar skills para o diretório Gemini
Write-Host "→ Instalando skills em $SkillsTarget..." -ForegroundColor Yellow
$SourceSkills = "$ConfigDir\skills"
if (Test-Path $SourceSkills) {
    Copy-Item -Path "$SourceSkills\*" -Destination $SkillsTarget -Recurse -Force
    Write-Host "  ✓ Skills instaladas" -ForegroundColor Green
} else {
    Write-Warning "  ⚠ Pasta skills não encontrada em $SourceSkills"
}

# 5. Confirmar instalação
$SkillCount = (Get-ChildItem -Path $SkillsTarget -Filter "SKILL.md" -Recurse).Count

Write-Host ""
Write-Host "✅ Setup concluído!" -ForegroundColor Green
Write-Host "   Skills instaladas: $SkillCount" -ForegroundColor Green
Write-Host "   Localização: $SkillsTarget" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Abra o Gemini CLI em qualquer projeto"
Write-Host "   2. Use /route-task para diagnosticar sua tarefa"
Write-Host "   3. Veja docs/getting-started.md para o fluxo completo"
