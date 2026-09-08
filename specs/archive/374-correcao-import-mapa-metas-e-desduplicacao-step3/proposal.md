# Proposal: Correção de Ingestão do Mapa de Metas (PDF) e Desduplicação de OSs no Step 3 (374)

## Problema

1. **Duplicação Visual e Operacional de OSs no Step 3:**
   - Ao importar arquivos e confirmar o mapeamento das lojas (Step 2), o operador avança para a **Etapa 2.5 ("Atualização de OSs do Pátio - Ausentes no Relatório")**, onde audita os veículos carryover de dias anteriores e clica em *"Salvar OSs e Avançar para Valores Manuais (Step 3)"*.
   - No entanto, ao entrar no **Step 3 ("Valores Manuais do Dia")**, o mesmo bloco `<MissingPatioOsEditor />` ("Veículos em Serviço no Pátio (Carryover)") é **renderizado novamente** abaixo de Receitas Extras e Ajustes DRE (linhas 3118-3126 de `CentralImportWizard.tsx`).
   - Isso gera confusão e atrito: o operador acabou de salvar as OSs na etapa dedicada 2.5 e é forçado a ver a tabela inteira novamente em uma tela que deveria focar apenas na validação dos valores de fechamento diário.

2. **Mapa de Metas (PDF) Não Preenche Automaticamente e Fica Totalmente Vazio:**
   - O parser `mapaMetasParser.ts` possui um stub ingênuo que apenas busca a regex `/Faturamento\s*.*?R\$?\s*([\d\.,]+)/gi`.
   - No PDF oficial gerado pelo sistema Oficina Inteligente ("Mapa de Metas"), o termo "Faturamento" sequer existe no corpo da tabela. O cabeçalho é:
     `Emp | Sigla | <dias 1..5> | Total | V | TK | Serv | Previsão | MêsAnterior | AnoAnterior | Meta | %M`
     E o rodapé consolidador traz os totais gerais da holding:
     `30.238,09 13 | 46.774,72 21 | 15.768,18 14 | 00,00 00 | 00,00 00 | 170.092,47 80 | 737.067,37 | 1.003.745,55 | 814.603,43 | 1.238.100,00 | -4`
   - O total acumulado consolidado no período é o valor da coluna **Total** no rodapé (**R$ 170.092,47**, que é a soma dos totais individuais de todas as 11 filiais e o valor mais alto da linha de faturamentos).
   - Como o parser falhava silenciosamente e retornava `totalFaturamento: 0` com `stores: []`, a tela de importação ficava com `0,00` no Odômetro OI e vazia em qualquer detalhe do Mapa de Metas, obrigando o operador a redigitar valores que deveriam ser extraídos de forma 100% automática.

3. **Incoerência dos "Inputs Manuais" que já são Automáticos:**
   - Na tela do Step 3, os 4 cards são categorizados como "Valores Manuais", porém:
     - `Contas a Pagar` já é populado automaticamente pelo somatório do arquivo importado (`results.contasPagarResults`);
     - `Dinheiro MP` já é herdado automaticamente do fechamento do dia anterior (`previousSnapshot.dinheiro_mp`);
     - `A Receber` já é herdado automaticamente de títulos pendentes ou do snapshot anterior;
     - `Odômetro OI (Acumulado)` / `Faturamento Atual` deveria ser populado compulsoriamente a partir do PDF do Mapa de Metas importado.
   - O campo do Odômetro permanecia zerado (`0,00`) mesmo após upload do PDF, sem indicação de que o PDF foi lido nem atalho de aplicação.

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Parser Robusto e Estruturado do Mapa de Metas (`src/lib/parsers/mapaMetasParser.ts`) [MODIFY]:**
   - Implementar parser tabular determinístico para o relatório padrão do Oficina Inteligente:
     - Extrair a data do cabeçalho (`Data 07/09/2026` -> `2026-09-07`).
     - Detectar a linha de rodapé/total geral (`170.092,47 80 737.067,37 1.003.745,55 ...`) e extrair:
       - `totalFaturamento`: **R$ 170.092,47** (coluna Total consolidada da holding).
       - `totalVendas`: 80.
       - `totalPrevisao`: R$ 737.067,37.
       - `totalMesAnterior`: R$ 1.003.745,55.
       - `totalMeta`: R$ 1.238.100,00.
     - Extrair cada linha de filial:
       - Código da empresa (`4045`, `4469`, etc.).
       - Sigla da filial (`MPdompedro1`, `MPJabaquara`, `ReiDoModulo`, etc.).
       - Total acumulado da loja no mês.
       - Previsão, mês anterior e meta da loja.
     - Reconciliar a soma das lojas com o total do rodapé para garantir 100% de integridade matemática.

