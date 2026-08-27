# Design: Padronização do Modal de OSs do Pátio e Painel de 6 Métricas da Filial (308)

## Arquitetura Técnica
```
[ResumoDiaPanel] -> (Clica 'Ver OSs ↗') -> [PatioOsDetailModal]
                                              |-- 4 Summary Cards (border-l-4)
                                              |-- Toolbar de Busca e Filtro de Lojas
                                              \-- Tabela de OSs com AmountCell e StatusBadge

[/conciliacao/$lojaId]
       |-- Header da Filial (Avatar, Nome, Data, Botão Extratos)
       |-- Painel Executivo das 6 Métricas (Saldo Total, Maquininha, PIX, Na Loja OS, Previsto, Diferença)
       |-- Abas Canônicas (border-b-2 sem fundo verde, 1:1 com patio.tsx)
       \-- Visão Ativa (Cartão / Extrato / Ordens de Serviço)
```

## Componentes / Arquivos Modificados
1. `src/components/conciliacao/PatioOsDetailModal.tsx`:
   - Modal reestilizado com 4 cards `border-l-4` (Amber, Blue, Purple, Emerald).
   - Tabela de OSs dentro de `<Card className="p-0 overflow-hidden">` com colunas alinhadas à direita em `font-mono tabular-nums`.
2. `src/routes/conciliacao.$lojaId.tsx`:
   - Adicionado o painel de 6 métricas no topo da filial.
   - Abas atualizadas para o estilo plano sem fundo verde.
3. `src/components/conciliacao/StoreOrdensServicoView.tsx`:
   - 4 cards superiores convertidos para `border-l-4` canônico.

## Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)
- **Cenário 1 (Modal de OSs do Pátio):** Abrir modal clicando em "Ver OSs ↗" -> os 4 KPIs aparecem com `border-l-4`, tabela com `AmountCell` e sem inconsistência visual.
- **Cenário 2 (Painel das 6 Métricas na Filial):** Abrir `/conciliacao/$lojaId` -> o painel de 6 métricas exibe Saldo Total, Maquininha, PIX, Na Loja OS, Previsto e Diferença idênticos ao card da home.
- **Cenário 3 (Abas da Filial):** Navegar entre as 3 abas -> a aba ativa possui linha inferior verde esmeralda e texto branco, SEM nenhum fundo esverdeado artificial.\n