# 📄 Memória Modular: Parsing de Arquivos (OFX, XLSX, OS, Rede)

## [2026-07-24] — Feature ID: fix-day23-crash

**Contexto:** Ao importar pastas com múltiplos relatórios, planilhas consolidadas manuais (ex: `CONCILIAÇÃO 2307.xlsx` com ~3.000 linhas) causavam congelamento e crash no navegador.

**Regra aprendida:**
- Implementar a função helper `isConsolidatedSummaryFile` para ignorar automaticamente planilhas consolidadas manuais (arquivos contendo `CONCILIAC`, `CONCILIATION`, `RESUMO_GERAL`, `CONSOLIDADO`).
- Adicionar pausas assíncronas no event loop do V8 (`await new Promise(r => setTimeout(r, 0))`) a cada arquivo lido ou a cada 50 linhas de OS para evitar que o navegador entre em "Página Não Responde".
- Tratar datas e diferenças em ms com `isNaN(date.getTime())` para prevenir que `days_open` vire `NaN`.

**Risco identificado:** A execução de regex e varredura de tabelas com milhares de linhas diretamente na thread principal do navegador sem `setTimeout(..., 0)` estoura a memória do V8.

**Não fazer:** Nunca tentar parsear planilhas consolidadas de conferência manual como se fossem relatórios brutos de fornecedores.
