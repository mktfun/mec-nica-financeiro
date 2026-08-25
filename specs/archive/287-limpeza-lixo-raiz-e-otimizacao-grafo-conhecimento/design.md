# Design: Limpeza de Lixo da Raiz, Configuração de .graphifyignore e Otimização do Grafo (287)

## Arquitetura Técnica
A organização do repositório e a otimização da base de conhecimento seguem três camadas:

1. **Camada 1: Higienização da Raiz do Projeto (Root Cleanup)**
   - Deletar arquivos descartáveis acumulados:
     - Imagens: `tela*.png`
     - Dumps temporários: `patio.json`, `reconciliations.json`, `stores.json`, `transactions.json`, `raw_recon.json`, `scratch_excel*`, `pdf_texts.txt`, `=`
     - Dumps SQL: `db_dump.sql`, `schema_dump.sql`, `tmp_schema*.sql`, `combined_migrations.sql`, `setup_cash_registers.sql`, `.tmp_diag.sql`
     - Scripts temporários soltos: `analyze.js`, `analyze_files.ts`, `append-memory.cjs`, `apply-*.cjs`, `check*.js`, `check*.ts`, `clear_db.js`, `create_routes.cjs`, `diagnose*.mjs`, `fix*.js`, `fix*.cjs`, `fix*.ps1`, `get*.cjs`, `git*.cjs`, `git*.bat`, `insert_creds.ts`, `inspect*.ts`, `merge_memory.cjs`, `old_ofxParser*.ts`, `parse_excel*.py`, `patch*.py`, `patch*.js`, `push_docs.cjs`, `query*.ps1`, `read*.cjs`, `read*.ts`, `replace*.cjs`, `replace*.js`, `replace*.ps1`, `run_migration.js`, `screenshot.cjs`, `ssh*.cjs`, `sum.cjs`, `test*.js`, `test*.cjs`, `test*.ts`, `update*.cjs`, `.tmp_*.ps1`
     - Arquivos zip já extraídos: `mingit.zip`
   - Preservar rigorosamente: `package.json`, `package-lock.json`, `bun.lock`, `bunfig.toml`, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `components.json`, `wrangler.jsonc`, `.env`, `.gitignore`, `.prettierrc`, `.prettierignore`, `CHANGELOG.md`, `ORIGINAL_REQUEST.md`, `PROJECT_CONTEXT.md`, `handoff_summary.md`, `1543_ConferenciaOSxFinanceiro.xls`, `manual_tecnico_conciliacao.pdf`.

2. **Camada 2: Configuração do .graphifyignore**
   - Criar arquivo `.graphifyignore` na raiz:
```gitignore
specs/archive/**
scripts/**
dist/**
.output/**
.tanstack/**
.wrangler/**
.lovable/**
node_modules/**
graphify-out/**
mingit/**
scratch/**
.agent/logs/**
.council/**
*.log
*.tmp
*.bak
```

3. **Camada 3: Re-extração Determinística do Grafo**
   - Executar `graphify extract . --force` (ou `graphify update .`)
   - Validar que a contagem de nós passa a focar estritamente na árvore de dependências real (componentes, hooks, views, schemas, memórias ativas) sem a dispersão de nós desconectados no círculo exterior.

## Cenários de Verificação
- **Cenário 1 (Build do Sistema):** Executar `npm run build` -> Sucesso sem qualquer quebra ou arquivo ausente.
- **Cenário 2 (Grafo Limpo):** Inspecionar `graphify-out/graph.html` e verificar que a constelação exterior de 900+ nós órfãos de specs arquivadas e scripts descartáveis foi 100% eliminada.
