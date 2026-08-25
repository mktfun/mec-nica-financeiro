# Design: Ajuste Fino de Cores Canônicas e Contagem Precisa de Recebíveis (Spec 284)

## Padrões Visuais e de Cores

1. **Header:**
   - Badge: `<Badge variant="success" className="uppercase tracking-wider">{pendentes.length} {pendentes.length === 1 ? 'título em aberto' : 'títulos em aberto'}</Badge>`
   - Botão Outline: `Button variant="outline" className="border-white/10 text-white hover:bg-white/5"`
   - Botão Primário: `Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium shadow-sm"`

2. **Cards e Linhas de Títulos:**
   - Card 1 (Total a Receber): `border-l-4 border-l-[var(--color-primary)]` -> `R$ 11.814,50`
   - Card 2 (Total Vencidos): `border-l-4 border-l-[var(--color-accent-danger)]` -> `R$ 3.464,83`
   - Card 3 (A Vencer Hoje): `border-l-4 border-l-[var(--color-accent-warning)]` -> `R$ 0,00`
   - Card 4 (Liquidados no Período): `border-l-4 border-l-[var(--color-accent-teal)]` -> `R$ 0,00`
   - Ícone do Avatar:
     - Pendente: `bg-[var(--color-primary)]/10 text-[var(--color-primary)]`
     - Vencido: `bg-[var(--color-accent-danger)]/10 text-[var(--color-accent-danger)]`
     - Liquidado: `bg-[var(--color-success)]/10 text-[var(--color-success)]`

3. **Valores Exatos e Instantâneos:**
   - Os valores de `totalAberto`, `totalVencidos`, `totalAVencerHoje` e `totalRecebido` são calculados diretamente da lista de títulos retornada do Supabase e renderizados com formatação monetária BRL sem atrasos de interpolação.
