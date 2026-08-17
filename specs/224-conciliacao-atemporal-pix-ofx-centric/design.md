# Design: Conciliação Atemporal e Persistente de PIX (OFX-Centric) (224)

## Arquitetura de Dados e Fluxo

```
      [ Extrato OFX (Banco) ]
                 │
                 ▼ (Detecta novos PIXs não vinculados)
      [ Auto-Match Engine (Janela +/- 15 dias) ]
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
 (1 Candidata Exata)  (> 1 Candidata)
       │                   │
       ▼                   ▼
 [ Match Automático ]  [ Sugestão Amarela ]
  (Grava vínculo)      (Confirmação 1 Clique)
       │                   │
       └─────────┬─────────┘
                 ▼
 [ Persistência Supabase ] ──> Blindado contra reimportações diárias de Pátio
```

### 1. Ajustes no Importador de Pátio ([`useOsImportProcessor.ts`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/hooks/useOsImportProcessor.ts))
- Ao processar a planilha de carros em pátio, consultar as OSs já existentes em `estoque_os_pendente` para a loja.
- Para qualquer OS que já tenha `matched_ofx_id` ou status de conciliação, preservar essas referências durante o upsert.

### 2. Ajustes no `useManualMatch.ts` e `useConciliacao.ts`
- No hook `useAvailableStoreOs`:
  - Buscar OSs da loja em um intervalo de datas ampliado ($\pm 15$ dias em torno da data do extrato) que possuam valor declarado de PIX não conciliado.
- Na função de auto-match:
  - Associar automaticamente transações de entrada bancária com a OS única correspondente.

## Cenários de Teste
1. **PIX em Data Diferente da OS:** PIX de R$ 1.000,00 no extrato do dia 10/08 casa perfeitamente com a OS #500 importada no dia 17/08.
2. **Reimportação de Pátio:** Nova planilha de pátio enviada amanhã não desfaz o vínculo da OS #500.
3. **Colisão de Valores:** Duas OSs de R$ 150,00 geram status de sugestão para escolha manual sem forçar match errado.
