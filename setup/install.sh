#!/bin/bash
set -e

# antigravity-config — install.sh
# Configura o ambiente para uso das skills e workflows no Linux/macOS

REPO_URL="https://github.com/davi-449/antigravity-config"
GEMINI_DIR="$HOME/.gemini/antigravity"
SKILLS_TARGET="$GEMINI_DIR/skills"

echo "🪐 antigravity-config — Setup"
echo "================================"

# 1. Verificar dependências
echo "→ Verificando dependências..."
command -v git >/dev/null 2>&1 || { echo "❌ git não encontrado. Instale git primeiro."; exit 1; }
echo "  ✓ git encontrado"

# 2. Criar diretório Gemini se não existir
echo "→ Criando estrutura de diretórios..."
mkdir -p "$GEMINI_DIR"
mkdir -p "$SKILLS_TARGET"
echo "  ✓ $GEMINI_DIR criado"

# 3. Clonar ou atualizar o repo
if [ -d "$GEMINI_DIR/antigravity-config" ]; then
  echo "→ Repositório já existe. Atualizando..."
  cd "$GEMINI_DIR/antigravity-config"
  git pull origin main
else
  echo "→ Clonando antigravity-config..."
  git clone --depth=1 "$REPO_URL" "$GEMINI_DIR/antigravity-config"
  cd "$GEMINI_DIR/antigravity-config"
fi

# 4. Copiar skills para o diretório Gemini
echo "→ Instalando skills em $SKILLS_TARGET..."
cp -r skills/* "$SKILLS_TARGET/"
echo "  ✓ Skills instaladas"

# 5. Confirmar instalação
SKILL_COUNT=$(find "$SKILLS_TARGET" -name "SKILL.md" | wc -l)
echo ""
echo "✅ Setup concluído!"
echo "   Skills instaladas: $SKILL_COUNT"
echo "   Localização: $SKILLS_TARGET"
echo ""
echo "📚 Próximos passos:"
echo "   1. Abra o Gemini CLI em qualquer projeto"
echo "   2. Use /route-task para diagnosticar sua tarefa"
echo "   3. Veja docs/getting-started.md para o fluxo completo"
