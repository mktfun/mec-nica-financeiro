# Design: Redesign e Simplificação em 3 Abas na Conciliação por Loja (Spec 271)

## Arquitetura da Tela de Loja (`/conciliacao/$lojaId`)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Cabeçalho da Loja: Nome, Avatar, Data Alvo, Badge MDR e Extrato Bruto  │
│ Banner de Maquininha: Vendas Líq, Creditado OFX, A Compensar, Status    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ Aba 1:               │  │ Aba 2:               │  │ Aba 3:               │
│ Cartão / Maquininha  │  │ Extrato Bancário     │  │ Ordens de Serviço    │
│ (Vendas & Liquidação)│  │ (OFX & PIX / Entradas│  │ (OSs & Pátio da Loja)│
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

## Estrutura de Cada Componente

### 1. `StoreCartaoMaquininhaView.tsx`
- **Cards de Resumo:**
  - `Vendas Brutas (Rede)` (R$ ...)
  - `Taxas Retidas (MDR)` (-R$ ... / % médio)
  - `Líquido a Receber` (R$ ...)
  - `Creditado no Extrato` (R$ ...)
- **Tabela:**
  - Colunas: `Bandeira / Modalidade`, `Bruto (Rede)`, `Taxa MDR Retida`, `Líquido Credito`, `OS / Veículo`, `Status no Banco`.
  - Badges: `[Liquidado no Banco]` (verde) ou `[A Compensar]` (âmbar).

### 2. `StoreExtratoBancarioView.tsx`
- **Cards de Resumo:**
  - `Total Entradas no Banco` (R$ ...)
  - `Identificado com OS / Cartão` (R$ ...)
  - `Receitas Avulsas / Justificadas` (R$ ...)
  - `Pendente de Identificação` (R$ ...)
- **Tabela (Estilo Extrato Real):**
  - Colunas: `Data / Hora`, `Descrição do Lançamento`, `Documento / Contraparte`, `Valor Depositado (+ R$)`, `Identificação / Vínculo`, `Ações`.
  - Badges de Vínculo:
    - `[Rede Liquidada]` para lotes de cartão.
    - `[OS #XXX - Cliente (Placa)]` para PIX/TED vinculado a OS.
    - `[Venda de Sucata]` ou `[Aporte]` para justificativas avulsas.
    - `[Não Identificado]` para itens pendentes.
  - Ações:
    - Botão `Vincular OS` (abre `ManualMatchOsModal`).
    - Botão `Justificar` (abre `OrphanCategorizationModal`).
    - Botão `Desvincular` (para remover vínculo incorreto).

### 3. `StoreOrdensServicoView.tsx`
- **Cards de Resumo:**
  - `Total das OSs da Loja` (R$ ...)
  - `Total Pago / Recebido` (R$ ...)
  - `Saldo em Pátio (Pendente)` (R$ ...)
  - `Quantidade de Veículos` (X OSs)
  - Botão `+ Nova OS Manual` no canto superior.
- **Tabela:**
  - Colunas: `Nº OS`, `Placa / Veículo`, `Cliente`, `Valor Total`, `Valor Pago`, `Saldo Devedor / Pátio`, `Modalidade`, `Status`, `Ações`.
  - Ações:
    - Botão `Editar OS` (inputs inline ou modal rápido para alterar total, pago ou status com sincronização de snapshot).
    - Botão `Ver Detalhes / Timeline` (detalhamento dos pagamentos).

## Diretrizes de Estilo
- Dark UI sólido (`bg-zinc-950`, `bg-zinc-900`, bordas `border-zinc-800`).
- Tipografia Inter e números monoespaciados com cores semânticas (`emerald-400`, `amber-400`, `blue-400`).
- Transições suaves e responsividade completa.
