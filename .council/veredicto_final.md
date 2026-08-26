# Round 3 — Synthesis: Veredicto Final e Síntese Deliberativa

**Órgão Deliberativo:** Council Debate (Conselho de Arquitetura, Engenharia, Análise e Contraponto)  
**Agente Moderador:** Synthesizer (O Moderador Mestre)  
**Tópico Deliberado:** Conciliação de Contas com Saldo de Abertura Negativo (Cheque Especial / Limite Rotativo) vs. Movimentação Operacional Líquida do Dia (Caso Canônico: Filial Dom Pedro com abertura em -R$ 7.411,17 e créditos de +R$ 7.615,74).  
**Documento Gerado:** `veredicto_final.md`  

---

## Sumário Executivo do Conselho

O Conselho Deliberativo analisou a tensão entre a **realidade contábil-patrimonial do banco** (saldo negativo de cheque especial) e a **percepção de valor do operador da oficina** (faturamento e créditos gerados no dia). 

Ao longo dos Rounds 1 e 2, foram confrontadas teses de integridade de dados (**Analyst**), arquitetura corporativa e persistência (**Architect**), viabilidade pragmática de entrega (**Engineer**) e os choques de realidade do chão de oficina (**Contrarian**).

A síntese estabelece uma diretriz unificada e à prova de falhas: **o sistema nunca deve maquiar o saldo bancário**, mas deve prover uma **decomposição tripartite transparente** na interface, associada a **auto-categorização de encargos bancários noturnos** no parser OFX e **travas ativas de governança** no Contas a Pagar.

---

## 1. The Consensus Map (O Mapa de Consenso)

