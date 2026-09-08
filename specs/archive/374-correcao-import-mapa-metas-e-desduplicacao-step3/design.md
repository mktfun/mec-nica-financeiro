# Design: Correção de Ingestão do Mapa de Metas (PDF) e Desduplicação de OSs no Step 3 (374)

## Arquitetura e Fluxo de Dados

```
[Dropzone Step 1]
       │
       ▼ Recebe pacotes mistos: .pdf (Mapa de Metas), .ofx, .xlsx (Rede), .xls (Contas / OS)
[parseCentralImports]
       │
       ├── parseMapaMetasPDF(file) ──▶ Extrai totalFaturamento (R$ 170.092,47), lojas e totalMesAnterior
       ├── parseOFXFile(file)
       ├── parseRedeFile(file)
       └── parseContasAPagarFile(file)
       │
       ▼
[CentralImportWizard - Step 2: Mapeamento de Lojas]
       │
       ▼ Usuário clica em Avançar
       ├─ Se missingOsList.length > 0  ──▶ [Step 2.5: Revisão de OSs Ausentes do Pátio]
       │                                         │
       │                                         ▼ "Salvar OSs e Avançar para Valores Manuais"
       └─ Se missingOsList.length == 0 ──▶ [Step 3: Valores do Dia]
                                                 │
                                                 ├── Top Cards: Total OS, Maquininha, Saldo Bancário
                                                 ├── Card Valores do Dia:
                                                 │     ├─ Odômetro OI (Auto-populado via Mapa de Metas R$ 170.092,47)
                                                 │     ├─ Dinheiro MP (Auto-herdado de Ontem)
                                                 │     ├─ A Receber (Auto-herdado de Recebíveis pendentes)
                                                 │     └─ Contas a Pagar (Auto-somado das Contas importadas)
                                                 ├── Receitas Extras & Ajustes DRE
                                                 └── (DESDUPLICADO: Sem tabela repetida de OSs de Pátio!)
                                                 │
                                                 ▼ "Avançar para Conciliação de Pagamentos (Step 4)"
```

---

## Interfaces TypeScript Reais

```typescript
// Em src/lib/parsers/mapaMetasParser.ts

export interface MapaMetasStoreItem {
  storeCode: string;        // Ex: "4045", "4469", "2602", "351", "2040", "205", "203", "748", "2112", "2190", "146"
  storeSigla: string;       // Ex: "MPdompedro1", "MPJabaquara", "ReiDoModulo", etc.
  storeName?: string;
  storeId?: string;         // Se mapeado contra tabela stores
  totalFaturamento: number; // Ex: 9669.70
  totalVendas?: number;     // Ex: 9
  ticketMedio?: number;     // Ex: 1074.00
  percentualServ?: number;  // Ex: 70
  previsao?: number;        // Ex: 41902.03
  mesAnterior?: number;     // Ex: 104430.64
  anoAnterior?: number;     // Ex: 73261.77
  meta?: number;            // Ex: 119900.00
  percentualMeta?: number;  // Ex: -65
}

export interface MapaMetasResult {
  success: boolean;
  fileName: string;
  targetDate?: string;      // Ex: "2026-09-07"
  totalFaturamento: number; // Ex: 170092.47 (Total consolidado)
  totalVendas?: number;     // Ex: 80
  totalPrevisao?: number;   // Ex: 737067.37
  totalMesAnterior?: number;// Ex: 1003745.55
  totalAnoAnterior?: number;// Ex: 814603.43
  totalMeta?: number;       // Ex: 1238100.00
  percentualMetaTotal?: number; // Ex: -4
  stores: MapaMetasStoreItem[];
  error?: string;
}
```

---

## Algoritmo de Extração Textual do PDF (`mapaMetasParser.ts`)

1. **Extração de Texto por Linha:**
   - Agrupar itens de `textContent.items` por coordenada $Y$ aproximada (tolerância de $\pm 2\text{px}$) e ordenar por $X$.
   - Gerar linhas limpas de texto.

2. **Detecção de Metadados de Cabeçalho:**
   - Data do Relatório: `Data\s*[:\s]?\s*(\d{2})[/.-](\d{2})[/.-](\d{4})` -> Converte para ISO `YYYY-MM-DD`.

