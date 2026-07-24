# Proposal: Padronização Tipográfica Global (font-standardization-modern)

## Problema

- A utilização da classe `font-mono` do Tailwind padronizou os números e valores financeiros com fontes monospace nativas (Courier/Consolas), que possuem aspecto "quadrado", "caricato" e desalinhado com o design moderno da aplicação.
- Faltava a importação explícita das fontes Google Fonts (**Inter** e **DM Sans**) no CSS global, fazendo o navegador aplicar fallbacks locais genéricos em alguns elementos.

## Solução Proposta

1. **Importação Explícita de Google Fonts em `src/styles.css`:**
   - Importar as famílias **Inter** (pesos 300, 400, 500, 600, 700, 800) e **DM Sans** (pesos 400, 500, 700).

2. **Remapeamento Global de `--font-mono` e `--font-body`:**
   - Redefinir a variável `--font-mono` para utilizar a **Inter** com alinhamento numérico elegante (`tabular-nums`), eliminando completamente a fonte quadrada/caricata em todos os números do sistema.
   - Definir `--font-sans` e `--font-body` como `Inter, sans-serif`.
   - Definir `--font-display` como `DM Sans, Inter, sans-serif`.

3. **Padronização em Todas as Telas:**
   - Limpar ocorrências de `font-mono` rústicas em `ResumoDiaPanel.tsx`, `conciliacao.index.tsx`, `Modulo1SaldoPanel.tsx`, `ConciliacaoAlertsSection.tsx`, `OsDetailModal.tsx` e tabelas, substituindo por alinhamento fluído `font-sans tabular-nums`.

## Contratos de Dados
Nenhum contrato de banco afetado (alteração 100% de estética e tipografia).

## Features Existentes Impactadas
- `src/styles.css`
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `src/routes/conciliacao.index.tsx`
- `src/components/conciliacao/Modulo1SaldoPanel.tsx`
- Todos os componentes que consomem typography do tema.

## Risco Principal
Garantir que números em tabelas continuem alinhados verticalmente sem desalinhar colunas.
*Mitigação:* Usar a utilidade `.tabular-nums` (`font-variant-numeric: tabular-nums`) da fonte Inter, que garante largura igual para todos os numerais de 0 a 9 mantendo a estética moderna e elegante da Inter.
