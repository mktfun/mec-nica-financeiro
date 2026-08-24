# Design: Motor de OSs Ausentes no Pátio, Sincronização Granular de OSs e Deduplicação da Rede (267)

## Arquitetura Técnica

```
[Step 3 da Importação: CentralImportWizard]
        │
        ├──> [OSs Importadas Hoje]: Lista de OSs encontradas nos .xls (300+ registros)
        │
        ├──> [Motor de Detecção de OSs Ausentes]:
        │       1. Busca em `patio_os` todas as OSs abertas até a data anterior
        │       2. Identifica as que NÃO vieram nos arquivos .xls de hoje
        │       3. Monta o estado `MissingPatioOsItem[]`
        │
        ├──> [MissingPatioOsEditor.tsx]:
        │       ├── Tabela interativa com colunas: Loja | OS | Placa | Total (R$) | Pago (R$) | Saldo Restante | Ação
        │       ├── Inputs numéricos inline para editar Total e Pago
        │       ├── Botões rápidos: [Dar Baixa (Quitada)] [Manter em Pátio] [Excluir]
        │       └── Card com Resumo do Impacto: "Saldo Original: R$ X | Saldo Ajustado: R$ Y (Δ R$ Z)"
        │
        └──> [Sincronização Granular no Banco]:
                ├── Grava atualizações de cada OS em `patio_os`
                └── Recalcula o `total_patio` de cada loja e o global (R$ 88.212,39)
```

## Sincronização Granular das OSs no Banco (`patio_os`)

| Loja | Total no Excel 24/08 | Qtd de OSs no Excel |
|---|---|---|
| **Planalto (st-06)** | **R$ 27.743,80** | 9 OSs (18456, 18455, 18454, 18453, 18452, 18451, 18450, 18433, 18412) |
| **Piraporinha (st-05)** | **R$ 2.820,00** | 9 OSs (40330, 40329, 40328, 40327, 40326, 40323, 40321, 40320, 40302) |
| **Mauá (3a3dd7ce...)** | **R$ 9.890,50** | 18 OSs (22580, 22572, 22570, 22569, 22568, 22567, 22566, 22564, 22563, etc.) |
| **Santo André (st-08)** | **R$ 9.218,73** | 6 OSs (25178, 25177, 25176, 25175, 25174, 25167) |
| **Rei do Módulo (st-09)**| **R$ 11.170,00** | 9 OSs (840, 839, 838, 837, 836, 835, 834, 833, 832) |
| **Jorge Beretta (st-03)** | **R$ 3.515,12** | 8 OSs (18210, 18209, 18208, 18207, 18206, 18205, 18204, 18203) |
| **Dom Pedro (st-01)** | **R$ 6.954,00** | 4 OSs (16980, 16979, 16978, 16977) |
| **Jabaquara (st-02)** | **R$ 6.039,60** | 6 OSs (23180, 23179, 23178, 23177, 23176, 23175) |
| **Capuava & Brasicar** | **R$ 10.860,64** | OSs complementares de Capuava / Brasicar |
| **TOTAL GERAL DO PÁTIO** | **R$ 88.212,39** | **Sincronizado OS a OS** |

## Interfaces TypeScript

```typescript
export interface MissingPatioOsItem {
  id: string;
  os_number: string;
  plate: string;
  store_id: string;
  store_name: string;
  original_total_value: number;
  original_paid_value: number;
  original_status: string;
  total_value: number;
  paid_value: number;
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  opened_at?: string;
  days_open?: number;
  action: 'keep' | 'finish' | 'edit';
}
```

## Deduplicação de Maquininhas (`pos_transactions`)

1. Deletar linha duplicada em `pos_transactions` onde `target_date = '2026-08-24' AND store_id = 'st-08' AND gross_amount = 2850 AND net_amount = 2588.37` mantendo apenas 1 ocorrência.
2. Atualizar rotina de inserção no hook `useCentralImport.ts` com deduplicação prévia por chave composta `target_date_store_gross_net_fee_tid`.
