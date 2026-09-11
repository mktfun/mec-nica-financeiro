# Design: Motor de Reconciliação Rede x OFX, Deduplicação e Alertas de Ingestão (398)

## Arquitetura e Fluxo de Dados

O pipeline é organizado em 4 estágios lineares, puramente em memória e sem dependências de chamadas LLM:

```
[Arquivos Recebidos via Dropzone]
              │
              ▼
1. Sanitização & Deduplicação (centralImportManager.ts)
   ├─ OFX: deduplica por conta/período. Emite Toast de aviso se duplicado.
   ├─ OS: deduplica por loja. Emite Toast de aviso se duplicado.
   ├─ Rede: filtra arquivos com totalNet <= 0 (ignora sem movimento).
   │        Deduplica arquivos da mesma loja (mantém apenas 1 e notifica).
   └─ Scanner de Cobertura: calcula lojas presentes vs faltantes nas 10 filiais ativas.
              │
              ▼
2. Motor de Reconciliação Bipartido (reconciliadorRedeOfx.ts)
   ├─ Ingestão OFX: descarta saídas (DEBIT) e rendimentos. Filtra créditos adquirente via Regex.
   ├─ Ingestão Rede: padroniza Data de Repasse Prevista (creditDate/date) e Valor Líquido.
   ├─ Algoritmo de Casamento:
   │  ├─ Estágio 1: Greedy 1:1 (Data_Banco == Data_Rede E |Valor_Banco - Valor_Rede| <= 0.01)
   │  ├─ Estágio 2: Lote por Bandeira / Estabelecimento com Tolerância MDR
   │  └─ Estágio 3: Lote Consolidado Loja (quando adquirente deposita soma integral)
   └─ Segregação nos 3 Vetores:
      ├─ [Vetor 1] Matched / Conciliados (status_match = true, fitid_banco_vinculado)
      ├─ [Vetor 2] Não Entrou / A Compensar (status_match = false na Rede)
      └─ [Vetor 3] Órfãos no Banco (status_match = false no OFX)
              │
              ▼
3. Persistência Idempotente (CentralImportWizard.tsx / useBulkInsertTransactions)
   ├─ pos_transactions: grava com settlement_status ('entrou' ou 'nao_entrou')
   └─ ofx_transactions: grava com fitid único e target_date saneada
              │
              ▼
4. Cockpit de Auditoria e Decisão (Step4FinalAuditAndClose.tsx)
   └─ Exibe sumário dos 3 vetores e semáforo contábil para aprovação.
```

---

## Interfaces TypeScript

```typescript
export interface IngestionAlerts {
  duplicatedOfx: Array<{ fileName: string; storeAlias: string; reason: string }>;
  missingOfxStores: Array<{ storeId: string; storeName: string }>;
  duplicatedOs: Array<{ fileName: string; storeAlias: string }>;
  missingOsStores: Array<{ storeId: string; storeName: string }>;
  ignoredEmptyRede: Array<{ fileName: string; storeName: string }>;
  duplicatedRede: Array<{ fileName: string; storeName: string; keptFile: string }>;
}

export interface RedeOfxMatchItem {
  saleId: string;
  nsu?: string;
  authorization?: string;
  brand?: string;
  method?: string;
  dataPrevista: string;
  valorBruto: number;
  valorLiquido: number;
  statusMatch: boolean;
  fitidBancoVinculado?: string;
  valorBancoVinculado?: number;
  diferencaCentavos?: number;
  reasoning?: string;
}

export interface OfxCreditItemClean {
  fitid: string;
  dataBanco: string;
  valorBanco: number;
  memo: string;
  statusMatch: boolean;
  vinculadoSaleId?: string;
}

export interface ReconciliadorRedeOfxOutput {
  storeId: string;
  storeName: string;
  totalPrevistoLiquido: number;
  totalRealizadoBanco: number;
  totalNaoEntrou: number;
  conciliados: RedeOfxMatchItem[];
  naoEntrou: RedeOfxMatchItem[];
  orfaosBanco: OfxCreditItemClean[];
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/lib/parsers/centralImportManager.ts` [EXTEND]
- Adicionar deduplicação de OFX por `accountKey`/`storeAlias`: se encontrar duas instâncias da mesma conta, mantém a primeira/mais completa e inclui em `alerts.duplicatedOfx`.
- Adicionar deduplicação de OS por `storeAlias`: mantém apenas a primeira e inclui em `alerts.duplicatedOs`.
- Adicionar filtro de Rede sem movimento: se `totalNet <= 0`, descarta o resultado e registra em `alerts.ignoredEmptyRede`.
- Adicionar deduplicação de Rede por `storeName`: se houver mais de um arquivo para a mesma filial, mantém apenas 1 e registra em `alerts.duplicatedRede`.
- Retornar objeto estruturado `alerts: IngestionAlerts` junto de `results`.

