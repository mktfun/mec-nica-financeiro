# Spec Plan: Padronização da Tela de Recebíveis Baseada no Padrão Canônico de "Carros no Pátio" (Spec 284)

## Tasks

- [x] [BACKEND] Limpar os 83 registros legados mock ("Outros") da tabela `public.receivables` mantendo estritamente os 5 boletos reais de 25/08 (R$ 11.814,50).
- [x] [FRONTEND] Reimplementar `src/routes/recebiveis.tsx` espelhando 1:1 a arquitetura visual e de componentes de `src/routes/patio.tsx`:
  - Header com breadcrumb `Financeiro › Recebíveis`, título + badge de contagem verde (`variant="success"`), input de busca e select de lojas com apenas lojas ativas.
  - Botões de `Importar Planilha` (outline neutro) e `+ Novo Recebível` (bg-[var(--color-primary)]) no header.
  - 4 Summary Cards canônicos com `border-l-4` (Total a Receber R$ 11.814,50, Total Vencidos R$ 3.464,83, A Vencer Hoje R$ 0,00, Liquidados R$ 0,00).
  - Abas de status (`Todas`, `Em Aberto`, `Vencidos`, `Liquidados`) com `TabBtn`.
  - Timeline Card com `divide-y`, avatar circular colorido por status, detalhamento de boleto (OS, parcela, tipo, loja, vencimento), valor em destaque mono e botões de `Baixar`, `Editar` e `Excluir`.
  - Paginação canônica idêntica a `patio.tsx`.
- [x] [FRONTEND] Corrigir import de `Link` em `src/components/conciliacao/ResumoDiaPanel.tsx` eliminando ReferenceError.
- [x] [FRONTEND] Padronizar modais `ReceivableFormModal` e `ImportRecebiveisModal` com botões e dropzones neutros/primários.
- [x] [TEST] Validar visualmente via screenshot autenticada no navegador a harmonia 100% canônica e os valores precisos.
- [x] [BUILD] Executar `npm run build` e validar quality gate com zero erros (tempo de build: 5.04s).
