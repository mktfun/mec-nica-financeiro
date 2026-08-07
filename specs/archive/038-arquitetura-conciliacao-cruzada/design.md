# Spec 038 - Diagramas e Mapa Mental da Conciliação

## Mapa Mental da Importação (Mind Map)

```mermaid
mindmap
  root((SISTEMA FINANCEIRO))
    Pátio OS
      Aumenta o Saldo
      Registra Receita Bruta
      Inclui Juros cobrados do Cliente
      Identificador de IDempotência: Número da OS
    Juros Rede
      Diminui o Saldo
      Registra Despesa (Taxa Adquirente)
      Identificador: Data e Categoria
    Despesas Gerais
      Diminui o Saldo
      Contas de Água Luz Peças etc
    Extrato OFX
      Fonte da Verdade Líquida
      Registra transações OFX
      Não soma com o Sistema
      Serve apenas como Alvo para comparar
    Maquininha
      Não altera o Saldo do Sistema
      Gera aba de Recebíveis
      Usado para espelhar taxas e datas de liquidação
```

## Fluxograma de Cruzamento de Dados (Flowchart)

```mermaid
graph TD
    %% Entradas Brutas
    A[Planilha Pátio/OS] -->|Lê Valor OS + Juros Pagos| T_IN[Transações IN]
    
    %% Despesas e Taxas
    B[Planilha Despesas] -->|Gera Saídas Reais| T_OUT[Transações OUT]
    C[Planilha Juros Rede] -->|Lê Taxas Descontadas da Máquina| T_OUT
    
    %% O Sistema Consolida
    T_IN -->|Soma Entradas Brutas| SYS[SALDO DO SISTEMA]
    T_OUT -->|Subtrai Custos e Taxas| SYS
    
    %% Fonte Externa
    D[Extrato Bancário OFX] -->|Grava OFX| T_OFX[Transações OFX]
    T_OFX -->|Soma OFX| BANK[EXTRATO BANCÁRIO NET]
    
    %% Validação e Conciliação
    SYS --> CONCILIACAO{Divergência?}
    BANK --> CONCILIACAO
    
    CONCILIACAO -->|Sistema == Banco| OK((Conciliado! R$ 0,00))
    CONCILIACAO -->|Sistema != Banco| ERRO((Alerta Divergência!))
    
    %% Maquininha Paralela
    E[Planilha Maquininha] -->|Gera Previsões| REC[Tabela Recebíveis]
    REC -.->|Apoio visual| CONCILIACAO
    
    classDef sys fill:#1F2937,stroke:#32D7AB,stroke-width:2px,color:#fff
    classDef bank fill:#1F2937,stroke:#3B82F6,stroke-width:2px,color:#fff
    classDef ok fill:#064E3B,stroke:#10B981,stroke-width:2px,color:#fff
    
    class SYS sys
    class BANK bank
    class OK ok
```

## Relatório de Arquitetura por Lojas e Global
**Visão Global:**
O sistema age como um DRE dinâmico. O dinheiro não nasce mágico no banco. O banco (OFX) é passivo. A Inteligência (Sistema) é proativa. Quando você importa as 4 planilhas, o sistema constrói a história: "A Loja Matriz fez um serviço (OS), a maquininha cobrou X (Juros Rede) e o fornecedor cobrou Y (Despesas). O restante DEVE cair no banco".

**Visão Por Loja:**
Cada transação e OS ganha uma tag (um "carimbo") com o `store_id` (via Mapeamento Inteligente nos Wizards). A tela de **Conciliação** separa esses carimbos.
1. O robô soma as Entradas carimbadas daquela loja.
2. Subtrai as Taxas/Despesas carimbadas daquela loja.
3. Exibe o resultado como o **Saldo Atual no Sistema**.
4. Depois, soma o Extrato OFX carimbado daquela loja e exibe o lado **Bancário**.
Se a loja operou perfeitamente, o lucro exato cai na conta. Se o OFX tiver R$ 50 a mais ou a menos, o sistema trava o card da loja em vermelho, apontando exatamente onde o dinheiro sumiu.
