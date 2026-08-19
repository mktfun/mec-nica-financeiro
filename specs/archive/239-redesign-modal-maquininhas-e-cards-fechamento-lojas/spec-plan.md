# Spec Plan: Redesign Widescreen do Modal de Maquininhas & Fechamento por Loja (Spec 239)

## 1. Escopo das Modificações

### 1.1 Modal Genérico
- [x] Suporte à propriedade `size` no componente `Modal.tsx` (`sm`, `md`, `lg`, `xl`, `2xl`, `full`).

### 1.2 Modal de Maquininhas
- [x] Configurar `size="2xl"` em `MaquininhasDetailModal.tsx`.
- [x] Redesenhar os 4 KPIs de cabeçalho (`Vendas Rede`, `Taxas & MDR`, `Creditado OFX`, `A Compensar / Não Entrou`).
- [x] Expandir a tabela de conciliação tripla para formato widescreen com badges legíveis e transações OFX em chips.

### 1.3 Cards de Lojas
- [x] Redesenhar o layout do fechamento de lojas em `conciliacao.index.tsx` no padrão 2-Tier executivo.
- [x] Alinhamento perfeito das 6 colunas de métricas.

---

## 2. Validação & Build

- [x] Build de produção (`npm run build`) validado com código 0.
