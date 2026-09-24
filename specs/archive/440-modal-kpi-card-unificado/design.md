# Design — Spec 440: ModalKpiCard

## Arquitetura do Componente

ModalKpiCard e um componente puramente apresentacional (zero side effects, zero queries).
Props in -> JSX out. Sem estado interno relevante.

## Anatomia do Card (Padrao Cofre - Variante dot)

`
+----------------------------------------------+
| [dot] LABEL UPPERCASE TRACKING-WIDER   [acao]|
| R$ 88.954,14                (valor principal)|
| Subtitulo em texto pequeno       (text-10px) |
| [subtitleExtra: par chave-valor opcional]     |
+----------------------------------------------+
`

## Anatomia do Card (Variante border-l - Padrao Patio)

`
+----------------------------------------------+
||| LABEL UPPERCASE TRACKING-WIDER             |
||| R$ 88.954,14                               |
||| [subtitleExtra: linha separada border-t]   |
+----------------------------------------------+
`

## Mapeamento de Cores Semanticas

| color prop  | dot/border    | texto valor        | fundo card (danger=false)               |
|-------------|---------------|--------------------|-----------------------------------------|
| amber       | bg-amber-400  | text-amber-300     | bg-[var(--bg-canvas)] border-border     |
| emerald     | bg-emerald-400| text-emerald-300   | bg-[var(--bg-canvas)] border-border     |
| rose        | bg-rose-400   | text-rose-300      | bg-[var(--bg-canvas)] border-border     |
| blue        | bg-blue-400   | text-blue-300      | bg-[var(--bg-canvas)] border-border     |
| purple      | bg-purple-400 | text-purple-300    | bg-[var(--bg-canvas)] border-border     |
| default     | bg-muted-fg   | text-foreground    | bg-[var(--bg-canvas)] border-border     |
| red (danger)| -             | text-red-400       | bg-red-500/10 border border-red-500/30  |

## Tokens Obrigatorios (DESIGN.md)

- Fundo: bg-[var(--bg-canvas)] (Zinc-950 / canvas)
- Borda padrao: border border-[var(--border-subtle)]
- Borda danger: border-red-500/30
- Label: text-[var(--text-tertiary)] text-[11px] font-semibold uppercase tracking-wider
- Subtitulo: text-[10px] text-[var(--text-tertiary)]
- Padding: p-3.5
- Raio: rounded-xl
- Valor: text-lg sm:text-xl font-bold tabular-nums (aceita ReactNode)

## Happy Path

1. CashVaultCompositionModal abre -> 4 ModalKpiCard renderizam com cores amber/emerald/rose/default
2. SaldoBancosDetailModal abre com saldo negativo -> card Cheque Especial renderiza com danger=true (fundo vermelho)
3. PatioOsDetailModal abre -> 4 ModalKpiCard com variant=border-l e cores amber/blue/purple/emerald

## Edge Case

- Se value for ReactNode (ex: <AmountCell>), o componente renderiza sem wrapper extra
- Se danger=true E color=amber, danger tem precedencia sobre cor (fundo vermelho prevalece)
- Se interactive=true mas onClick=undefined, o cursor muda mas nao ha acao

## Criterios de Aceitacao

1. Build (npm run build) passa sem erros de TypeScript
2. Os 3 modais exibem o mesmo padrao visual de card KPI
3. O card de Cheque Especial do SaldoBancosDetailModal continua com fundo vermelho via danger=true
4. O card de Dinheiro no Cofre do SaldoBancosDetailModal continua clicavel (interactive=true onClick=...)
5. Zero classes arbitrarias (sem bg-[#...], sem w-[...px])
6. Zero quebraxs de logica - apenas substituicao visual

## 2 Cenarios de Teste

### SCAN -> INFER -> VERIFY -> FIX #1 (Happy Path)
SCAN: Abrir PatioOsDetailModal com OSs ativas
INFER: Os 4 cards devem mostrar Saldo Total (amber), Valor Total (blue), Veiculos (purple), Lojas (emerald)
VERIFY: Verificar que fonte e text-lg sm:text-xl (nao text-2xl como antes)
FIX: Se fonte errada, ajustar prop de tamanho no ModalKpiCard

### SCAN -> INFER -> VERIFY -> FIX #2 (Edge Case - danger)
SCAN: Abrir SaldoBancosDetailModal com saldo negativo em alguma filial
INFER: Card Cheque Especial deve ter fundo bg-red-500/10 e borda border-red-500/30
VERIFY: Inspecionar DOM - checar classes CSS do card
FIX: Se fundo ausente, confirmar que danger=true esta sendo passado via hasNegativo
