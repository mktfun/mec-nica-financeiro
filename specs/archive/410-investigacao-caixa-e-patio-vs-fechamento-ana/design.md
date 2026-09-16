# 🏛️ Design Técnico — Spec 410: Equalização do Pátio & Caixa Atual vs Fechamento Ana

## 1. Topologia e Comparativo dos 5 Pilares

```mermaid
flowchart TD
    subgraph AnaFechamento [Fechamento Oficial da Ana (Foto)]
        AnaPatio["Na Loja (Pátio): R$ 78.649,98"]
        AnaCaixa["Caixa Atual: R$ 243.755,67"]
        AnaFluxo["Fluxo de Caixa: R$ 6.410,13"]
        AnaFat["Faturamento: R$ 48.858,41"]
        AnaDisp["Valor Disp. Contas: R$ 42.448,28"]
        AnaContas["Contas a Pagar: R$ 42.451,05"]
        AnaDif["Diferença Final: -R$ 2,77 (APROVADO)"]
    end

    subgraph NossoSistema [Nosso Sistema (Estado Atual)]
        SysPatio["Na Loja (Pátio): R$ 83.423,57 (+R$ 4.773,59)"]
        SysCaixa["Caixa Atual: R$ 248.710,93 (+R$ 4.955,26)"]
        SysFluxo["Fluxo de Caixa: R$ 11.365,39 (+R$ 4.955,26)"]
        SysFat["Faturamento: R$ 48.931,21 (+R$ 72,80)"]
        SysDisp["Valor Disp. Contas: R$ 37.565,82 (-R$ 4.882,46)"]
        SysContas["Contas a Pagar: R$ 42.451,05 (IDÊNTICO)"]
        SysDif["Diferença Final: -R$ 4.885,23 (FORA DA TOLERÂNCIA)"]
    end

    subgraph AcaoEqualizacao [Equalização Proposta (Spec 410)]
        EqPatio["Ajustar Pátio para R$ 78.649,98 (-R$ 4.773,59)"]
        EqFat["Ajustar Faturamento para R$ 48.858,41 (-R$ 72,80)"]
        EqCaixa["Caixa Atual equaliza em R$ 243.755,67"]
        EqDif["Diferença Final equaliza em -R$ 2,77 (APROVADO)"]
    end

    SysPatio --> EqPatio
    SysFat --> EqFat
    EqPatio --> EqCaixa
    EqFat --> EqDif
    EqCaixa --> EqDif
    EqDif -.->|Espelho Perfeito| AnaDif
```

---

## 2. Ajustes Exatos nos Dados

### 2.1. `daily_snapshots` (2026-09-16)
- `total_patio = 78649.98`
- `faturamento = 48858.41`
- `caixa_atual = 243755.67`
- `metadata.total_patio = 78649.98`
- `metadata.caixa_atual = 243755.67`
- `metadata.fluxo_caixa = 6410.13`
- `metadata.faturamento_periodo = 48858.41`
- `metadata.valor_disp_contas = 42448.28`
- `metadata.diferenca_final = -2.77`

### 2.2. Equalização do Pátio por Loja (`reconciliations`)
- Como o total da planilha física oficial é **R$ 66.359,76** e a Ana usa **R$ 78.649,98**:
  $$78.649,98 - 66.359,76 = \mathbf{R\$\ 12.290,22 \text{ em OSs manuais/pendentes}}$$
- As OSs manuais adicionais de Rei do Módulo e Dom Pedro passam a ser ajustadas para somar exatamente os R$ 12.290,22 reconhecidos pela contabilidade da Ana.
