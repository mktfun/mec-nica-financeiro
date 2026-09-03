# Technical Design — Spec 368: Correção OFX SGML e Mapeamento Automático

## 1. Arquitetura do Parser OFX SGML (`src/lib/parsers/ofxParser.ts`)

### 1.1 Leitura Binária e Resiliente de Encoding
Extratos bancários brasileiros vêm frequentemente em `Windows-1252` / `ISO-8859-1`:
```typescript
let text = '';
try {
  const buffer = await file.arrayBuffer();
  text = new TextDecoder('windows-1252').decode(buffer);
} catch {
  text = await file.text();
}
```

### 1.2 Extração Universal de Transações
Em SGML OFX 1.0 (Itaú):
```typescript
const stmtTrnBlocks: string[] = [];
const stmtTrnWithClose = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
let m;
while ((m = stmtTrnWithClose.exec(text)) !== null) {
  stmtTrnBlocks.push(m[1]);
}

if (stmtTrnBlocks.length === 0) {
  // SGML sem tag de fechamento: delimita pelo próximo <STMTTRN> ou fim do <BANKTRANLIST>
  const bankTranListMatch = text.match(/<BANKTRANLIST>([\s\S]*?)(?:<\/BANKTRANLIST>|<LEDGERBAL>|$)/i);
  const block = bankTranListMatch ? bankTranListMatch[1] : text;
  const parts = block.split(/<STMTTRN>/i);
  parts.shift(); // Remove preâmbulo
  parts.forEach(p => stmtTrnBlocks.push(p.trim()));
}
```

### 1.3 Normalização de Agência e Conta (Tags + Nome do Arquivo)
```typescript
let banco = 'ITAU';
let conta = '';

// Extração por tags
const acctMatch = text.match(/<ACCTID>([^\r\n<]+)/i);
if (acctMatch) {
  conta = acctMatch[1].trim().replace(/\D/g, '');
}

// Fallback por nome do arquivo (ex: Extrato_0263_811531_03-09-2026.ofx)
if (!conta || conta.length < 5) {
  const fnMatch = file.name.match(/Extrato_(\d{4})_(\d{5,8})/i);
  if (fnMatch) {
    conta = `${fnMatch[1]}${fnMatch[2]}`;
  }
}
```

---

## 2. Mapa Canônico de Mapeamento das 10 Contas

| Filial | Store ID | Agência | Conta | Chaves Canônicas |
| :--- | :--- | :--- | :--- | :--- |
| **Dom Pedro - DP** | `st-01` | 8813 | 98463-3 | `8813984633`, `8813_984633`, `984633`, `Extrato_8813_984633` |
| **Jabaquara - JAB** | `st-02` | 8813 | 98411-2 | `8813984112`, `8813_984112`, `984112`, `Extrato_8813_984112` |
| **Jorge Beretta - DHJV** | `st-03` | 3385 | 98804-7 | `3385988047`, `3385_988047`, `988047`, `Extrato_3385_988047` |
| **Kennedy - MP** | `st-04` | 7386 | 17529-8 | `7386175298`, `7386_175298`, `175298`, `Extrato_7386_175298` |
| **Piraporinha - EMPORIO** | `st-05` | 7386 | 16260-1 | `7386162601`, `7386_162601`, `162601`, `Extrato_7386_162601` |
| **Planalto - BRASICAR** | `st-06` | 7386 | 16658-6 | `7386166586`, `7386_166586`, `166586`, `Extrato_7386_166586` |
| **Rudge Ramos - CAP** | `st-07` | 0263 | 81153-1 | `0263811531`, `0263_811531`, `811531`, `Extrato_0263_811531` |
| **Santo André - HD** | `st-08` | 8813 | 99429-3 | `8813994293`, `8813_994293`, `994293`, `Extrato_8813_994293` |
| **Rei do Módulo - MP** | `st-09` | 8813 | 99267-7 | `8813992677`, `8813_992677`, `992677`, `Extrato_8813_992677` |
| **Mauá - MHE** | `3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f` | 2783 | 07082-0 | `2783070820`, `2783_070820`, `070820`, `Extrato_2783_070820` |

---

## 3. Seed SQL no PostgreSQL (`store_file_mappings`)
Migration inserindo todos os aliases listados acima via `INSERT INTO public.store_file_mappings ... ON CONFLICT DO UPDATE`.

---

## 4. Riscos e Mitigações
- **Risco:** Regressão para arquivos OFX de outros bancos que possuem fechamento `</STMTTRN>`.
  - **Mitigação:** O algoritmo prioriza o match com tag de fechamento se existir e só faz o fallback para SGML se a contagem for zero.
