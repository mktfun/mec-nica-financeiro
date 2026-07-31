# Design: Central de Importação Inteligente (Spec 032)

## 1. Supabase (Backend)
- Não haverá alteração de tabelas no Supabase nesta Spec.
- Reutilizaremos `import_logs`, transações bancárias e as `machine_fees` exatamente como já desenhados na Spec 030. 
- O foco é exclusivamento na orquestração de Input no Frontend.

## 2. Interface (Stitch & Lovable / UI 2026)

### 2.1 Padrões Visuais (Apple Liquid Glass & Maximalismo Tátil)
- **Cores Dopamínicas**: Os cards de "Selecione a Categoria" devem ter fundos com texturas de vidro fosco (`backdrop-blur-xl`), com gradientes sutis ativados no `hover`.
- **Botões Grandes (Maximalismo)**: A tela inicial do `/importacoes` não deve começar com um upload invisível. Deve começar com **Cards Gigantes Interativos**:
  - [ Extrato Bancário (OFX) ]
  - [ Maquininha (XLSX) ]
  - [ Pátio / OS ]
  - [ Despesas / Contas ]
  - [ Juros Rede ]
- Cada clique em um card fará uma transição de *Microinteração* revelando o `<UniversalDropzone />` parametrizado para aquela escolha.

### 2.2 Estrutura de Componentes
- `src/routes/importacoes.tsx`: Componente pai que guarda o estado `selectedCategory` e o `step` (1, 2, 3).
- `src/components/importacoes/CategorySelector.tsx`: Grid Maximalista com as categorias.
- `src/components/importacoes/IntelligentMapper.tsx`: O step 2, que mostra os arquivos lidos e os CNPJs/Nomes de lojas encontrados internamente com `lucide-react` icons sinalizando o match automático.
- `src/components/importacoes/ReviewPanel.tsx`: Resumo consolidado antes de salvar.

### 2.3 Refatoração Limpa
- `src/routes/conciliacao.tsx`: Voltar a ser **Somente Leitura**. O Dashboard de Conciliação apenas consome as tabelas e não tem mais botão de Upload. Tudo vai nascer do `/importacoes`.
