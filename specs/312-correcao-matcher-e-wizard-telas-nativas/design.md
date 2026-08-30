# Design: Correção Definitiva do Matcher (OS x Rede x OFX) e Telas Nativas do Wizard (312)

## Arquitetura de Navegação Sequencial

O componente CentralImportWizard.tsx adota a máquina de estados pura com steps exclusivos de 1 a 8:

`
[Step 1] Upload de Arquivos
   │
   ▼ (Arquivos carregados)
[Step 2] Mapeamento de Filiais
   │
   ▼ (Mapeamento validado)
[Step 3] Preview & Conferência Geral
   │     • Tabela MissingPatioOsEditor (OSs ausentes do relatório)
   │     • Inputs Manuais Globais (Odômetro, Dinheiro MP, A Receber, Contas a Pagar)
   │
   ▼ [Botão: 'Avançar para Conciliação →'] (Dispara Auto-Match OS x Rede x OFX)
[Step 4] Tela A: Vínculo de Pagamentos sem Lançamento na OS
   │     • Exibe apenas as sobras reais onde o gerente não lançou o pagamento
   │     • Modal busca OSs do lote + banco para vínculo em 1 clique
   │
   ▼ [Botão: 'Próximo: Justificativas →']
[Step 5] Tela B: Justificativas de Não-Faturamento por Loja
   │     • Transferências, Aportes, Tarifas, Estornos (editável/cancelável)
   │
   ▼ [Botão: 'Próximo: Conferência de Cofre →']
[Step 6] Tela C: Conferência de Cofre do Daniel
   │     • Pergunta [SIM/NÃO] + Baixa em lote em store_cash_vault
   │
   ▼ [Botão: 'Próximo: Auditoria Final →']
[Step 7] Tela D: Auditoria Final dos 5 Pilares & Gravação
   │     • RPC get_daily_reconciliation_summary + Semáforo ±R$ 50 + Gemini 3.5 Flash Lite
   │
   ▼ [Botão: 'Confirmar e Gravar Importação']
[Step 8] Sucesso / Resumo Executivo Concluído
`

## Algoritmo do Auto-Matcher (OS x Rede x OFX)

O motor executeAutoMatchingEngine é invocado ao sair do Step 3:

`	ypescript
export function executeAutoMatchingEngine(
  results: UnifiedImportResult,
  mapping: Record<string, string>,
  stores: Store[],
  dbOsList: any[]
): {
  unmatchedRede: UnmatchedTx[];
  unmatchedPix: UnmatchedTx[];
  autoMatchedCount: number;
} {
  // 1. Agrupar OSs do lote por store_id
  const osByStore = new Map<string, ParsedOS[]>();
  results.osFiles.filter(r => r.success).forEach(r => {
    const sid = mapping[r.storeAlias];
    if (sid && sid !== 'GLOBAL') {
      if (!osByStore.has(sid)) osByStore.set(sid, []);
      osByStore.get(sid)!.push(...r.osArray);
    }
  });

  // 2. Agrupar OSs do banco por store_id
  dbOsList.forEach(os => {
    if (os.store_id) {
      if (!osByStore.has(os.store_id)) osByStore.set(os.store_id, []);
      osByStore.get(os.store_id)!.push(os);
    }
  });

  // 3. Match Rede x OS (por loja e valor de cartão)
  // Para cada transação da Rede, procura OS na mesma loja que contenha
  // pagamento em cartão (crédito/débito) com valor correspondente (tolerância 0.10)
  // Se encontrar: marca como casada automaticamente.
  // Se não encontrar: entra como sobra real para a Tela A.

  // 4. Match OFX (PIX) x OS (por loja e valor PIX)
  // Para cada entrada PIX do OFX, procura OS na mesma loja com pagamento em PIX
  // Se encontrar: marca como casada automaticamente.
  // Se não encontrar: entra como sobra real para a Tela A.
}
`

## Modal de Vínculo de OS na Tela A

O modal recebe:
- llStoreOs: União deduplicada das OSs importadas no lote (esults.osFiles) daquela loja + OSs do banco (patio_os).
- Cada item exibe: Número da OS, Cliente, Placa, Modelo, Valor Total e Saldo em Aberto.
- Busca instantânea rápida no input de texto.
- Ao clicar: executa vínculo de 1 clique herdando o valor e o meio de pagamento da transação.

## Cenários de Teste (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Transição de Tela e Auto-Match
- **Estado Inicial:** Arquivos carregados e mapeados no Step 3 com 10 OSs pagas no cartão e 10 vendas na Rede de mesmos valores.
- **Ação:** Clicar em "Avançar para Conciliação".
- **Resultado Esperado:** O Step 3 desaparece por completo; a tela muda para o Step 4 (Tela A); as 10 vendas na Rede casam automaticamente e o contador de pendências exibe 0 (ou apenas as transações sem OS).

### Cenário 2: Vínculo Manual na Tela A
- **Estado Inicial:** 1 transação de PIX ou Cartão sem OS na loja Rudge Ramos.
- **Ação:** Clicar em "Vincular à OS" na transação de R$ 1.324,52.
- **Resultado Esperado:** O modal abre exibindo todas as OSs da filial Rudge Ramos (tanto do lote quanto do banco). Ao clicar em uma OS, a pendência é resolvida e sai da lista.
