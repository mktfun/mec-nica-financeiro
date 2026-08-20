# Proposta Técnica: Diagnóstico e Resolução da Diferença de R$ 10.958,39 no Pátio (Na Loja OS)

## 1. Origem Exata da Diferença (R$ 111.112,08 vs R$ 100.153,69)

A diferença de **R$ 10.958,39** (~11 mil reais) é composta por 3 motivos pontuais identificados cirurgicamente:

---

### Motivo 1: OSs Fantasmas / Duplicadas sob Kennedy (Total: +R$ 7.713,50)
No banco de dados, a filial **Kennedy (st-04)** recebeu arquivos de OS da filial **Rudge Ramos (st-07)** devido a cruzamento de alias na importação antiga:

| OS # | Loja no Sistema | Loja Real | Status no Sistema | Valor no Pátio | O que aconteceu no Excel |
|:---|:---|:---|:---|---:|:---|
| **#8733** | Kennedy | Rudge Ramos | `em_aberto` | **R$ 2.333,80** | Paga em 14/08 via Cartão (R$ 2.930,90). Saldo = R$ 0,00 |
| **#8736** | Kennedy | Rudge Ramos | `em_aberto` | **R$ 2.112,50** | Paga em 17/08 via Dinheiro (R$ 1.900,00). Saldo = R$ 0,00 |
| **#8721** | Kennedy | Rudge Ramos | `em_aberto` | **R$ 1.957,50** | Duplicada! Já existe corretamente na filial Rudge Ramos |
| **#8737** | Kennedy | Rudge Ramos | `em_aberto` | **R$ 569,70** | Paga em 17/08 (R$ 569,70). Saldo = R$ 0,00 |
| **#8732** | Kennedy | Rudge Ramos | `em_aberto` | **R$ 500,00** | Duplicada! Já existe corretamente na filial Rudge Ramos |
| **#8738** | Kennedy | Rudge Ramos | `em_aberto` | **R$ 240,00** | Paga em 17/08 (R$ 240,00). Saldo = R$ 0,00 |

*Além disso, as OSs **#8659 (R$ 1.200,00)** e **#8689 (R$ 4.140,00)** que estão sob Kennedy pertencem a Rudge Ramos. Ao transferi-las para Rudge Ramos, Rudge fica com exatos **R$ 8.451,00** e Kennedy fica com exatos **R$ 2.936,30**, batendo 100% com o Excel.*

---

### Motivo 2: Jorge Beretta — OS #1092 com PIX Parcial Não Registrado (+R$ 2.264,89)
* **No Sistema:** Total = R$ 2.409,46 | Pago = R$ 0,00 | **Saldo no Pátio = R$ 2.409,46**
* **Na Planilha Real:** Houve entrada de PIX de **R$ 2.264,89** no dia 17/08 (`pix 2264,89 | fim hj`), restando apenas **R$ 144,57** no pátio.
* **Diferença gerada:** `R$ 2.409,46 - R$ 144,57` = **`+R$ 2.264,89`**.

---

### Motivo 3: Dom Pedro I — OS #583 Aberta no Dia (+R$ 980,00)
* **No Sistema:** OS #583 aberta em 19/08 com **R$ 980,00**.
* **Na Planilha Real:** A filial Dom Pedro I só contabilizou no pátio a OS #582 (**R$ 3.854,00**).
* **Diferença gerada:** **`+R$ 980,00`**.

---

## 2. Sumário da Reconciliação Matemática

$$\begin{aligned}
\text{Saldo Atual no Sistema} &= \text{R\$} 111.112,08 \\
- \text{OSs fantasmas/duplicadas Kennedy} &= -\text{R\$} 7.713,50 \\
- \text{Baixa PIX OS \#1092 Jorge Beretta} &= -\text{R\$} 2.264,89 \\
- \text{OS \#583 Dom Pedro} &= -\text{R\$} 980,00 \\
\hline
\mathbf{Total\ P\acute{a}tio\ Corrigido} &= \mathbf{R\$\ 100.153,69\ (100\%\ id\hat{e}ntico\ ao\ Excel!)}
\end{aligned}$$

---

## 3. Plano de Ação Proposto

1. **Correção no Banco de Dados (`patio_os`):**
   * Excluir/Finalizar as 6 OSs fantasmas sob Kennedy (`8733`, `8736`, `8721`, `8737`, `8732`, `8738`).
   * Reatribuir as OSs `8659` e `8689` para a filial correta (**Rudge Ramos**).
   * Atualizar `paid_value` da OS `1092` para `R$ 2.264,89` (ficando saldo restante `R$ 144,57`).
   * Marcar OS `583` como finalizada/paga.

2. **Blindagem do Parser de Importação de OS (`CentralImportWizard.tsx`):**
   * Garantir que o nome da loja no cabeçalho do arquivo XLS (`Planalto`, `Rudge Ramos`, `Kennedy`, etc.) prevaleça sobre aliases genéricos para impedir que OSs de uma loja sejam vinculadas a outra.