Os quatro agentes convergiram e firmaram consenso absoluto nos seguintes pilares:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MAPA DE CONSENSO DO CONSELHO                                 │
├──────────────────────────┬──────────────────────────────────────────────────────────────────────┤
│ 1. Invariante Contábil   │ Δ_conciliação ≡ R$ 0,00 em todas as lojas. O saldo do sistema deve   │
│    Intransponível        │ ser idêntico ao saldo real contábil do extrato bancário (OFX).       │
├──────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ 2. Decomposição          │ A UI deve separar: (1) Créditos Compensados no Dia, (2) Amortização  │
│    Tripartite na UX      │ Compulsória de Limite e (3) Saldo Contábil Real com Caixa Livre.     │
├──────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ 3. Auto-Categorização    │ IOF, juros e encargos noturnos de cheque especial devem ser          │
│    de Encargos (Regex)   │ classificados automaticamente como despesas financeiras no extrato.  │
├──────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ 4. Desacoplamento        │ A conciliação diária do Módulo 1 cruza liquidações efetivas do OFX,  │
│    Temporal de Float     │ e não faturamento bruto futuro de cartão (D+1/D+30).                 │
├──────────────────────────┼──────────────────────────────────────────────────────────────────────┤
│ 5. Isolamento            │ Cada filial tem seu próprio livro contábil. Não há compensação       │
│    Multiloja Estrito     │ artificial de contas positivas com negativas na visualização de loja.│
└──────────────────────────┴──────────────────────────────────────────────────────────────────────┘
```

1. **Invariante Contábil Intransponível ($\Delta_{\text{conciliação}} \equiv 0,00$):**  
   Nenhum agente aceita a criação de saldos virtuais, saldos fictícios ou ajustes manuais para "agradar" o operador. A equação de conciliação bancária é inviolável:
   $$S_{\text{final}} = S_{\text{inicial}} + \sum \text{Créditos Compensados} - \sum \text{Débitos Reais}$$
2. **Apresentação Tripartite na Interface do Usuário:**  
   O operador não deve ser confrontado com um extrato cru e estéril nem com um saldo maquiado. A experiência de fechamento diário é estruturada em três blocos interdependentes:
   - **Bloco 1 (Desempenho Operacional):** Quanto a loja gerou em recebimentos compensados hoje (ex: `+R$ 7.615,74`).
   - **Bloco 2 (Destinação / Amortização de Passivo):** Quanto desses recebimentos foi compulsoriamente absorvido pelo banco para amortizar a dívida anterior (ex: `-R$ 7.411,17`).
   - **Bloco 3 (Posição Patrimonial e Liquidez Desimpedida):** O saldo real remanescente da conta corrente (ex: `+R$ 204,57`) e o valor real de **Caixa Livre Disponível para Novos Gastos**.
3. **Auto-Categorização Determinística de Encargos Bancários:**  
   Cobranças automáticas de madrugada (`IOF SDO DEV`, `JUROS S/ LIMITE`, `ENCARGOS ROTATIVO`) são interceptadas pelo parser de OFX via regex, categorizadas como despesa financeira e conciliadas no extrato sem travar o operador nem exigir Ordens de Serviço fictícias.
4. **Desacoplamento de Float e Liquidação de Adquirentes:**  
   O Módulo 1 (Fechamento Diário de Caixa) concilia **Créditos Bancários Efetivamente Compensados no Extrato de Hoje** (PIX, TED, liquidações de adquirentes D-1/D-30). Recebíveis futuros de cartão permanecem na esteira própria de Contas a Receber.
5. **Isolamento Multiloja e Consolidação Vetorial:**  
   No nível de loja individual, os saldos são isolados. Na consolidação da matriz, o Ativo Disponível ($\sum \max(0, S_i)$) é explicitamente segregado do Passivo Rotativo Tomado ($\sum \min(0, S_i)$), impedindo que lojas deficitárias fiquem ocultadas no caixa de lojas superavitárias.

---

## 2. The Hard Disagreements (Impasses Remanescentes e Riscos de Borda)

Embora tenha havido consenso sobre as diretrizes conceituais, dois pontos de atrito técnico foram identificados entre os agentes:

### Impasse 1: Persistência Explícita de Colunas Derivadas vs. Pure Functions em Memória
* **A Posição do Architect / Analyst:** Defenderam alterar `daily_snapshots` adicionando 6 colunas (`overdraft_used`, `overdraft_amortized_today`, `operational_settlements_today`, `financial_expenses_today`, `intercompany_inflow_today`, `free_cash_available`) para viabilizar relatórios de BI e auditoria de DFC em consultas SQL simples $O(1)$.
* **A Posição do Engineer / Contrarian:** Defenderam adicionar apenas `limite_cheque_especial` em `stores` e `saldo_inicial_ofx` / `saldo_final_ofx` em `reconciliations`, calculando as grandezas de amortização e caixa livre como funções puras em TypeScript no frontend (`modulo1Calculations.ts`), argumentando que persistir colunas derivadas gera risco de inconsistência em reimportações de extrato.
* **Resolução do Synthesizer:** **Adotar o Padrão Híbrido Pragmático.** 
  - Adiciona-se `limite_cheque_especial` na tabela `stores` e `saldo_inicial_ofx` / `saldo_final_ofx` em `reconciliations`.
  - No `daily_snapshots`, adiciona-se apenas a coluna `free_cash_available` e `financial_expenses_today` (que têm impacto patrimonial direto e auditoria).
  - O cálculo da cascata de amortização na tela é realizado como **propriedade derivada pura no TypeScript**, garantindo zero risco de dessincronização e facilidade de manutenção.

### Impasse 2: Hard Lock no Módulo de Contas a Pagar vs. Semáforo / Feedback Visual
* **A Posição do Contrarian / Analyst:** Exigência de trava física dura (*Hard Block*) no backend para impedir que qualquer operador autorize pagamentos caso `Free Cash Available == 0`, prevenindo o risco de insolvência e multas por cheques/boletos devolvidos (KRI-01).
* **A Posição do Engineer:** Priorização de badges visuais e semáforo educativo de UX, evitando bloqueios que pudessem gerar atrito com gerentes em situações de urgência na oficina.
* **Resolução do Synthesizer:** **Soft Lock com Override de Autorização de Matriz.** 
  - Se `Free Cash Available == 0`, a UI bloqueia a emissão padrão de novos pagamentos pela filial e exibe alerta em vermelho.
  - Para casos excepcionais (compra emergencial de peça com uso deliberado do limite rotativo restante), o sistema exige a confirmação explícita do operador registrando no log de auditoria: *"Pagamento emitido sob utilização de Cheque Especial"*, notificando o financeiro central.

---

## 3. The Pivot: What Changed (Como a Ideia Evoluiu do Round 1 para o Round 2)

A fricção dialética entre os agentes transformou fundamentalmente a proposta inicial:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 A EVOLUÇÃO DIALÉTICA DA SOLUÇÃO                                  │
├────────────────────────────────────────┬────────────────────────────────────────────────────────┤
│ PREMISSA INICIAL (INGÊNUA)             │ PREMISSA REFINADA (PÓS-DEBATE)                         │
├────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Tentar mostrar ao operador que ele     │ Mostrar a realidade completa: o faturamento gerado     │
│ "está positivo" para não desmotivar.   │ pagou a dívida do passado; o saldo livre hoje é R$ 0. │
├────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Conciliar "vendas brutas de hoje" com  │ Conciliar exclusivamente "créditos compensados no      │
│ o saldo final do extrato de hoje.      │ extrato de hoje" (PIX + Liquidações D-1/D-30).         │
├────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Tratar encargos bancários noturnos     │ Interceptar IOF/Juros no parser OFX via regex e        │
│ como pendências manuais de conciliação.│ auto-classificar como despesa financeira automática.  │
├────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Considerar qualquer crédito no extrato │ Segregar receitas de clientes de aportes/mútuos de     │
│ como faturamento da filial.            │ socorro financeiro entre lojas (Intercompany).         │
└────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

1. **Eliminação da "Anestesia Contábil":** A ideia de criar um saldo alternativo foi descartada. O operador passa a entender que sua loja produziu riqueza, mas essa riqueza foi destinada a sanar o endividamento bancário anterior.
2. **Blindagem do Descompasso Temporal:** O conceito de fechamento diário foi desacoplado de OSs abertas no dia que ainda virarão recebíveis futuros em adquirentes.
3. **Automação Completa de Lançamentos de Madrugada:** O sistema assume a responsabilidade de limpar transações de IOF/Juros sem transferir essa carga operacional ao mecânico.

---

## 4. Final Verdict: [GO]

### Veredito: **`[GO]` (Ideia Madura, Estruturada e Pronta para Construção)**

```
██████   ██████  
██       ██    ██
██   ███ ██    ██
██    ██ ██    ██
 ██████   ██████ 
