# Design: Ajuste da Tabela de Cartão da Maquininha (Bruto, Taxa MDR, Líquido e Bandeira) (222)

## Arquitetura de Dados

### Modelo de Linha para `osVsRede` em `useConciliacao.ts`
```typescript
interface OsVsRedeRow {
  id: string;
  maquininha_title: string;
  bandeira: string;
  payment_method: string;
  rede_bruto: number;
  taxa_brl: number;
  taxa_percent: number;
  rede_liquido: number;
  os_number: string;
  is_real_os: boolean;
  os_data?: any;
  status: 'PAREADO' | 'LIQUIDADO' | 'PENDENTE';
}
```

### Layout da Tabela `OsVsRedeTable.tsx`
- **Cards Superiores:**
  - Card 1: `Total Cartão (Rede Bruto)` $\rightarrow$ `totalRedeBruto` (Azul/Branco)
  - Card 2: `Taxas MDR Retidas (Total)` $\rightarrow$ `-totalTaxas` (Laranja)
  - Card 3: `Total Líquido Creditado` $\rightarrow$ `totalRedeLiquido` (Verde/Teal)
- **Tabela:**
  - Linhas com tipografia mono para números, badges para bandeiras (*Visa, Master, Elo, Hiper, Amex, PIX*), taxa com percentual destacado, e link para modal da OS quando vinculada.

## Cenários de Teste
1. **Cenário 1:** Uma venda de R$ 1.500,00 com taxa de R$ 11,70 deve exibir Bruto: R$ 1.500,00 | Taxa: -R$ 11,70 (0,8%) | Líquido: R$ 1.488,30.
2. **Cenário 2:** Nenhuma linha deve exibir médias arbitrárias como `R$ 2.907,025`.
3. **Cenário 3:** Quality gate (`npm run build`) com 0 erros.
