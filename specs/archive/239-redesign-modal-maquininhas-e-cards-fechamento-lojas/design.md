# Design: Redesign Widescreen do Modal de Maquininhas & Fechamento por Loja (Spec 239)

## 1. Arquitetura do Componente Modal (`Modal.tsx`)

```
               ModalProps (size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full')
                                      │
           ┌──────────────────────────┼──────────────────────────┐
           │                          │                          │
       size="sm"                  size="xl"                  size="2xl"
       (max-w-sm)                 (max-w-4xl)                (max-w-6xl)
                                                                 │
                                                                 ▼
                                                  MaquininhasDetailModal.tsx
                                                  - 4 Cards Largos de KPIs
                                                  - Tabela Tripla Espaçosa
```

---

## 2. Layout do Card de Filial em 2 Níveis (`conciliacao.index.tsx`)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ● Dom Pedro - DP   [st-01]   [MAQ: NÃO ENTROU (+ R$ 361,46)]          [Dif: R$ 2.000,08] [Raio-X]│
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [SALDO BANCOS]    [MAQUININHA]     [PIX]            [NA LOJA (OS)]   [PREVISTO]       [DIFERENÇA]│
│  R$ 3.181,93       R$ 20,54         R$ 2.120,00      R$ 4.834,00      R$ 4.140,62      R$ 2.000,08│
│  OFX: 2.820,47     Rede Cartões     Entradas PIX     Pátio Aberto     Faturamento ap.  ⚠ Divergência│
│  + Maq: +361,46                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```