### 2. `src/lib/matchers/reconciliadorRedeOfx.ts` [NEW]
- Implementar classe `ReconciliadorRedeOFX`:
  - `parseEFiltrarOfx(ofxCredits)`: aplica filtros de negócio (CREDIT, regex de adquirente no MEMO).
  - `executarReconciliacao()`: executa Greedy 1:1, Lote de Bandeira com tolerância MDR, e lote consolidado loja.
  - Gera os 3 vetores (`conciliados`, `nao_entrou`, `orfaos_banco`).

### 3. `src/components/importacoes/CentralImportWizard.tsx` [MODIFY]
- No Step 1 e Step 2, exibir painel de alertas de ingestão (`BannerAlerts`):
  - Amarelo: Arquivos duplicados ignorados (OFX, OS ou Rede).
  - Azul: Arquivos de Rede sem movimento ignorados.
  - Vermelho: Lojas ativas sem OFX ou sem OS.
- Na etapa 4 (gravação), invocar `ReconciliadorRedeOFX` para cada filial, aplicando diretamente os status `entrou` e `nao_entrou` nas `pos_transactions`.

### 4. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` [MODIFY]
- Exibir abas/cards dos 3 vetores canônicos:
  - ✅ Conciliados no Banco
  - ❌ Não Entrou (Cartões a Compensar)
  - ❓ Órfãos no Banco (Créditos adquirente sem venda na adquirente)

---

## Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

### Cenário 1: Reimportação do Zero com Arquivo Duplicado e Rede Sem Movimento
- **Estado Inicial:** Usuário faz upload de:
  - 10 extratos OFX (sendo 1 duplicado para Dom Pedro).
  - 10 planilhas de OS.
  - 1 relatório da Rede de Piraporinha com R$ 4.642,10 em vendas.
  - 1 relatório da Rede de uma filial sem movimento (R$ 0,00).
- **Ação:** Iniciar processamento no Wizard.
- **Resultado Esperado:**
  - O sistema emite toast/alerta: *"Extrato OFX duplicado de Dom Pedro detectado; mantida apenas uma instância."*
  - O sistema emite aviso: *"Rede sem movimento ignorada."*
  - O motor `ReconciliadorRedeOFX` processa Piraporinha: como há 0 créditos OFX em 10/09, todas as vendas são segregadas no vetor `nao_entrou` (R$ 4.642,10).
  - As filiais com créditos (Dom Pedro, Mauá, Jorge Beretta, Rei do Módulo, Jabaquara) são 100% segregadas no vetor `conciliados`.
  - Zero erros de execução.

### Cenário 2: Alerta de Cobertura de Lojas Faltantes
- **Estado Inicial:** Usuário sobe extratos de apenas 8 das 10 lojas ativas (faltando Mauá e Kennedy).
- **Ação:** Visualizar o resumo de arquivos no Step 1 / Step 2.
- **Resultado Esperado:**
  - O banner de alerta destaca em vermelho: *"Atenção: 2 filiais ativas estão sem extrato bancário (Mauá, Kennedy)."*
  - O botão de confirmação permite prosseguir conscientemente ou adicionar os arquivos faltantes.
