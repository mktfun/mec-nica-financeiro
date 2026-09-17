# 📐 Arquitetura & Design — Spec 418: Sandbox de Testes e Refatoração do Algoritmo de Match de PIX/OS

## 1. Arquitetura de Fluxo de Dados (100% In-Memory Sandbox)

```
[MOCK DATA: mockDataConciliacao.ts]
      │
      ├── 10 Transações OFX (PIX / Transferências)
      └── 10 Ordens de Serviço (OSs com cliente, valor, parsed_pix)
               │
               ▼
   [Componente Sandbox: /teste/import]
   - Seleção de Data Alvo & Tolerâncias
   - Visualizador & Editor de Payload
               │
               ▼ (Botão "Rodar Conciliação Sandbox")
   [Função Pura: matchTransactionsV2]
               │
               ├── STEP 1: Hard Match (Valor + Janela de Data)
               │     ├── Sem candidato válido ──> Registra Órfão (e Falso Positivo Evitado se nome for similar)
               │     ├── Exatamente 1 candidato ──> Match Confirmado (exact_value_unique_period)
               │     └── Múltiplos candidatos (>1) ──> Encaminha para o STEP 2
               │
               └── STEP 2: Tie-Breaker (Similaridade de String Decisiva)
                     ├── Similaridade limpa > 0.60 ──> Match Confirmado (exact_value_tie_broken_by_name)
                     └── Similaridade inconclusiva ──> Permanece Órfão (Evita chute/falso positivo)
               │
               ▼
   [UI Renderizadora em /teste/import]
   - KPI Cards: Confirmados, Falsos Positivos Evitados, Órfãos OFX/OS
   - Painéis Expansíveis com Justificativas Auditáveis
   - Blocos <pre> com JSON de Saída e Botão Copiar
```

---

## 2. Heurística de Funil Detalhada

### Step 1: Hard Match Numérico e Temporal
- **Validação de Valor:**
  ```typescript
  const deltaPix = Math.abs(ofxAmount - Number(os.parsed_pix_transfer || 0));
  const deltaTotal = Math.abs(ofxAmount - Number(os.total_value || 0));
  const deltaPaid = Math.abs(ofxAmount - Number(os.paid_value || 0));
  const valueMatched = Math.min(deltaPix, deltaTotal, deltaPaid) <= valueToleranceCents;
  ```
- **Validação de Data:**
  - Janela máxima de tolerância (padrão: $\pm 1$ dia da data alvo ou da ocorrência do PIX).
- **Proteção Anti-Sobrenome Comum:**
  - Se `valueMatched === false`, o algoritmo **JAMAIS** permite o pareamento, mesmo que o nome seja 100% idêntico. Se o nome for idêntico ou similar, adiciona o evento a `falsos_positivos_evitados` com a mensagem:
    `"Similaridade de nome encontrada ('<NOME>'), mas rejeitado por divergência de valor (PIX: R$ <X> vs OS: R$ <Y>)"`.

### Step 2: Tie-Breaker por Similaridade Textual Decisiva
- **Higienização de Memo:**
  - Remove prefixes: `PIX QRS`, `PIX ENVIADO`, `PIX RECEBIDO`, `TRANSF`, `TED`, `DOC`.
  - Remove CPFs e CNPJs mascarados ou brutos.
- **Normalização & Stopwords:**
  - Remove acentos e caracteres especiais.
  - Elimina stopwords empresariais e bancárias.
  - Penaliza sobrenomes genéricos isolados ("SILVA", "SOUZA", "SANTOS") exigindo correspondência de primeiro nome ou similaridade composta $\ge 0.65$.
- **Cálculo de Distância Levenshtein Normalizada:**
  ```typescript
  similarity = 1 - (levenshteinDistance(str1, str2) / Math.max(str1.length, str2.length));
  ```

---

## 3. Interfaces TypeScript Reais

