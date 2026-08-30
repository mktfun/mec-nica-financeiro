# Design: Padronização da Conciliação Diária e Fechamento por Filial no Padrão Canônico do Pátio (306)

## Arquitetura Técnica
A reformulação harmoniza o fluxo visual de Conciliação com o padrão já validado e elogiado de `patio.tsx` e `recebiveis.tsx`.

```
[ PageContainer (variant="finance", max-w-[1600px] 2xl:max-w-[1800px]) ]
  │
  ├── [ Cabeçalho Canônico: Título, Badge de Status, Botões de Ação ]
  │
  ├── [ Grid 4x: Summary Cards Canônicos (border-l-4) ]
  │     ├── Card 1: Previsto / Faturamento (border-l-[var(--color-primary)])
  │     ├── Card 2: Saldo Bancos OFX (border-l-blue-500)
  │     ├── Card 3: Na Loja OS / A Compensar (border-l-amber-500)
  │     └── Card 4: Diferença / Semáforo (border-l-rose-500 se diff>0 ou emerald se 0)
  │
  ├── [ Abas Canônicas (border-b border-[var(--border-subtle)] pb-px) ]
  │     └── TabBtn com indicador plano inferior ativo
  │
  └── [ Container de Tabela / Timeline Canônica: Card (p-0 overflow-hidden mt-4) ]
        └── divide-y divide-[var(--border-subtle)]
              └── Linha de Filial / Transação:
                    ├── Lado Esquerdo: Avatar Circular de Status + Nome + Badges + Metadados
                    └── Lado Direito: Colunas Tabulares font-mono text-right perfeitamente alinhadas
```

## Interfaces TypeScript
Os contratos de dados existentes permanecem inalterados. Para os componentes da lista de lojas e cards:

```typescript
export interface StoreRowData {
  store_id: string;
  store_name: string;
  saldo_banco: number;
  maquininha: number;
  pix: number;
  na_loja_os: number;
  previsto_ofx: number;
  diferenca: number;
  status_compensacao: 'entrou' | 'parcial' | 'nao_entrou' | 'a_compensar' | 'sem_movimento';
  nao_entrou_valor: number;
  status: 'conciliado' | 'pending' | 'divergent';
}
```

## Componentes / Arquivos Envolvidos
1. `src/routes/conciliacao.index.tsx`:
   - Envolver com `PageContainer variant="finance"`.
   - Adicionar os 4 Summary Cards canônicos `border-l-4` no topo.
   - Refatorar a seção "Fechamento por Filial" para o container canônico `<Card className="p-0 overflow-hidden mt-4">` com `<div className="divide-y divide-[var(--border-subtle)]">`.
   - Cada filial renderizada com avatar circular colorido (`w-10 h-10 rounded-full flex items-center justify-center font-bold`), badges semânticos e colunas numéricas alinhadas à direita.
2. `src/routes/conciliacao.$lojaId.tsx`:
   - Envolver com `PageContainer variant="finance"`.
   - Remover o container `bg-black/25` com 6 mini-métricas.
   - Adicionar os 4 Summary Cards canônicos `border-l-4` da filial.
   - Padronizar as abas com `border-b border-[var(--border-subtle)]` e `TabBtn`.
3. `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`:
   - Substituir os cards com `border-l-2` e ícones desiguais por 4 Summary Cards canônicos `border-l-4`.
   - Substituir a tabela com `bg-zinc-950` por `<Card className="p-0 overflow-hidden mt-4 border-[var(--border-subtle)]">` com cabeçalho sticky discreto, `AmountCell` para todos os valores monetários e badges semáforo do Design System.

## Fluxo de UI
1. **Operador acessa `/conciliacao`:**
   - Visualiza tela ampla (até 1800px) sem barras pretas anômalas ou cards amontoados.
   - 4 Summary Cards no topo dão visibilidade instantânea dos totais do dia.
   - Lista de filiais segue o mesmo design de Pátio: cada filial tem seu avatar, status claro (`100% Conciliado` em verde se diff=0 ou `Divergência` em vermelho se diff!=0) e colunas numéricas alinhadas.
2. **Operador clica em uma filial e acessa `/conciliacao/$lojaId`:**
   - A mesma identidade visual se mantém: cabeçalho espaçoso com 4 cards canônicos da filial.
   - Abas limpas alternam entre Cartões, Extrato e Ordens de Serviço sem sobressaltos ou estilos conflitantes.
   - Tabela de cartões com formatação tabular e badges precisos.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Tabela de Lojas no padrão Pátio):**
  - Acessar `/conciliacao`.
  - Verificar se a listagem de filiais é apresentada em container unificado com `divide-y`, avatares circulares coloridos por status e números em `font-mono tabular-nums text-right`.
- **Cenário 2 (Top Cards da Loja):**
  - Acessar `/conciliacao/MPdompedro1`.
  - Verificar se o cabeçalho exibe os 4 Summary Cards canônicos `border-l-4` e se o bloco anômalo `bg-black/25` foi completamente eliminado.
- **Cenário 3 (Tabela de Cartões):**
  - Na aba "Cartão / Maquininha", verificar se os 4 cards de topo e a tabela de vendas seguem o mesmo estilo visual de `patio.tsx`.
- **Cenário 4 (Build de Produção):**
  - Executar `vite build` e garantir saída zero erros.\n