2. **Preenchimento e Sinalização Automática no Wizard (`src/components/importacoes/CentralImportWizard.tsx`) [MODIFY]:**
   - **Auto-preenchimento do Odômetro:** Ao processar o PDF do Mapa de Metas, se `odometroHoje === 0` (ou não editado pelo usuário), setar automaticamente `odometroHoje` para o `totalFaturamento` extraído (ex: R$ 170.092,47).
   - **Auto-preenchimento do Mês Anterior:** Se `manualFaturamentoMesAnterior === 0` e o PDF contiver `totalMesAnterior`, preencher automaticamente com R$ 1.003.745,55.
   - **Feedback Visual Claro:** No card do Odômetro OI, exibir badge informativo de fonte:
     `✨ Preenchido via Mapa de Metas (PDF): R$ 170.092,47` e indicar o $\Delta$ de faturamento calculado em tempo real em relação ao dia anterior (Ant: R$ 34.605,94 -> $\Delta$: R$ 135.486,53).
   - **Apresentação do Mapa de Metas no Upload:** Na listagem de arquivos processados no Step 1 e Step 2, exibir chip do PDF reconhecido com o faturamento extraído e número de lojas detectadas.

3. **Remoção da Duplicação de OSs no Step 3 [MODIFY]:**
   - Remover o bloco inline duplicado `<MissingPatioOsEditor />` do rodapé do Step 3 (linhas 3118-3126).
   - Preservar o botão no cabeçalho do Step 3: `[ 🚗 OSs Ausentes (N) ]` permitindo voltar ao Step 2.5 sob demanda caso o operador deseje alterar algo antes de fechar.
   - No Step 2, ao clicar em avançar:
     - Se houver OSs ausentes (`missingOsList.length > 0`): direcionar para a Etapa 2.5 dedicada.
     - Se não houver nenhuma OS ausente (`missingOsList.length === 0`): avançar direto para o Step 3, evitando uma tela 2.5 em branco e desnecessária.

---

## Contratos de Dados & Interfaces

### Contrato do Mapa de Metas (`mapaMetasParser.ts`):
```typescript
export interface MapaMetasStoreItem {
  storeCode: string;
  storeSigla: string;
  storeName?: string;
  totalFaturamento: number;
  totalVendas?: number;
  previsao?: number;
  mesAnterior?: number;
  anoAnterior?: number;
  meta?: number;
  percentualMeta?: number;
}

export interface MapaMetasResult {
  success: boolean;
  fileName: string;
  targetDate?: string;
  totalFaturamento: number; // Ex: 170092.47
  totalVendas?: number;     // Ex: 80
  totalPrevisao?: number;   // Ex: 737067.37
  totalMesAnterior?: number;// Ex: 1003745.55
  totalAnoAnterior?: number;// Ex: 814603.43
  totalMeta?: number;       // Ex: 1238100.00
  stores: MapaMetasStoreItem[];
  error?: string;
}
```

---

## Arquivos Afetados

### Arquivos Existentes Reutilizados e Modificados [MODIFY]:
1. [mapaMetasParser.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/lib/parsers/mapaMetasParser.ts): Implementação completa do parser tabular e extração de totais e filiais.
2. [CentralImportWizard.tsx](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx):
   - Auto-preenchimento de `odometroHoje` e `manualFaturamentoMesAnterior` a partir de `results.mapaMetasResults`.
   - Remoção do `<MissingPatioOsEditor />` duplicado no Step 3.
   - Pulo inteligente da etapa 2.5 quando não houver OSs ausentes.
   - Feedback visual no card de Odômetro indicando auto-preenchimento via PDF.
3. [useCentralImport.ts](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useCentralImport.ts): Tipagem atualizada para os novos campos de `MapaMetasResult`.

### Arquivos Novos [NEW]:
Nenhum. 100% de reuso e extensão do código existente.

---

## Plano de Rollback

Caso ocorra regressão durante a implementação:
1. Reverter `mapaMetasParser.ts` para o fallback básico anterior.
2. Manter a renderização condicional de `MissingPatioOsEditor` em `CentralImportWizard.tsx`.
3. Nenhum dado do banco de dados (schema/DDL) é alterado por esta spec; todas as modificações residem puramente na camada de parse e apresentação do Wizard.

---

## Risco Principal e Mitigação

- **Risco:** O layout do PDF do Mapa de Metas variar entre diferentes versões geradas pelo ERP Oficina Inteligente (ex: filtros com 3 dias em vez de 5 dias, ou ordem alfabética em vez de código).
- **Mitigação:** O parser adota busca baseada em âncoras e padrões estruturais: localiza a linha de cabeçalho (`Emp`, `Sigla`, `Total`, `Meta`), identifica linhas que começam com código numérico de loja (`\d{3,5}`) e sigla (`MP...`), e identifica a linha de totais pelos padrões numéricos de final de tabela, calculando a soma das filiais como validação cruzada. Se o total da linha de rodapé não for achado, utiliza a soma consolidada das lojas.