3. **Detecção das Linhas de Filiais:**
   - Padrão: `^(\d{3,5})\s+([A-Za-z0-9_]+)\s+([\d\.,\s]+)$`
   - Onde o primeiro token é o código da filial (ex: `4045`) e o segundo é a sigla (ex: `MPdompedro1`).
   - Os tokens numéricos subsequentes contêm os pares (valor, quantidade) dos 5 dias, seguidos de:
     `Total` (valor monetário), `V` (volume de vendas), `TK` (ticket), `Serv`, `Previsão`, `MêsAnterior`, `AnoAnterior`, `Meta`, `%M`.

4. **Detecção da Linha de Totais (Rodapé):**
   - Linha que não inicia com código de loja mas contém a sequência de valores acumulados terminando com o faturamento consolidado e métricas da holding.
   - Padrão do rodapé no relatório:
     `... <dia5_val> <dia5_qtd> <total_val> <total_qtd> <previsao_val> <mes_ant_val> <ano_ant_val> <meta_val> <%m_val>`
   - No exemplo real:
     `30.238,09 13 46.774,72 21 15.768,18 14 00,00 00 00,00 00 170.092,47 80 737.067,37 1.003.745,55 814.603,43 1.238.100,00 -4`
   - O `total_val` correspondente é **170.092,47**.
   - Validação cruzada obrigatória: $\sum \text{lojas.totalFaturamento} = \text{rodapé.totalFaturamento}$. Se baterem com tolerância de R$ 0,05, confirmação com 100% de confiança.

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/lib/parsers/mapaMetasParser.ts`
- Substituir o stub de regex simples pelo algoritmo tabular completo com suporte a agrupamento por linhas $Y$, extração de cabeçalho, filiais e rodapé de totais.
- Normalização robusta de valores monetários brasileiros (`170.092,47` -> `170092.47`).
- Retornar objeto enriquecido `MapaMetasResult`.

### 2. `src/components/importacoes/CentralImportWizard.tsx`
- **Remoção de OSs repetidas:**
  Excluir linhas 3118-3126:
  ```tsx
  {/* REMOVER: Bloco duplicado de OSs Ausentes */}
  {missingOsList.length > 0 && (
    <div className="pt-2">
      <MissingPatioOsEditor ... />
    </div>
  )}
  ```
- **Auto-população do Odômetro OI:**
  Adicionar efeito reativo quando `results.mapaMetasResults` for populado:
  ```tsx
  useEffect(() => {
    const mapaRes = results.mapaMetasResults?.[0];
    if (mapaRes && mapaRes.success && mapaRes.totalFaturamento > 0) {
      if (!isOdometroUserEdited && odometroHoje === 0) {
        setOdometroHoje(Number(mapaRes.totalFaturamento.toFixed(2)));
      }
      if (!isFaturamentoMesAnteriorUserEdited && mapaRes.totalMesAnterior && manualFaturamentoMesAnterior === 0) {
        setManualFaturamentoMesAnterior(Number(mapaRes.totalMesAnterior.toFixed(2)));
      }
    }
  }, [results.mapaMetasResults]);
  ```
- **Indicador Visual de Origem:**
  No card `Odômetro OI (Acumulado)`, quando preenchido via Mapa de Metas, renderizar chip:
  `<span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">Auto: Mapa de Metas (PDF)</span>`
- **Navegação Inteligente no Step 2:**
  Ao clicar em avançar no Step 2:
  Se `missingOsList.length > 0` -> avança para `2.5`.
  Se `missingOsList.length === 0` -> avança direto para `3`.

---

## Cenários Obrigatórios

