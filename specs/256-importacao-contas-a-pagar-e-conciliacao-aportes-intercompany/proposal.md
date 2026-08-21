# Proposal: Importação Analítica do "BuscaContasAPagar.xls", Cadastro de Entidades/Contas e Cruzamento Triangular Intercompany (Spec 256)

---

## 📌 1. Problema
1. O valor de **Contas a Pagar** do fechamento diário é consolidado manualmente sem discriminação analítica de fornecedores e filiais.
2. Transferências e aportes entre filiais e sócios (ex: Loja A transfere R$ 10k para o sócio, que junta mais R$ 6k e aporta R$ 16k na Loja B) causam divergências contábeis complexas porque parte da saída (os R$ 6k) não foi emitida previamente como título no ERP.
3. Não há um cadastro formal de **Sócios, Contas Vinculadas e Regras de Classificação**, fazendo com que o sistema não saiba automaticamente a rota do dinheiro entre as contas.

---

## 🎯 2. Solução Proposta

### 2.1 Cadastro Central de Entidades & Contas Vinculadas (`intercompany_entities` e `expense_category_rules`):
* **Cadastro de Sócios & Chaves PIX:** Nomes e documentos de sócios (ex: Daniel, Rogério, Raphael).
* **Mapeamento de Contas Bancárias das 10 Filiais:** Vinculação de cada agência/conta do Itaú à sua respectiva loja.
* **Tabela de Regras de Categorização de Despesas:** Mapeamento dinâmico de `Fornecedor/Palavra-chave ➔ Categoria` com fallback automático para `Outros / Operacional`.

### 2.2 Parser & Importador Analítico do `BuscaContasAPagar.xls`:
* Extrai as 253 contas (R$ 195.066,04), mapeia 100% das 10 filiais pela coluna `Emp` e categoriza automaticamente.
* Associa despesas de frete/Uber diretamente às OSs do pátio (`REF. UBER OS22541` ➔ OS #22541).

### 2.3 Motor de Cruzamento Triangular de Aportes & Transferências (Zero Dúvidas):
* **Varredura Cruzada:** Detecta saída na Loja A (Retirada de Sócio) ➔ Passagem pelo Sócio ➔ Entrada de Aporte na Loja B.
* **Resolução Automática do Delta:**
  1. Soma o Aporte total (+R$ 16.000) no Faturamento (`daily_revenue_adjustments`).
  2. Vincula a parcela coberta (R$ 10.000) ao título do contas a pagar do ERP.
  3. Lança a despesa delta (+R$ 6.000) em `daily_manual_bills` com justificativa contábil transparente (*"Despesa Delta de Aporte Sócio"*).
  4. O fechamento contábil zera perfeitamente sem intervenção manual!

---

## 🗄️ 3. Contratos de Dados (Tabelas Supabase)

### 3.1 Tabela `public.intercompany_entities`:
```sql
CREATE TABLE public.intercompany_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'socio', 'filial', 'holding', 'parceiro'
    cpf_cnpj TEXT,
    pix_keys TEXT[],
    store_id TEXT REFERENCES stores(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Tabela `public.expense_category_rules`:
```sql
CREATE TABLE public.expense_category_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern TEXT NOT NULL, -- ex: 'GOOGLE', 'VERISURE', 'CAMBIO', 'UBER OS'
    category TEXT NOT NULL, -- 'gestao_tech', 'pecas', 'logistica_os', 'retirada_socios'
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.3 Evolução da Tabela `public.daily_manual_bills`:
```sql
ALTER TABLE public.daily_manual_bills 
ADD COLUMN IF NOT EXISTS external_code TEXT,
ADD COLUMN IF NOT EXISTS installment TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS is_intercompany BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS intercompany_entity_id UUID REFERENCES intercompany_entities(id),
ADD COLUMN IF NOT EXISTS matched_os_number TEXT;
```

---

## ⚠️ 4. Risco Principal & Mitigação
* **Risco:** Um PIX comum de cliente ser confundido com um aporte de sócio.
* **Mitigação:** Cruzamento obrigatório com a tabela `intercompany_entities` (validação de titularidade e chave PIX cadastrada) antes de acionar a regra triangular.
