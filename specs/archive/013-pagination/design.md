# Design: Paginação e Refatoração de Tabelas (013)

## Componentes Afetados

1. **`src/routes/patio.tsx`**
   - Remover a estrutura de `<table>`.
   - Adicionar o estado `const [page, setPage] = useState(1); const pageSize = 10;`.
   - Adicionar lógica de fatiamento no array filtrado: `const paginatedData = filtered.slice((page - 1) * pageSize, page * pageSize)`.
   - Implementar o componente de Timeline idêntico ao do `loja.$lojaId.tsx`:
     - Ícone arredondado com a cor baseada no status (`finalizado` = verde, `em_aberto` = vermelho, `pago_parcial` = amarelo).
     - Nome da loja, placa e número da OS como tags abaixo do Título Principal.
     - Valor pago (Liquidado) e Valor total em destaque à direita.
   - Adicionar os controles de rodapé "Página X de Y" com botões Anterior/Próximo.

2. **`src/routes/recebiveis.tsx`**
   - Adicionar o estado de busca `const [searchQuery, setSearchQuery] = useState('')` que faltava.
   - Adicionar o estado de paginação `const [page, setPage] = useState(1); const pageSize = 10;`.
   - Adaptar o array filtrado para considerar a busca (por loja ou tipo) e aplicar a paginação `.slice(...)`.
   - Substituir a `<table>` pela Timeline:
     - Ícone arredondado com a cor baseada no status (`recebido` = verde, `vencido` = vermelho, `pendente` = amarelo).
     - Informação de data de vencimento, forma de pagamento e nome da Loja no formato badges.
   - Adicionar os botões de paginação.

## Mapa de Dependências
- `src/routes/patio.tsx` depende dos componentes UI existentes e de `lucide-react` para os ícones.
- `src/routes/recebiveis.tsx` depende de `lucide-react`.
- O layout não alterará dependências de backend nem lógicas de Supabase, toda a alteração é puramente de Frontend (React state e Tailwind CSS).