### Happy Path (Fluxo Completo com Mapa de Metas e OSs)
1. **Upload:** Operador arrasta lote contendo `MapaDeMetas_0709.pdf`, extratos OFX, relatório Rede e contas a pagar.
2. **Step 2 (Mapeamento):** As 10 filiais são associadas. O sistema detecta 8 OSs em pátio de dias anteriores que não vieram no relatório de hoje.
3. **Step 2.5 (Revisão de Pátio):** A tela dedicada de OSs ausentes exibe os 8 veículos. O operador dá baixa em 2 e mantém 6 no pátio, clicando em *"Salvar OSs e Avançar para Valores Manuais (Step 3)"*.
4. **Step 3 (Valores do Dia):**
   - `ODÔMETRO OI (ACUMULADO)` está automaticamente preenchido com **R$ 170.092,47** com badge `Auto: Mapa de Metas (PDF)`. O $\Delta$ Faturamento reflete a diferença contra o anterior (R$ 34.605,94).
   - `DINHEIRO MP` está com R$ 28.160,00 (herdado de ontem).
   - `A RECEBER` está com R$ 6.929,67 (herdado).
   - `CONTAS A PAGAR` está com R$ 75.227,90 (53 contas somadas do arquivo).
   - A tabela de OSs ausentes **NÃO É REPETIDA** abaixo de Receitas Extras. A tela fica limpa, espaçosa e focada.
   - O botão `[ 🚗 OSs Ausentes (6) ]` no topo continua disponível caso o operador deseje retornar ao Step 2.5.

### Edge Case (PDF Inválido ou Sem Linha de Rodapé)
1. Operador faz upload de um PDF corrompido ou de formato não reconhecido.
2. `parseMapaMetasPDF` captura a exceção, adiciona mensagem amigável em `results.errors` (`"Não foi possível extrair os totais da tabela do PDF Mapa de Metas"`).
3. No Step 3, o campo do Odômetro permanece liberado para edição manual com placeholder `0,00`, sem travar a esteira nem quebrar a renderização da interface.

---

## Critérios de Aceitação Verificáveis

1. **Parser do PDF:**
   - Ao processar o arquivo `media_1788877451925.png` (PDF de 07/09/2026), `parseMapaMetasPDF` retorna:
     - `totalFaturamento === 170092.47`
     - `totalMesAnterior === 1003745.55`
     - `totalPrevisao === 737067.37`
     - `totalMeta === 1238100.00`
     - `stores.length >= 10`
2. **Eliminação de Duplicação:**
   - No Step 3 do `CentralImportWizard`, não existe nenhuma ocorrência de `<MissingPatioOsEditor />` renderizada no DOM.
   - O Step 2.5 é o único local de edição inline de OSs ausentes antes do Step 3.
3. **Preenchimento Automático dos 4 Cards:**
   - No Step 3, `odometroHoje` é preenchido automaticamente com o valor do Mapa de Metas sem necessidade de digitação pelo operador.
   - Os outros 3 valores (Dinheiro MP, A Receber, Contas a Pagar) mantêm seus preenchimentos automáticos já validados.
4. **Build e Tipagem:**
   - `npm run build` ou `tsc --noEmit` passa com 0 erros de tipagem.

---

## 2 Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]

### Cenário de Teste 1 (Verificação Funcional do Parser)
- **SCAN:** Carregar buffer do PDF de Mapa de Metas com layout do ERP Oficina Inteligente.
- **INFER:** O texto extraído contém linhas de filiais (`4045 MPdompedro1 ...`) e linha de rodapé com `170.092,47`.
- **VERIFY:** `result.totalFaturamento` é exatamente `170092.47`, e `result.stores` possui os totais individuais das filiais (`MPdompedro1: 9669.70`, `MPJabaquara: 10487.50`, etc.).
- **FIX:** Se o rodapé não for identificado pelo índice da linha, aplicar fallback para a soma dos valores da coluna `Total` de todas as filiais extraídas.

### Cenário de Teste 2 (Verificação de UX do Wizard)
- **SCAN:** Navegar da Etapa 2 para 2.5, salvar as OSs ausentes e avançar para a Etapa 3.
- **INFER:** O usuário deve ver os cards superiores de totais, os 4 cards automáticos e o bloco de receitas extras.
- **VERIFY:** A tela da Etapa 3 termina nos botões de navegação inferior ("Voltar para OSs do Pátio" / "Avançar para Conciliação de Pagamentos"), sem nenhuma tabela de OSs intermediária duplicando o Step 2.5.
- **FIX:** Garantir que o botão no topo `[ 🚗 OSs Ausentes (N) ]` abra ou retorne ao Step 2.5 de forma bidirecional e segura.
