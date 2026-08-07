# Tasks: Central de ImportaçÁo Inteligente (Spec 032)

## 1. Limpeza da Tela de ConciliaçÁo (Frontend)
- `[x]` Abrir `src/routes/conciliacao.tsx`.
- `[x]` Remover a `<UniversalDropzone />` inserida na Spec 031.
- `[x]` Remover importações relacionadas à Dropzone e file parsing dessa rota. A tela deve ser apenas visualizaçÁo de dados do Supabase.

## 2. RefatoraçÁo da Tela de Importações Base (Frontend)
- `[x]` Abrir `src/routes/importacoes.tsx`.
- `[x]` Mudar a interface principal para exibir Cards de Categoria Grandes (OFX, Maquininha, OS, Despesas, Juros).
- `[x]` Criar um estado `selectedCategory: string | null`. Ao clicar, a tela avança para o "Passo 1: Upload".

## 3. CriaçÁo do Wizard Universal (Frontend)
- `[x]` Criar o fluxo Passo 1 (Upload Dropzone filtrada pela `selectedCategory`), Passo 2 (Mapeamento de Loja Inteligente), Passo 3 (RevisÁo).
- `[x]` **Mapeamento Inteligente**: Implementar lógica (ou adaptar as lógicas existentes de despesas) onde os Parsers (`ofxParser`, `jurosRedeParser`, `read-xls`) extraem a loja de dentro do conteúdo para auto-resolver o de-para na tela do Passo 2.
- `[x]` Garantir o uso do `localStorage` para memorizar nomes extraídos (alias) `->` `store_id`.

## 4. Estética UX/UI 2026 (QA/Frontend)
- `[x]` Assegurar que os cards possuem Apple Liquid Glass (`bg-white/5 backdrop-blur-md border border-white/10`).
- `[x]` Aplicar micro-animações Framer Motion ao transitar entre categorias e ao exibir as lojas lidas.
- `[x]` Testar o Build com `npm run build` no final.

