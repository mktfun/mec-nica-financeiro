# Tasks — Spec 042 (OFX Parser Fix + Tela Loja)

## Backend Engineer
- [x] 1. Em `src/lib/parsers/ofxParser.ts`:
  - [x] Adicionada interface `OfxParseResult { alias: string; transactions: OfxTransaction[] }`.
  - [x] Filtro anti-lixo adicionado no loop `while` antes do `push`:
    ```ts
    const JUNK = ['SALDO ANTERIOR', 'SALDO TOTAL', 'SALDO DISPONIVEL', 'SALDO DISPONÍVEL', 'SALDO INICIAL', 'DISPONÍVEL DIA'];
    if (JUNK.some(k => title.toUpperCase().includes(k.toUpperCase()))) continue;
    ```
  - [x] Retorno alterado de `return transactions` para `return { alias, transactions }`.
- [x] 2. **Anotação para o Frontend Engineer** (Backend NÃO edita frontend):
  - `parseOFXFile` é chamado em **`src/components/importacoes/WizardImportacao.tsx`**:
    - **Linha 12**: `import { parseOFXFile } from '@/lib/parsers/ofxParser';`
    - **Linha 180**: `return await parseOFXFile(file);` — este ponto retorna `OfxParseResult` (antes retornava `OfxTransaction[]`). O Frontend Engineer deve atualizar o consumo para desestruturar `{ alias, transactions }` e usar o `alias` no Passo 2 de mapeamento.

## Frontend Engineer
- [ ] 1. Em `src/components/importacoes/WizardImportacao.tsx` (fluxo de OFX):
  - **ATENÇÃO**: `parseOFXFile` agora retorna `OfxParseResult` (`{ alias, transactions }`), não mais `OfxTransaction[]` diretamente.
  - Na linha 180, o retorno de `parseOFXFile(file)` é `OfxParseResult`. Ajuste o código para desestruturar `{ alias, transactions }`.
  - Após fazer upload e parsear arquivos OFX, extraia os `alias` únicos dos resultados.
  - Exiba o Passo 2 de mapeamento (igual ao das Despesas): alias (ex: "SICREDI - 3385988047") → selecionar Loja do sistema.
  - Use localStorage com chave `@mecanica/ofx-store-mappings` para memorizar.
  - No Passo 3 (Confirmação), resolver o `store_id` de cada transação pelo mapeamento antes de inserir no banco.
- [ ] 2. Em `src/routes/loja.$lojaId.tsx`:
  - Localize a seção "Divergências — Entradas sem OS Vinculada" e **remova completamente** essa lógica (a query que busca transações sem OS e o bloco JSX vermelho).
  - No lugar, exiba uma nova seção "Conciliação do Período" com 3 cards:
    - **Extrato Banco:** total das txs onde `source = 'ofx'` da loja no período (já está no `extrato.totalIn`)
    - **Apurado Sistema:** buscar transações com `source IN ('patio', 'maquininha')` menos `source = 'despesa'` da loja no período (criar query local simples com supabase)
    - **Diferença:** Banco - Sistema (verde se ≤ 0, vermelho se > 0 indicando receita não lançada)
  - No gráfico de pizza "Distribuição de Despesas": filtrar para mostrar apenas `source = 'despesa'`, agrupando por `subtitle` (categoria), não por `store_id`.
- [ ] 3. Rode `npm run build` e marque as tarefas.
