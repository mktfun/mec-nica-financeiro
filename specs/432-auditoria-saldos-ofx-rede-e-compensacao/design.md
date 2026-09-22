# Design — Spec 432: Auditoria OFX x Rede, Resolução Canônica de Saldos e Calibração dos Matchers

## 1. Arquitetura de Reconciliação Temporal (D x D+1)

```mermaid
flowchart TD
    subgraph Files [Arquivos Importados (Data D)]
        OFX[Extrato OFX de D: Contém transações de D e Saldo Fechamento D]
        Rede[Relatório Rede de D: Vendas Cartão de D - Prazo 1 d.u.]
    end

    subgraph Parser [Parser OFX - ofxParser.ts]
        P1[Identifica transações de D]
        P2[Captura SALDO TOTAL DISPONÍVEL DIA como Saldo Base de D]
        P3[Ignora contaminação de créditos parciais de D+1 matinal]
    end

    subgraph Reconciliador [Motor Rede x OFX - reconciliadorRedeOfx.ts]
        R1[Verifica se a venda de D já consta liquidada no extrato]
        R2{Já entrou no extrato?}
        R2 -->|Sim| R3[Status: ENTROU / LIQUIDADO | nao_entrou = 0]
        R2 -->|Não| R4[Status: A COMPENSAR | nao_entrou = valorLiquido]
    end

    subgraph Display [Visão por Filial - StoreCardModulo1.tsx]
        D1[SALDO BANCO: Saldo do Fechamento]
        D2[REDE: Total de Vendas]
        D3[Badge A COMPENSAR: Apenas vendas pendentes]
        D4[Saldo Projetado D+1: Saldo Fechamento + Vendas A Compensar]
    end

    OFX --> Parser
    Rede --> Reconciliador
    Parser --> Display
    Reconciliador --> Display
```

---

## 2. Cenários de Negócio e Casos Reais

### 2.1 Cenário 1: Mauá (MHE)
- **Fechamento do dia 21/09:**
  - Saldo final da conta em 21/09: `-R$ 13.956,84`.
  - Vendas da Rede em 21/09: `R$ 4.671,32` (Débito: R$ 992,20 + Crédito: R$ 3.679,12, ambos com prazo 1 d.u.).
  - Como nenhuma venda de 21 caiu em 21: A Compensar = `+R$ 4.671,32`.
  - **Saldo Projetado no Dia 22/09:** `-13.956,84 + 4.671,32 = -R$ 9.285,52` (Exatamente o extrato impresso em papel às 09:13:25 de 22/09: **~ -9k**).
- **Se a consulta for realizada com o extrato de 22/09:**
  - O extrato de 22/09 já possui os créditos de R$ 992,20 e R$ 3.679,12.
  - O reconciliador marca ambos como `ENTROU`.
  - A Compensar = `R$ 0,00`.
  - Saldo do banco = `-R$ 9.285,52` sem qualquer soma duplicada.

### 2.2 Cenário 2: Jorge Beretta (DHJV)
- **Fechamento do dia 21/09:**
  - Saldo final da conta em 21/09: `R$ 47.724,94`.
  - Vendas da Rede em 21/09: `R$ 382,00` (Débito Mastercard, prazo 1 d.u.).
  - A Compensar = `+R$ 382,00`.
  - **Saldo Projetado no Dia 22/09:** `47.724,94 + 382,00 + 4,08 (rend.) = R$ 48.111,02` (Exatamente o extrato impresso em papel às 09:18:19 de 22/09).
- **Se a consulta for realizada com o extrato de 22/09:**
  - O crédito de R$ 382,00 já consta no extrato de 22/09.
  - O reconciliador marca como `ENTROU`.
  - A Compensar = `R$ 0,00`.
  - Saldo do banco = `R$ 48.111,02`, sem duplicar os R$ 382,00.

---

## 3. Calibração dos Motores Existentes

1. **`src/lib/parsers/ofxParser.ts`:**
   - Capturar a linha `<MEMO>SALDO TOTAL DISPONÍVEL DIA</MEMO>` como saldo contábil da data do extrato, evitando pegar o saldo matinal do dia seguinte.
2. **`src/components/importacoes/CentralImportWizard.tsx`:**
   - Remover as linhas 2305-2310 que forçavam `update({ settlement_status: 'a_compensar' })` em todas as transações, preservando os matches efetuados pelo reconciliador.
3. **`src/lib/matchers/reconciliadorRedeOfx.ts`:**
   - Garantir que o casamento entre lotes de vendas e créditos bancários identifique se a liquidação já ocorreu no banco.
4. **`src/hooks/useBackendConciliacao.ts` & `StoreCardModulo1.tsx`:**
   - Não forçar `finalNaoEntrou = redeLiq` quando a transação já está liquidada no banco.
   - Apresentar com clareza o saldo em conta e apenas o acréscimo de vendas realmente pendentes.
5. **`auto_match_saidas` RPC:**
   - Adicionar cláusula anti-colisão semântica na Camada 4 (exigir correspondência de tokens entre favorecido e memo).

---

## 4. Critérios de Aceitação Verificáveis

1. **Critério 1 (Mauá):** O saldo de Mauá confrontado contra a Rede bate exatamente com o extrato impresso (`-R$ 9.285,52`), sem a duplicidade de R$ 992,20 que gerava `-R$ 8.293,32`.
2. **Critério 2 (Jorge Beretta):** O saldo de Jorge Beretta não duplica os R$ 382,00 e fecha em `R$ 48.111,02`.
3. **Critério 3 (Preservação de Matches de Rede):** O Wizard de Importação não sobrescreve os matches legítimos de Rede para `a_compensar`.
4. **Critério 4 (Terminal Gate):** `npm run build` executa sem erros de compilação ou TypeScript.