```

**Justificativa do Veredito:**
- **Matemática Sólida:** A relação vetorial de fluxo de caixa ($\Delta \text{Caixa} = S_1 - S_0$) já é suportada pelo motor e não gera divergências contábeis.
- **Risco Mitigado:** A decomposição visual elimina o choque cognitivo do operador sem violar os princípios contábeis de partidas dobradas e auditoria fiscal.
- **Implementação Leve:** O plano de execução não exige reescritas de arquitetura profunda, podendo ser entregue através de ajustes cirúrgicos no schema, parser OFX e componentes de interface.

---

## 5. Recomendações Práticas e Plano de Ação para Implementação

Abaixo detalha-se o passo a passo técnico para execução imediata no projeto.

```mermaid
flowchart TD
    A[Upload do Extrato OFX] --> B[Parser OFX: Normalização de Saldo]
    B --> C{Detecta Juros / IOF via Regex?}
    C -- Sim --> D[Auto-Classifica: Despesa Financeira]
    C -- Não --> E[Categorização Padrão de Crédito/Débito]
    D --> F[Motor de Fechamento Diário: modulo1Calculations.ts]
    E --> F
    F --> G[Cálculo: Saldo Inicial + Inflows - Outflows = Saldo Final]
    F --> H[Cálculo: Amortização = min(Inflows, |S0|) se S0 < 0]
    F --> I[Cálculo: Caixa Livre = max(0, S1)]
    G --> J[Renderização UI: Card Tripartite & Semáforo de Liquidez]
    H --> J
    I --> J
    J --> K{Caixa Livre > 0?}
    K -- Não --> L[Trava de Novos Pagamentos com Aviso de Rotativo]
    K -- Sim --> M[Operação Normal de Pagamentos Liberada]
```

---

### 5.1. Camada de Banco de Dados (Supabase DDL)

Executar a seguinte migração segura no banco de dados:

```sql
-- 1. Adicionar limite de cheque especial e flags na tabela de lojas/contas
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS limite_cheque_especial NUMERIC(12,2) DEFAULT 0.00;

ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS overdraft_limit NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS allow_negative_balance BOOLEAN DEFAULT TRUE;

