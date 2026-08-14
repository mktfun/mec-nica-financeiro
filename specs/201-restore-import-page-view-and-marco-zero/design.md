# Design Técnico: Central de Importações em Tela Cheia (Spec 201)

## 1. Arquitetura de Rotas e Navegação

```
/importacoes
  ├── Query Params: ?tab=diario|marco-zero|historico&date=YYYY-MM-DD
  ├── Header da Página: Título, Data Ativa, Seletor de Modo (Abas)
  ├── Tab "diario" (Padrão):
  │     ├── Coluna Esquerda:
  │     │     ├── Dropzone de Arquivos (OFX, Pátio, Rede) com persistência Supabase
  │     │     └── Inputs Manuais (Odômetro Hoje, Dinheiro MP, A Receber, Contas Manual)
  │     ├── Coluna Direita:
  │     │     ├── Grid de Ajuste de OSs Órfãs (Inputs Diretos: Total, Pago, Status)
  │     │     └── Resumo de Consolidação & Botão "Confirmar e Gravar Fechamento"
  ├── Tab "marco-zero":
  │     └── Interface Integrada de Marco Zero (MarcoZeroWizard em tela cheia)
  └── Tab "historico":
        └── Histórico de Lotes, Desfazer em Cascata e Limpeza Geral
```

## 2. Componentes Envolvidos
1. **`src/components/conciliacao/DailyImportView.tsx`** (Novo componente de view em tela cheia derivado do `ImportConciliacaoModal.tsx`, sem container de modal flutuante nem `fixed inset-0`).
2. **`src/routes/importacoes.tsx`**:
   - Consome os parâmetros de busca (`date`, `tab`).
   - Renderiza o cabeçalho executivo com abas segmentadas (`Fechamento Diário`, `Marco Zero`, `Histórico de Lotes`).
3. **`src/routes/conciliacao.index.tsx`**:
   - Substitui o modal flutuante por navegação direta:
     `navigate({ to: '/importacoes', search: { date: selectedDate, tab: 'diario' } })`
4. **`src/components/importacoes/MarcoZeroWizard.tsx`**:
   - Integrado de forma limpa na aba de Marco Zero.

## 3. UI & Estilos (Dark UI Sólido)
- Fundo: `bg-zinc-950`
- Painéis e Cards: `bg-zinc-900` com `border-zinc-800`
- Abas ativas: `bg-zinc-800 text-zinc-100 font-semibold border-zinc-700`
- Botão de Confirmação: `bg-emerald-600 hover:bg-emerald-500 text-white font-bold`
- Inputs: `bg-zinc-950 border-zinc-800 focus:ring-2 focus:ring-emerald-500 text-zinc-100 text-sm`
