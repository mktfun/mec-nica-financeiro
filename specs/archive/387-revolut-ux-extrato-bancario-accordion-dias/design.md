# Design: Redesign Revolut Fintech UX do Extrato Bancário da Filial (387)

## Arquitetura e Fluxo de Dados
```
[Hook: useStoreExtratoBancario(storeId, date)]
  │
  ▼
[StoreExtratoBancarioView.tsx]
  ├── Hero KPI Section (Revolut Analytics 2.0 Grid 4x1)
  │     ├── Card 1: Saldo Oficial (<LEDGERBAL>) com contexto do Saldo Anterior
  │     ├── Card 2: Total Entradas (Pill esmeralda, contagem)
  │     ├── Card 3: Total Saídas (Pill rosé, contagem)
  │     └── Card 4: Movimentação Líquida & Status
  │
  ├── Controls Bar (Segmented Control [Lote OFX / Dia Alvo], Busca & Toggle [Expandir/Recolher Todos])
  │
  └── Extrato Accordion por Dias (Framer Motion Animation)
        │
        ├── [Header Dia 09/09]: Data extensa • 3 itens • Subtotal: +R$ 2.490,07 • [Chevron]
        │     └── AnimatePresence -> Lista de Lançamentos 09/09 (Revolut Row Layout)
        │
        ├── [Header Dia 08/09]: Data extensa • 11 itens • Subtotal: -R$ 8.562,80 • [Chevron]
        │     └── AnimatePresence -> Lista de Lançamentos 08/09 (Revolut Row Layout)
        │
        └── Rodapé Fiduciário: Saldo Oficial de Fechamento (<LEDGERBAL>)
```

## Anatomia do Lançamento Revolut (Single Cell sem Redundância)
```
[ Ícone Squircle ]  [ Nome Limpo da Contraparte ] [ Badge: Conta/OS/Rede ]   ----->  [ + R$ 5.490,07 ]  [ Ações ]
                    [ Tipo • Doc/CNPJ • Justificativa em itálico ]                   [ Status Pill   ]
```

## Mutações em Arquivos Existentes [MODIFY]

### `src/components/conciliacao/StoreExtratoBancarioView.tsx`
1. **Estruturação de Grupos por Data:**
   - Adicionar helper `transactionsByDay: Map<string, DayGroupData>` agrupando as transações ordenadas cronologicamente.
   - Estado `collapsedDays: Set<string>` para controlar a abertura/fechamento de cada dia.
2. **Cards de KPIs Revolut 2.0:**
   - Retornar ao grid de 4 cards com tipografia refinada e sem bordas duras laterais.
3. **Accordion com Micro-Animação:**
   - Usar `motion.div` ou transições controladas para colapsar/expandir a lista de cada dia ao clicar no header.
4. **Eliminação de Redundância:**
   - Unificar a descrição repetida em uma única coluna fluida e responsiva com avatar temático por categoria.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Accordion Interativo):** O usuário clica no cabeçalho do dia 08/09 -> as 11 transações colapsam suavemente, mantendo visível apenas o resumo do dia e as transações de 09/09.
- **Cenário 2 (Zero Redundância):** Conferir na linha de "Auto Peças Lúdio ABC" que o texto da empresa e CNPJ aparecem uma única vez de forma harmoniosa com o badge da conta associada.
- **Cenário 3 (Aritmética e Build):** Validar que a soma de todos os dias e os 4 KPIs fecham perfeitamente no Saldo Final oficial (-R$ 5.659,95) e o `npm run build` encerra com código 0.
