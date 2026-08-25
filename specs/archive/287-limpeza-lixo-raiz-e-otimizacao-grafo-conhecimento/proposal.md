# Proposal: Limpeza de Lixo da Raiz, Configuração de .graphifyignore e Otimização do Grafo (287)

## Problema
Ao visualizar o grafo de conhecimento gerado pelo Graphify (`graphify-out/graph.html` ou Obsidian), observa-se uma nuvem circular gigante contendo centenas de nós desconectados e isolados ao redor do núcleo da aplicação.
Isso ocorre por dois motivos principais:
1. **Lixo residual acumulado na raiz do projeto:** Existem mais de 100 arquivos descartáveis na raiz (`.png`, `.tmp_*.ps1`, dumps `.json`, dumps `.sql`, scripts de teste pontuais de meses atrás, `old_ofxParser.ts`, etc.).
2. **Ausência de .graphifyignore:** O Graphify está varrendo todas as ~286 specs arquivadas em `specs/archive/` (quase 900 arquivos Markdown isolados) e scripts temporários, criando um nó órfão para cada arquivo histórico arquivado.

## Solução Proposta
1. **Limpeza da Raiz do Repositório:**
   - Excluir imagens de screenshot descartáveis (`tela*.png`), dumps temporários (`patio.json`, `stores.json`, `reconciliations.json`, `db_dump.sql`, etc.), arquivos temporários (`.tmp_*`, `mingit.zip`) e scripts descartáveis de testes já superados.
   - Deixar a raiz do projeto limpa, contendo apenas arquivos de configuração essenciais (`package.json`, `vite.config.ts`, `tsconfig.json`, `.env`, `.gitignore`, etc.).
2. **Criação do .graphifyignore:**
   - Configurar o `.graphifyignore` para ignorar explicitamente `specs/archive/**`, `scripts/**`, `dist/**`, `.output/**`, `.tanstack/**`, `.wrangler/**`, `.lovable/**`, `mingit/**`, `scratch/**`, `.council/**`.
3. **Regeneração do Grafo do Graphify (`graphify extract . --force`):**
   - Reconstruir o grafo de dependências para que ele represente estritamente o código vivo (`src/`), banco de dados (`supabase/`), memórias modulares ativas (`.agent/memory/`) e regras do sistema, eliminando 100% dos nós órfãos no `graph.html` e no Obsidian.

## Contratos de Dados
- Nenhuma alteração em tabelas ou schemas do Supabase.
- Preservação intacta de todas as migrations em `supabase/migrations/` e do código fonte em `src/`.

## API / Interface
- Nenhuma alteração de interfaces ou contratos de RPC.
- O arquivo `graphify-out/graph.html` e `graphify-out/graph.json` serão regenerados e limpos.

## Features Existentes Impactadas
- Nenhuma feature de negócio será impactada. O build e os testes continuarão funcionando normalmente.

## Risco Principal
- Exclusão acidental de algum arquivo de configuração vital para o build (mitigado pela lista explícita de exclusão e validação com `npm run build`).