```typescript
export interface OfxTransaction {
  storeName: string;
  amount: number;
  type: 'in' | 'out';
  date: string;
  title: string;
  fitid?: string;
  cnpj_cpf?: string;
  counterpart_name?: string;
}

export interface ParsedOS {
  os_number: string;
  plate: string;
  client_name?: string | null;
  opened_at: string;
  closed_at: string | null;
  total_value: number;
  paid_value: number;
  payment_method: string | null;
  status: 'em_aberto' | 'pago_parcial' | 'finalizado';
  parsed_pix_transfer?: number;
  parsed_credit?: number;
  parsed_debit?: number;
  parsed_cash?: number;
}

export interface MatchV2Confirmed {
  ofx: OfxTransaction;
  os: ParsedOS;
  matchedAmount: number;
  matchReason: 'exact_value_unique_period' | 'exact_value_tie_broken_by_name';
  similarityScore?: number;
  extractedClientName?: string;
  extractedOfxName?: string;
}

export interface FalsePositiveAvoided {
  ofx: OfxTransaction;
  rejectedOs: ParsedOS;
  reason: 'name_matched_but_value_mismatched' | 'name_matched_but_date_out_of_window' | 'tie_breaker_rejected';
  details: string;
}

export interface MatchTransactionsV2Result {
  matches_confirmados: MatchV2Confirmed[];
  falsos_positivos_evitados: FalsePositiveAvoided[];
  orphans: {
    unmatchedOfx: OfxTransaction[];
    unmatchedOs: ParsedOS[];
  };
  stats: {
    totalOfx: number;
    totalOs: number;
    confirmedMatchesCount: number;
    avoidedFalsePositivesCount: number;
    orphanOfxCount: number;
    orphanOsCount: number;
    totalMatchedAmount: number;
  };
}
```

---

## 4. Padrões de Design System (Dark UI Zinc-950)

Seguindo estritamente as diretrizes do `DESIGN.md`:
- **Canvas:** `bg-background text-foreground min-h-screen`
- **Cards e Painéis:** `bg-card border border-border/50 rounded-xl p-6 shadow-sm`
- **Badges de Status:**
  - Sucesso/Match: `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
  - Falso Positivo Evitado: `bg-amber-500/10 text-amber-400 border border-amber-500/20`
  - Órfão: `bg-muted text-muted-foreground border border-border/40`
- **Blocos de Código/JSON:**
  - `bg-secondary/40 border border-border/50 rounded-lg p-4 font-mono text-xs text-foreground overflow-x-auto max-h-[400px]`
- **Zero cores arbitrárias:** Proibido hexadecimais soltos e `bg-black`.

---

## 5. Cenários Obrigatórios

### Happy Path:
- O usuário acessa `/teste/import`. Os mocks de 10 OFXs e 10 OSs são carregados em memória.
- O usuário clica em "Rodar Conciliação Sandbox".
- O algoritmo processa:
  - Confirma os matches unívocos por valor e data.
  - Desempata colisões legítimas de mesmo valor (ex: duas OSs de R$ 350,00) cruzando com "CARLOS SILVA" vs "MARCOS SOUZA".
  - Exibe no painel os matches confirmados com badges verdes e os dados consolidados.

### Edge Case:
- **Colisão de Sobrenome Frequente com Discrepância de Valor:**
  - Transação bancária: PIX de R$ 50,00 com memo "PIX QRS MARIA SILVA".
  - Pátio: OS de R$ 1.500,00 do cliente "CARLOS SILVA".
  - O algoritmo barra no Step 1 (diferença de R$ 1.450,00).
  - O evento é registrado em `falsos_positivos_evitados`, provando a imunidade do novo algoritmo.

---

## 6. Critérios de Aceitação Verificáveis

1. Rota `/teste/import` funcional e reativa sem nenhum erro de runtime.
2. Zero chamadas para o Supabase inspecionadas no código da sandbox.
3. Testes unitários/in-memory comprovam que nenhum match é gerado se o valor divergirem além de R$ 0,05.
4. Terminal Gate `npm run build` passa com exit code 0.
