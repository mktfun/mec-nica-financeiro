---
description: Configuração inicial do ambiente headless para garantir que a IA consiga usar ferramentas como Supabase e GitHub CLI sem interações manuais ou pop-ups.
---

<!-- OPENSPEC:START -->

**Guardrails**

- **OBRIGATÓRIO:** O agente deve operar EXCLUSIVAMENTE em modo "headless". Jamais tente executar comandos que requerem input interativo ou navegação no browser como `supabase login` ou `gh auth login` padrão sem os tokens por environment variable.
- Nunca exiba os tokens abertamente no chat, apenas configure-os no background.
- Lembre o usuário de nunca enviar o token em texto puro para repositórios públicos. Garanta que o `.env` esteja no `.gitignore`.

**Skills a utilizar**
- As skills `github` e `supabase` devem ser operadas estritamente sob este fluxo invisível de configuração.

**Steps**

1. **Validação de Credenciais Locais:**
   - Verifique se existe um arquivo `.env` na raiz do projeto com as variáveis `GH_TOKEN` e `SUPABASE_ACCESS_TOKEN`.
   - Se os tokens existirem, faça a leitura e injete as variáveis no terminal (export) sempre que for invocar a CLI dessas ferramentas.

2. **Solicitação e Armazenamento (Se ausente):**
   - Se as variáveis não estiverem no `.env`, peça ao usuário para fornecer os tokens (Personal Access Token do GitHub e Access Token do Supabase).
   - Assim que o usuário fornecer, escreva essas chaves de forma segura no arquivo `.env` (certificando-se do `.gitignore`).

3. **Configuração Global Headless:**
   - Configuração silenciosa do Git:
     `git config --global user.name "Your Name"`
     `git config --global user.email "your-email@example.com"`
   - Para interagir com repositórios remotos sem pedir senha, o agente usará estritamente a variável de ambiente:
     `$env:GH_TOKEN="<token>"` (Windows) ou `export GH_TOKEN="<token>"` (Linux/Mac) antes de executar comandos do GitHub CLI (`gh`).
   - O mesmo se aplica ao Supabase:
     `$env:SUPABASE_ACCESS_TOKEN="<token>"` ou `export SUPABASE_ACCESS_TOKEN="<token>"` antes de qualquer comando `supabase`.

4. **Scaffolding do Antigravity:**
   - Crie a pasta `.agent` na raiz do projeto se não existir.
   - Crie `.agent/memory.md` com "Preferências de Arquitetura", "Erros Passados" e "Persona do Usuário".

5. **Confirmação Silenciosa:**
   - Execute um teste rápido (ex: `gh auth status` ou `supabase projects list`) para garantir que o login via token funcionou perfeitamente.
   - Informe ao usuário que o setup invisível foi concluído.

<!-- OPENSPEC:END -->
