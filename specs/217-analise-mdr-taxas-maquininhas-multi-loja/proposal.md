# Proposal: Auditoria Analítica de MDR, Taxas de Maquininhas e Divergência Contratual Multi-Loja (217)

## Problema
1. **Opacidade das Taxas de Adquirentes:** Ao importar relatórios de vendas da Rede e maquininhas, as adquirentes descontam tarifas de MDR, taxas de antecipação e custos operacionais que frequentemente divergem das taxas acordadas em contrato.
2. **Falta de Isolamento Multi-Loja (1:N):** Um único arquivo consolidado da adquirente contém vendas de múltiplos estabelecimentos/CNPJs de várias lojas, dificultando saber qual filial está sendo mais onerada ou sofrendo cobranças indevidas.
3. **Ausência de Alertas de Desvio em Tempo Real:** Sem um cálculo automático da taxa efetiva ($\text{MDR Efetiva} = (1 - \frac{\text{valor\_liquido}}{\text{valor\_venda\_atualizado}}) \times 100$) comparada a uma tabela de contrato, o financeiro não consegue identificar discrepâncias e contestar cobranças abusivas junto à adquirente.

## Solução Proposta
1. **Parser Aprimorado de Vendas da Rede / CSV / XLSX (`src/lib/parsers/redeSalesParser.ts`):**
   - Mapeamento robusto das colunas críticas do extrato de vendas:
     - `Valor da venda atualizado` / `Valor bruto`
     - `Valor líquido`
     - `Valor total das taxas descontadas` / `MDR` / `Taxa de antecipação`
     - `Nome do estabelecimento` / `Número do estabelecimento (PV)` / `CNPJ`
     - `Meio de pagamento` / `Produto` / `Bandeira` (Visa, Master, Elo, Hiper, PIX)
     - `Plano / Parcelas` (Débito, Crédito à Vista, Parcelado 2-6x, Parcelado 7-12x)
     - `Data da venda` e `Data prevista de crédito`
2. **Tabela de Parâmetros Contratuais (`pos_fee_contracts`):**
   - Cadastro de taxas de referência contratadas por adquirente, bandeira e modalidade de parcelamento.
3. **Motor de Cálculo e Auditoria MDR Multi-Loja:**
   - Cálculo automático da **Taxa Efetiva (%)**:
     $$\text{MDR Efetiva (\%)} = \left(1 - \frac{\text{valor\_liquido}}{\text{valor\_venda\_atualizado}}\right) \times 100$$
   - Cálculo da **Divergência Contratual** e **Custo a Maior (R$)**:
     $$\text{Divergência (\%)} = \text{MDR Efetiva} - \text{MDR Contratada}$$
     $$\text{Cobrança a Maior (R\$)} = \max\left(0, (\text{MDR Efetiva} - \text{MDR Contratada}) \times \frac{\text{Valor Bruto}}{100}\right)$$
4. **Dashboard & Painel de Auditoria de Maquininhas (`src/components/maquininhas/MdrAuditView.tsx`):**
   - Visão consolidada multi-loja e filtro por filial individual (`store_id`).
   - KPIs no topo:
     - 💳 **Volume Total Transacionado (Bruto)**
     - 💰 **Total Líquido Creditado**
     - 📉 **Taxa Efetiva Média Global (%)**
     - ⚠️ **Total Cobrado Acima do Contrato (R$)**
   - Gráfico de barras comparando **MDR Efetiva vs MDR Contratada** por Bandeira/Modalidade.
   - Tabela analítica com badges de auditoria (`✅ Em Contrato`, `⚠️ Desvio Leve`, `🚨 Cobrança Abusiva`), ordenação por maior prejuízo e botão de exportação para contestação.

## Contratos de Dados

### Nova Tabela: `pos_fee_contracts`
```sql
CREATE TABLE IF NOT EXISTS public.pos_fee_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES public.stores(id) ON DELETE CASCADE, -- NULL = taxa padrão global da rede
    acquirer TEXT NOT NULL DEFAULT 'REDE',                        -- 'REDE', 'CIELO', 'STONE', etc.
    payment_method TEXT NOT NULL,                                 -- 'debito', 'credito_vista', 'credito_2_6', 'credito_7_12', 'pix'
    brand TEXT NOT NULL,                                          -- 'visa', 'mastercard', 'elo', 'hipercard', 'todos'
    contracted_rate_pct NUMERIC(6,3) NOT NULL,                    -- Ex: 1.100 (%)
    max_tolerance_pct NUMERIC(6,3) DEFAULT 0.150,                 -- Tolerância aceitável
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Extensão da Tabela / View: `pos_transactions`
- Campos analíticos adicionados:
  - `card_brand` TEXT (ex: 'Mastercard', 'Visa', 'Elo')
  - `installments` INTEGER DEFAULT 1
  - `effective_rate_pct` NUMERIC(6,3) -- Taxa MDR real calculada
  - `contracted_rate_pct` NUMERIC(6,3) -- Taxa contratada esperada
  - `overcharge_amount` NUMERIC(12,2) DEFAULT 0 -- Prejuízo calculado
  - `terminal_number` TEXT -- PV da maquininha

## API / Interface
- **RPC PostgreSQL:** `get_mdr_audit_summary(p_store_id TEXT, p_start_date DATE, p_end_date DATE)`:
  - Retorna resumo agregado de taxas por loja, por bandeira e por modalidade com total de desvios.
- **Hook React:** `src/hooks/useMdrAudit.ts`

## Risco Principal (Bayesian Risk Assessment)
- **Risco:** Falta de taxa contratada cadastrada para alguma bandeira exótica gerando falsos positivos de divergência.
- **Probabilidade:** Média.
- **Impacto:** Baixo / Reversível.
- **Mitigação:** Tratamento `COALESCE` com taxa padrão da modalidade ou status `ℹ️ Sem Contrato Cadastrado` em vez de marcar como divergência abusiva.
