# Proposta Técnica: Lançamento Item a Item de Contas a Pagar & Faturamentos/Ajustes Manuais + Correção de Duplicidade de Maquininhas (Spec 249)

---

## 1. 🎯 Objetivos

1. **Correção de Maquininhas Duplicadas (1k a mais):**
   * Corrigir a conciliação da Rede para que vendas depositadas em contas cruzadas (ex: terminal `0102553424` da Dom Pedro que caiu na conta da Jorge Beretta / Rudge Ramos) sejam reconhecidas como **ENTROU**, eliminando a falsa pendência de ~R$ 1.075,82 e a duplicação no saldo.
2. **Lançamento Item a Item de Contas (Contas Manuais):**
   * Permitir cadastrar despesas/contas uma a uma com **Nome**, **Descrição**, **Categoria** e **Valor**.
   * Exibir a lista detalhada e o somatório dentro do card / modal de Contas a Pagar.
3. **Lançamento Item a Item de Faturamentos & Ajustes:**
   * No card de Faturamento do Dia, permitir adicionar itens avulsos com **Nome**, **Descrição** e **Valor** (ex: *Aporte de R$ 10.000,00*, *Estorno de Cartão de R$ 3.342,24*).
   * O Faturamento Total consolidará automaticamente: `Oficina Inteligente (Dia) + Ajustes Manuais`.

---

## 2. 🗄️ Estrutura do Banco de Dados (PostgreSQL)

```sql
-- 1. Contas Manuais Detalhadas
CREATE TABLE public.daily_manual_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    store_id TEXT REFERENCES stores(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'outros',
    amount NUMERIC NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ajustes / Entradas Manuais de Faturamento
CREATE TABLE public.daily_revenue_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'aporte', -- 'aporte', 'estorno_cartao', 'venda_avulsa', 'outros'
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. 🖼️ Interface e Modais Interativos

### A. Modal "Contas a Pagar do Dia" (Ao clicar no Card 4)
* Lista de todas as contas cadastradas para a data selecionada.
* Formulário simples no topo ou modal:
  * `Nome / Fornecedor` (ex: Aluguel Dom Pedro)
  * `Descrição` (ex: Boleto 2/3 ref. Agosto)
  * `Categoria` (Fornecedor, Aluguel, Folha, Imposto, etc.)
  * `Valor (R$)`
* Botão **`+ Adicionar Conta`** e ícone de lixeira para excluir.

### B. Modal "Faturamento & Ajustes do Dia" (Ao clicar no Card de Faturamento)
* Exibição clara:
  * 🏢 **Faturamento Oficina Inteligente:** `R$ 63.515,88`
  * ➕ **Ajustes Manuais Adicionados:**
    * *Aporte Sócios:* `+ R$ 10.000,00`
    * *Estorno de Cartão:* `+ R$ 3.342,24`
  * 💵 **Faturamento Consolidado:** `R$ 76.858,12`
* Formulário rápido para adicionar novo aporte, estorno ou entrada manual.

---

## 4. 🧠 Atualização da RPC `get_daily_reconciliation_summary`

A RPC passará a retornar:
* `contas_manual`: Soma de `daily_manual_bills` (com fallback no snapshot caso não haja itens cadastrados).
* `contas_itens`: Array com os itens de contas do dia.
* `faturamento_ajustes`: Soma de `daily_revenue_adjustments`.
* `faturamento_itens`: Array com os ajustes de faturamento do dia.
* `faturamento_periodo`: `faturamento_oi + faturamento_ajustes`.

---

## 5. 📋 Plano de Verificação

1. **Eliminação da Duplicidade de Maquininhas:** Verificar que o saldo de Dom Pedro não duplica R$ 1.075,82.
2. **Adição de Contas:** Inserir 2 contas manuais e verificar se somam no Card 4 e no subtotal de contas instantaneamente.
3. **Adição de Faturamento:** Inserir Aporte (R$ 10.000,00) e Estorno (R$ 3.342,24) e verificar que o faturamento de 21/08 vai para R$ 76.858,12 e a diferença bate em **-R$ 0,72**!