-- 2. Garantir persistência de saldos inicial e final na conciliação
ALTER TABLE public.reconciliations
ADD COLUMN IF NOT EXISTS saldo_inicial_banco NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS saldo_final_banco NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS despesas_financeiras_total NUMERIC(12,2) DEFAULT 0.00;

-- 3. Extensão leve da tabela de snapshots diários
ALTER TABLE public.daily_snapshots
ADD COLUMN IF NOT EXISTS free_cash_available NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS financial_expenses_today NUMERIC(12,2) DEFAULT 0.00;
```

---

### 5.2. Camada de Parser OFX e Auto-Categorização (`ofxParser.ts`)

Implementar o interceptor de encargos noturnos no fluxo de processamento de extrato:

```typescript
// Regex abrangente para interceptar encargos bancários de cheque especial e IOF
export const FINANCIAL_EXPENSE_PATTERNS = 
  /JUROS|IOF|ENCARGO|LIM.*ROT|CHEQ.*ESP|TAR.*CTA|DEB.*SDO|ADIANT.*DEPOSIT/i;

export interface NormalizedTransaction {
  id: string;
  memo: string;
  amount: number;
  date: string;
  category: 'OPERATIONAL' | 'FINANCIAL_EXPENSE' | 'INTERCOMPANY_TRANSFER';
  isAutoReconciled: boolean;
}

export function parseAndCategorizeOfxTransaction(
  memo: string, 
  amount: number, 
  isKnownInternalAccount: boolean
): NormalizedTransaction {
  if (amount < 0 && FINANCIAL_EXPENSE_PATTERNS.test(memo)) {
    return {
      id: crypto.randomUUID(),
      memo,
      amount,
      date: new Date().toISOString(),
      category: 'FINANCIAL_EXPENSE',
      isAutoReconciled: true // Fecha conciliação sem exigir OS
    };
  }

  if (isKnownInternalAccount) {
    return {
      id: crypto.randomUUID(),
      memo,
      amount,
      date: new Date().toISOString(),
      category: 'INTERCOMPANY_TRANSFER',
      isAutoReconciled: true
    };
  }

  return {
    id: crypto.randomUUID(),
    memo,
    amount,
    date: new Date().toISOString(),
    category: 'OPERATIONAL',
    isAutoReconciled: false
  };
}
```

---

### 5.3. Motor de Cálculo de Fechamento (`modulo1Calculations.ts`)

Adicionar as funções puras de decomposição de liquidez e passivo:

```typescript
export interface FechamentoDecomposicao {
  saldoInicial: number;
  creditosCompensados: number;
  debitosOperacionais: number;
  despesasFinanceiras: number;
  saldoFinalContabil: number;
  amortizacaoPassivo: number;
  caixaLivreDisponivel: number;
  limiteRestante: number;
  statusConciliacao: 'CONCILIADO' | 'DIVERGENTE';
  diferencaFinal: number;
}

