---
description: Conclui o fluxo da Spec, consolidando a memória, testando o build e enviando para produção.
---

<!-- VIBEARCHIVE:START -->

**Objetivo**
Garantir que a I.A não sofra amnésia. Este workflow transforma o trabalho temporário em memória permanente e entrega o código seguro no Github.

**Skills a utilizar**
- Invoque `obsidian` para persistir a memória.
- Invoque a skill `github` para lidar com todos os comandos de controle de versão (commit, push, branches).

**Steps**

1. **Consolidação de Memória**: Extraia tudo que você aprendeu com o usuário nesta spec (estilos preferidos, erros cometidos, padrões de DB adotados) e ATUALIZE o arquivo `.agent/memory.md` (ou via Obsidian).
2. **Quality Gate (Build)**: Execute o comando de build via cmd (`cmd.exe /c "npm run build"`) para evitar erros de Execution Policy e assegurar que nada quebrou na master.
3. **Commit Automático**: 
   - Tente rodar `git add .`
   - Se o comando `git` falhar (não reconhecido), substitua `git` pelo caminho absoluto: `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe add .`
   - Crie um commit semântico explicando a feature inteira usando o mesmo executável de fallback se necessário.
4. **Push Automático**: Execute `git push origin` ou `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe push origin` para enviar a branch.
5. Mova a pasta `specs/<id>` para `specs/archive/<id>`.
6. Avise o usuário que a Spec foi finalizada e arquivada, e que a Memória Global foi expandida.

<!-- VIBEARCHIVE:END -->
