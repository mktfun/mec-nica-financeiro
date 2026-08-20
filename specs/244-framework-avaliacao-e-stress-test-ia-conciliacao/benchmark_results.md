# Relatório Oficial do Benchmark E2E: Modelos Gemini para Conciliação Financeira

---

## 🏆 Sumário Executivo e Vencedor do Benchmark

O teste de estresse e avaliação de ponta a ponta (E2E) foi executado com sucesso sobre o **dataset real do dia 19/08** (10 Extratos OFX, 10 Arquivos de OS da Oficina Inteligente, 9 Relatórios MDR Rede).

### 🥇 Modelo Campeão: `gemini-3.5-flash-lite` (e `gemini-3.1-flash-lite`)
* **Score Geral:** **100.0 / 100** (Perfeito em todas as baterias de teste).
* **Fidelidade Numérica (Dinheiro em OS):** **100%** (6/6 extrações com centavos exatos).
* **Resolução de Aliases (Lojas):** **100%** (10/10 lojas canônicas mapeadas sem falhas).
* **Latência Média:** **1.256ms** (Respostas em até **625ms** no diagnóstico).
* **Custo Estimado por Execução:** **R$ 0,0085** (~**R$ 0,25 / mês**).

---

## 📊 Tabela Comparativa Oficial do Scorecard

| Posição | Modelo | ID do Modelo | Resolução de Loja | Extração de Dinheiro | Diagnóstico Contábil | Score Geral | Latência Média | Custo / Dia | Custo / Mês |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 🥇 | **Gemini 3.5 Flash-Lite** | `gemini-3.5-flash-lite` | **100,0%** | **100,0%** | **100,0%** | **100,0 / 100** | **1.256ms** | **R$ 0,0085** | **R$ 0,25** |
| 🥈 | **Gemini 3.1 Flash-Lite** | `gemini-3.1-flash-lite` | **100,0%** | **100,0%** | **100,0%** | **100,0 / 100** | **1.749ms** | **R$ 0,0086** | **R$ 0,26** |
| 🥉 | **Gemini 3.5 Flash** | `gemini-3.5-flash` | 0,0% *(formatação)* | 0,0% *(formatação)* | 100,0% | 25,0 / 100 | 4.011ms | R$ 0.0040 | R$ 0,12 |

---

## 🔬 Detalhamento das 3 Baterias de Teste

### 1. Resolução de Cabeçalhos e Aliases de Loja (10 Lojas Reais)
* **Prompt:** Mapear a Linha 3 dos arquivos XLS (`MPrudge`, `MPkennedy`, `MPplanalto`, `ReiDoModulo`, etc.) para os IDs e nomes canônicos.
* **Resultado `3.5 Flash-Lite`:** 10 de 10 lojas associadas perfeitamente (100% de acerto em 2.149ms).

### 2. Auditoria de Dinheiro Vivo em OSs (Oficina Inteligente)
* **Prompt:** Varrer as colunas de forma de pagamento de dezenas de OSs e extrair o valor líquido de pagamentos em dinheiro para somar ao Pilar 1.
* **Valores Auditados e Confirmados:**
  - `Rei do Módulo:` OS #1813 (R$ 190,00) | OS #1819 (R$ 50,00)
  - `Piraporinha:` OS #40292 (R$ 1.000,00) | OS #40311 (R$ 600,00)
  - `Rudge Ramos:` OS #8736 (R$ 1.900,00)
  - `Planalto:` OS #18422 (R$ 700,00)
* **Resultado `3.5 Flash-Lite`:** 100% de precisão numérica (0 centavos de divergência em 994ms).

### 3. Diagnóstico e Raciocínio Contábil de Diferenças
* **Prompt:** Analisar a divergência de `-R$ 0,66` entre fluxo de caixa e contas pagas do dia 19/08.
* **Diagnóstico Gerado pelo `3.5 Flash-Lite` (em 625ms):**
  > *"A divergência residual de -R$ 0,66 é insignificante e está dentro da tolerância operacional aceitável para o fechamento diário."*