export function calcularDecomposicaoFechamento(
  saldoInicial: number,
  creditosCompensados: number,
  debitosOperacionais: number,
  despesasFinanceiras: number,
  limiteChequeEspecial: number,
  saldoRealExtrato: number
): FechamentoDecomposicao {
  const saldoFinalCalculado = 
    saldoInicial + creditosCompensados - debitosOperacionais - despesasFinanceiras;
  
  const diferencaFinal = Math.abs(saldoFinalCalculado - saldoRealExtrato);
  const statusConciliacao = diferencaFinal < 0.01 ? 'CONCILIADO' : 'DIVERGENTE';

  // Se o saldo inicial era negativo, quanto foi amortizado pelas entradas
  const dividaAnterior = Math.max(0, -saldoInicial);
  const amortizacaoPassivo = Math.min(creditosCompensados, dividaAnterior);

  // Caixa livre real para novas despesas
  const caixaLivreDisponivel = Math.max(0, saldoFinalCalculado);

  // Limite de cheque especial restante
  const limiteUtilizado = Math.max(0, -saldoFinalCalculado);
  const limiteRestante = Math.max(0, limiteChequeEspecial - limiteUtilizado);

  return {
    saldoInicial,
    creditosCompensados,
    debitosOperacionais,
    despesasFinanceiras,
    saldoFinalContabil: saldoFinalCalculado,
    amortizacaoPassivo,
    caixaLivreDisponivel,
    limiteRestante,
    statusConciliacao,
    diferencaFinal
  };
}
```

---

### 5.4. Camada de UX e Componentes Visuais

Atualizar a interface de Fechamento Diário da Loja (`ResumoDiaPanel.tsx` / `StoreExtratoBancarioView.tsx`):

#### 1. Banner Superior de Liquidez e Semáforo
- Se `saldoFinal < 0`:
  - **Badge Amarelo/Laranja:** *"Operando em Limite Rotativo (Cheque Especial)"*
  - **Texto Explicativo:** *"R$ 7.411,17 do faturamento de hoje foram compulsoriamente retidos pelo banco para cobrir o saldo devedor do dia anterior."*
- Se `caixaLivreDisponivel === 0`:
  - **Alerta de Trava:** *"Caixa Livre Desimpedido: R$ 0,00 — Novos pagamentos exigirão uso de limite rotativo."*

#### 2. O Card Tripartite de Conciliação

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 📊 FECHAMENTO DIÁRIO — DOM PEDRO (ITAÚ CONTA CORRENTE)                                   │
├──────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ 1. CRÉDITOS COMPENSADOS  │ 2. AMORTIZAÇÃO DE DÍVIDA │ 3. POSIÇÃO BANCÁRIA REAL          │
│   + R$ 7.615,74          │   - R$ 7.411,17          │   + R$ 204,57                     │
│   [▲ Entradas do Dia]    │   [▼ Cobertura Limite]   │   [Saldo Real em Extrato]         │
│   • Rede: R$ 5.200,00    │   • Saldo D-1: -7.411,17 │   • Limite Contratado: R$ 15.000  │
│   • PIX:  R$ 2.415,74    │   • Cobertura: 100,00%   │   • Caixa Livre: R$ 204,57        │
├──────────────────────────┴──────────────────────────┴───────────────────────────────────┤
│ ✅ STATUS DA CONCILIAÇÃO: 100% CONCILIADO COM O EXTRATO (Diferença: R$ 0,00)            │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 3. Trava de Governança no Contas a Pagar
- No modal de agendamento/aprovação de pagamentos:
  - Validar se `valor_pagamento > (saldo_bancario_atual + limite_cheque_especial)`.
  - Se for maior, emitir **Hard Block** com mensagem de insuficiência total de fundos.
  - Se estiver dentro do limite rotativo mas com `saldo_banco <= 0`, exigir confirmação com aviso explícito de taxa de juros diária.

---

### 5.5. Matriz de Teste Canônico (Validação com os Dados de Dom Pedro)

Executar o seguinte caso de teste automatizado para validar a implementação:

```typescript
describe('Caso Canônico Dom Pedro — Fechamento com Abertura Negativa', () => {
  it('deve conciliar com precisão centesimal e calcular amortização correta', () => {
    const resultado = calcularDecomposicaoFechamento(
      -7411.17, // Saldo inicial D-1
      7615.74,  // Créditos compensados no dia (Rede + PIX)
      0.00,     // Débitos operacionais pagos
      0.00,     // Despesas financeiras
      15000.00, // Limite contratado
      204.57    // Saldo final real do extrato OFX
    );

    expect(resultado.saldoFinalContabil).toBeCloseTo(204.57, 2);
    expect(resultado.statusConciliacao).toBe('CONCILIADO');
    expect(resultado.diferencaFinal).toBeCloseTo(0.00, 2);
    expect(resultado.amortizacaoPassivo).toBeCloseTo(7411.17, 2);
    expect(resultado.caixaLivreDisponivel).toBeCloseTo(204.57, 2);
    expect(resultado.limiteRestante).toBe(15000.00);
  });
});
```

---

## 6. Conclusão Final do Synthesizer

O debate do Conselho cumpriu integralmente seu papel de lapidação técnica:
1. **O Contrarian** impediu a fraude contábil e trouxe a realidade assíncrona do chão de loja.
2. **O Analyst** garantiu a modelagem do risco de rotativo e a invariante de conciliação zero.
3. **O Architect** estruturou a segregação de camadas e a governança multiloja.
4. **O Engineer** garantiu uma execução enxuta, sem código inchado e focada no valor ao usuário.

O plano de ação consolidado acima está pronto para ser implementado, garantindo segurança patrimonial para a empresa e transparência operacional para os operadores de loja.
