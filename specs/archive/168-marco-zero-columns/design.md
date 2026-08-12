# Design: Marco Zero Definitivo (168)

## Arquitetura Técnica
1. **Parser (`marcoZeroParser.ts`)**:
   - `MarcoZeroGlobalData`: Mapeia Dinheiro MP, A Receber, Negativo, Caixa. Escaneia iterativamente as colunas G e H da aba SALDO procurando as labels globais.
   - `MarcoZeroStoreData`: Mantém a relação de lojas. Nas abas de OS, escaneia a coluna D para extrair o "Valor a Receber" pendente da OS, assegurando que exista o número da OS na mesma linha.
   - Retorno do parser será `{ global: MarcoZeroGlobalData, stores: MarcoZeroStoreData[] }`.
2. **Componente de UI (`MarcoZeroWizard.tsx`)**:
   - Renderiza 1 Card "Resumo Global" exibindo os dados de `global`.
   - Renderiza N Cards de Lojas, contendo apenas a lista de OSs e o mapping de filial (`Vincular Loja`).
   - Adiciona um `Input type="date"` obrigatório para a **Data Base do Marco Zero**.
3. **Ponto de Entrada (`importacoes/index.tsx` ou similar)**:
   - A rota de importação fará uma checagem (RPC `check_if_daily_snapshots_exists`) ou consulta simples no supabase. Se `count > 0`, o Card do Marco Zero será Omitido/Escondido.

## Interfaces TypeScript
```typescript
export interface MarcoZeroGlobalData {
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
}

export interface MarcoZeroStoreData {
  storeName: string;
  osPendentes: { numero_os: string; data_os: string; valor_os: number }[];
  saldoLoja: number; // Sujeito a confirmação na Open Question
}

export interface MarcoZeroResult {
  global: MarcoZeroGlobalData;
  stores: MarcoZeroStoreData[];
}
```

## Cenários de Verificação
- **Cenário 1:** Ocultar Importador.
  - Ação: O banco tem um `daily_snapshots`.
  - Resultado: A aba/botão "Implantação de Saldo Inicial" não aparece na página de `/importacoes`.
- **Cenário 2:** Gravar Snapshot Global.
  - Ação: Usuário escolhe Dia 09, revisa valores globais, vincula as filiais e clica "Implantar Base".
  - Resultado: `daily_snapshots` cria linha pro dia 09. OSs são distribuídas nas lojas em `estoque_os_pendente`.
