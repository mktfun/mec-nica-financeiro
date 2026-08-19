# Proposta: Redesign Widescreen do Modal de Maquininhas & Refinamento Visual dos Cards de Filiais (Spec 239)

## 1. Diagnóstico do Feedback Visual do Usuário

### 💥 Problema 1: Modal de Maquininhas apertado e truncando valores
- **Causa Raiz:** O componente genérico `Modal.tsx` estava com largura travada em `max-w-lg` (512px) e ignorava a propriedade `size="xl"`.
- **Consequência:** A janela de detalhamento de maquininhas abria espremida, cortando o número `R$ 36.317,0...`, esmagando os 4 KPIs no topo e gerando barras de rolagem horizontal e vertical que quebravam a tabela de conciliação tripla.

---

### 💥 Problema 2: Cards das Lojas em "Fechamento por Loja" desproporcionais e pouco estéticos
- **Causa Raiz:** Os blocos de métricas dentro de cada filial estavam com labels verticais desordenadas, sub-totais de `OFX` e `+ Maq` sem espaçamento e quebras de linha duras.
- **Consequência:** A visualização das 10 filiais parecia pesada e confusa.

---

## 2. Solução Proposta

### 🖥️ 2.1 Modal Widescreen Responsivo (`Modal.tsx` & `MaquininhasDetailModal.tsx`)
- **Suporte a Tamanhos Dinâmicos no `Modal.tsx`:**
  - `size="2xl"`: `max-w-6xl` (~1152px), garantindo tela cheia expansiva para o Detalhamento de Maquininhas.
  - `size="xl"`: `max-w-4xl` (~896px).
  - `size="lg"`: `max-w-2xl` (~672px).
- **Top KPIs Espaçosos em 4 Colunas:**
  - `Vendas Rede (Líquido)` | `Taxas & MDR (Rede)` | `Creditado no OFX` | `A Compensar (Não Entrou)` com números grandes e sem corte.
- **Tabela de Conciliação Tripla 100% Legível:**
  - Colunas com largura confortável (`Loja`, `Venda Rede Líq`, `Creditado OFX`, `Não Entrou / A Compensar`, `Status`, `Bandeiras & Transações`).

### 🏬 2.2 Refinamento Visual dos Cards de Lojas (`conciliacao.index.tsx`)
- **Cabeçalho da Loja Equilibrado:**
  - Nome da loja com tipografia refinada, ID discreto e badge de compensação da maquininha (`ENTROU` / `NÃO ENTROU (+ R$ ...)`) alinhada.
- **Grid de 6 Métricas Fluídas:**
  - 1. **SALDO BANCOS:** Destaque em ciano com sub-chips `OFX` e `+ Maq` alinhados.
  - 2. **MAQUININHA:** Destaque em índigo.
  - 3. **PIX:** Destaque em azul.
  - 4. **NA LOJA OS:** Destaque em âmbar.
  - 5. **PREVISTO:** Destaque limpo com indicador de justificadas se houver.
  - 6. **DIFERENÇA:** Destaque em esmeralda (se $\le \text{R\$ 50}$) ou rosa avermelhado com badge de conformidade.
- **Hover & Ação:** Botão de Raio-X suave e transição fluida ao clicar para abrir a conciliação individual da loja.

---

## 3. Critérios de Aceite

1. ✅ Ao clicar no card de Saldo Bancos (+ Maq), a janela de Maquininhas abre em formato **Widescreen 2XL**, sem números cortados e sem barra de rolagem horizontal desnecessária.
2. ✅ Os cards das 10 filiais em "Fechamento por Loja" exibem suas 6 colunas perfeitamente alinhadas, legíveis e com visual executivo premium.
3. ✅ `npm run build` compila com 0 erros.
