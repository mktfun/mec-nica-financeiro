# Proposta: Card de Saldo Bancos com Sub-chips Adaptativos & Consolidação Encadeada (Spec 254)

---

## 1. 🎯 Sub-chips Dinâmicos e Adaptativos no Card "Saldo Bancos + Dinheiro"

O card superior de Saldo Bancário se adaptará dinamicamente à composição do saldo daquele dia:

1. **Caso 1: OFX + Cofre + Maquininhas (3 itens ativos):**
   * Grade de 3 colunas (`grid-cols-3`):
     * `OFX: R$ 23.527,81` (Neutro)
     * `Cofre: + R$ 4.888,26` (Âmbar)
     * `A Compensar: + R$ X.XXX,XX` (Esmeralda)
2. **Caso 2: OFX + Cofre (2 itens ativos - Estado atual):**
   * Grade de 2 colunas amplas (`grid-cols-2`):
     * `Extrato OFX (10 bancos): R$ 23.527,81`
     * `Dinheiro no Cofre: + R$ 4.888,26`
3. **Caso 3: Apenas OFX (1 item ativo):**
   * Grade de 1 coluna inteira (`grid-cols-1`):
     * `Extrato OFX (10 bancos): R$ 23.527,81`

---

## 2. 📐 Nivelamento Perfeito dos 4 Cards Superiores (Sem Vazio)

* Todos os 4 cards (`SALDO BANCOS`, `DINHEIRO MP`, `A RECEBER`, `NA LOJA OS`) terão a **mesma altura uniforme** e estrutura consistente:
  * **Header:** Título uppercase com dot de status e ícone temático à direita.
  * **Valor Principal:** Tipografia grande com destaque visual.
  * **Rodapé Informativo:** Chips estilizados na base com o mesmo espaçamento em todos os 4 cards.

---

## 3. 📊 Esteira da Consolidação do Dia (A Ordem Exata do Excel)

Reorganização da Consolidação em **3 Passos Numerados e Conectados**:

* **Passo 1 (Variação de Caixa):**
  * `[ Caixa Atual: R$ 150.599,79 ]`
  * `- [ Caixa Anterior: R$ 271.922,90 ]`
  * `➔ = [ Fluxo de Caixa: -R$ 121.323,11 ]`
* **Passo 2 (Recurso Disponível):**
  * `[ Faturamento Total: R$ 76.858,12 ]` (OI: R$ 63.515,88 + Ajustes: R$ 13.342,24 • `Ver Detalhes ↗`)
  * `+ [ |Fluxo de Caixa|: R$ 121.323,11 ]`
  * `➔ = [ Valor Disp. Contas: R$ 198.181,23 ]`
* **Passo 3 (Total de Contas a Cobrir):**
  * `[ Contas (Manual): R$ 195.066,04 ]` (`Ver Contas ↗`)
  * `+ [ Juros REDE: R$ 3.115,41 ]`
  * `➔ = [ Subtotal Contas: R$ 198.181,45 ]`
* **Card Lateral (Diferença Final):**
  * `|Valor Disp. Contas| - Subtotal Contas` = **`-R$ 0,22` (Fechamento Conforme ✅)**

---

## 4. 📋 Arquivos a Modificar

* [`src/components/conciliacao/ResumoDiaPanel.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/ResumoDiaPanel.tsx)
