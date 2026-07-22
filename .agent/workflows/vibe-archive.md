---
description: Conclui o fluxo da Spec, testando o build, atualizando o Grafo e realizando o commit do progresso.
---

<!-- VIBEARCHIVE:START -->

**Objetivo**
Garantir que a entrega não quebrou o build, atualizar a fonte de verdade (Graphify) e fazer o commit do código no repositório.

**Steps de Encerramento**

1. **Quality Gate (Build)**: 
   - Execute o build da aplicação (ex: `cmd.exe /c "npm run build"`) para atestar que não há quebras sistêmicas geradas pela task atual.
   
2. **Atualização da Fonte de Verdade (Graphify)**:
   - Rode o comando `graphify hook install` e `/graphify . --update` para re-extrair arquivos modificados para o `graph.json`.

3. **Commit & Push Controlado**: 
   - Adicione todos os arquivos modificados: `git add .` (incluindo as saídas novas em `graphify-out/`).
   - Use HEREDOCs no bash para gerar um commit claro (`git commit -m ...`), listando brevemente o que foi resolvido na tarefa.
   - Faça o push: `git push origin main`.
   - *Fallback:* Se o Git global falhar no ambiente do Windows, use a versão portable em `C:\Users\admin\.gemini\antigravity\scratch\mingit\cmd\git.exe`. Jamais use `push --force`.

4. **Clean Up**:
   - Mova a pasta `specs/<id>` (se houver spec gerada) para `specs/archive/<id>` usando a ferramenta de linha de comando.

5. **Notificação Final**:
   - Avise o usuário que a task foi finalizada com sucesso e salva no histórico do repositório.

<!-- VIBEARCHIVE:END -->
