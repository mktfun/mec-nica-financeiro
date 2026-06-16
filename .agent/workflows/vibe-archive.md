---
description: Conclui o fluxo da Spec, consolidando a memória em políticas semânticas, testando o build e enviando para produção de forma segura.
---

<!-- VIBEARCHIVE:START -->

**Objetivo**
Garantir a I.A não sofra amnésia e organize seu aprendizado estruturalmente (Memory Continuum). Transforma o trabalho em memória persistente segmentada e entrega o código seguro no Github via fallbacks resilientes.

**Steps**

1. **Memória Semântica Contínua**: 
   - NÃO faça um "dump" genérico em um único arquivo. Analise os aprendizados da iteração (ex: regras de UI/UX Premium, design tokens HSL, prevenção de Hook Loops do React, etc).
   - Registre as decisões em políticas específicas dentro de `.agent/policies/` (ex: `ui-rules.md`, `backend-rules.md`, `mcp-guidelines.md`).
   - Use `write_to_file` ou `replace_file_content` para consolidar esses documentos.

2. **Quality Gate (Build e Resiliência)**: 
   - Execute o comando de build via CMD (`cmd.exe /c "npm run build"`) para evadir do PowerShell Execution Policy e atestar integridade.
   
3. **Commit Controlado & Seguro**: 
   - Tente `git add .`
   - Se `git` não for reconhecido, puxe o fallback absoluto: `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe add .`
   - Use HEREDOCs no bash para fazer o commit de explicações complexas, garantindo que o log acompanhe o SDD. 
   - Lembre-se do Git Identity Override (configurar user/email) se houver falhas. JAMAIAS use `push --force`.

4. **Push Automático**: 
   - `git push origin` ou o fallback MinGit.

5. **Clean Up**:
   - Mova a pasta `specs/<id>` para `specs/archive/<id>` usando a ferramenta `run_command`.

6. Avise o usuário que a Spec foi finalizada e que as políticas semânticas no `Memory Continuum` foram expandidas com sucesso.

<!-- VIBEARCHIVE:END -->
