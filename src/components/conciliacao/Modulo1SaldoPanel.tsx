import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Landmark, Wallet, Receipt, ShoppingBag, DollarSign, Calculator, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateModulo1Saldo, StoreSaldoState } from '@/lib/modulo1Calculations';

interface Modulo1SaldoPanelProps {
  storesData: StoreSaldoState[];
  selectedDate: string;
  onUpdateStoreField?: (storeId: string, field: string, value: number) => void;
}

export function Modulo1SaldoPanel({ storesData, selectedDate, onUpdateStoreField }: Modulo1SaldoPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [manualDinheiroMp, setManualDinheiroMp] = useState<Record<string, number>>({});

  // Injetar Dinheiro MP manual se o usuário tiver preenchido
  const storesWithManual = storesData.map(st => ({
    ...st,
    dinheiro_mp_manual: manualDinheiroMp[st.store_id] !== undefined ? manualDinheiroMp[st.store_id] : st.dinheiro_mp_manual
  }));

  const { globalCalculated, storesCalculated } = calculateModulo1Saldo(storesWithManual);

  const handleDinheiroMpChange = (storeId: string, valStr: string) => {
    const num = parseFloat(valStr) || 0;
    setManualDinheiroMp(prev => ({ ...prev, [storeId]: num }));
    if (onUpdateStoreField) {
      onUpdateStoreField(storeId, 'dinheiro_mp_manual', num);
    }
  };

  return (
    <Card variant="elevated" className="p-0 overflow-hidden border-[var(--border-subtle)] shadow-2xl">
      {/* Header Principal do Módulo 1 (Aba SALDO) */}
      <div className="p-6 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-bold">
            <Calculator size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-xl text-[var(--text-primary)]">Módulo 1 — Aba SALDO (Saldos Consolidado Lojas)</h2>
              <Badge variant="brand" className="text-[10px]">Planilha 2307</Badge>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Cadeia matemática de fechamento (G13 a G31): Banco Itaú, Dinheiro MP (Manual), Recebíveis, OSs Na Loja e Saldo Livre Real.
            </p>
          </div>
        </div>

        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors self-end md:self-center bg-[var(--bg-canvas)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]"
        >
          <span>{isExpanded ? 'Recolher Detalhes' : 'Expandir Módulo 1'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Grid de 4 Pilares Centrais (G13, G14, G15, G16) */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)]">
        {/* G13: Saldo Banco Itaú */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">SALDO BANCO ITAÚ (G13)</span>
            <Landmark size={16} className="text-[var(--color-accent-light-blue)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--color-accent-light-blue)]">
            <AnimatedNumber value={globalCalculated.saldo_g13} format="currency" />
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">Extrato bancário OFX acumulado</span>
        </div>

        {/* G14: Dinheiro MP (Preenchimento Manual) */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">DINHEIRO MP (G14)</span>
            <Wallet size={16} className="text-[var(--color-accent-teal)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--color-accent-teal)]">
            <AnimatedNumber value={globalCalculated.dinheiro_mp_g14} format="currency" />
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">Espécie + Não Entrou (Lançado Manual)</span>
        </div>

        {/* G15: A Receber (Módulo 3) */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">A RECEBER (G15)</span>
            <Receipt size={16} className="text-[var(--color-primary)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--color-primary)]">
            <AnimatedNumber value={globalCalculated.a_receber_g15} format="currency" />
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">Recebíveis Módulo 3 pendentes</span>
        </div>

        {/* G16: Na Loja (OSs em aberto Módulo 2) */}
        <div className="p-4 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">NA LOJA (G16)</span>
            <ShoppingBag size={16} className="text-[var(--color-accent-warning)]" />
          </div>
          <p className="text-xl font-bold font-mono text-[var(--color-accent-warning)]">
            <AnimatedNumber value={globalCalculated.na_loja_g16} format="currency" />
          </p>
          <span className="text-[10px] text-[var(--text-tertiary)] block">OSs do Pátio pendentes (Módulo 2)</span>
        </div>
      </div>

      {/* Resumo Consolidado de Fórmulas (G17, G21, G23, G27, G29, G31) */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] font-mono text-xs">
        <div>
          <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">SALDO TOTAL (G17)</span>
          <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
            <AnimatedNumber value={globalCalculated.saldo_total_g17} format="currency" />
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">G13 + G14 + G15 + G16</span>
        </div>

        <div>
          <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">CAIXA ATUAL (G21)</span>
          <span className="text-lg font-bold text-[var(--text-primary)] mt-1 block">
            <AnimatedNumber value={globalCalculated.caixa_atual_g21} format="currency" />
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">G17 - Limite Consolidado</span>
        </div>

        <div>
          <span className="text-[10px] text-[var(--text-tertiary)] uppercase block font-semibold">DISPONÍVEL CONTAS (G29)</span>
          <span className="text-lg font-bold text-[var(--color-primary-bright)] mt-1 block">
            <AnimatedNumber value={globalCalculated.disponivel_contas_g29} format="currency" />
          </span>
          <span className="text-[10px] text-[var(--text-tertiary)]">Faturamento (G27) - Fluxo</span>
        </div>

        <div className="p-3 bg-[var(--color-accent-teal)]/10 rounded-xl border border-[var(--color-accent-teal)]/30">
          <span className="text-[10px] text-[var(--color-accent-teal)] uppercase block font-bold">RESULTADO FINAL (G31)</span>
          <span className="text-xl font-bold text-[var(--color-accent-teal)] mt-0.5 block">
            <AnimatedNumber value={globalCalculated.resultado_final_g31} format="currency" />
          </span>
          <span className="text-[10px] text-[var(--color-accent-teal)] opacity-80">Saldo Livre Real Consolidado</span>
        </div>
      </div>

      {/* Detalhamento por Loja Individual (Expansível) */}
      {isExpanded && (
        <div className="p-6 space-y-4 bg-[var(--bg-canvas)]">
          <h4 className="font-display text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} className="text-[var(--color-primary)]" />
            Detalhamento por Loja (Visão Aba SALDO Individual)
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--border-subtle)] text-[10px]">
                  <th className="text-left py-3 px-3">Unidade / Loja</th>
                  <th className="text-right py-3 px-3">Banco Itaú (G13)</th>
                  <th className="text-right py-3 px-3">Dinheiro MP (G14 Manual)</th>
                  <th className="text-right py-3 px-3">A Receber (G15)</th>
                  <th className="text-right py-3 px-3">Na Loja OS (G16)</th>
                  <th className="text-right py-3 px-3">Saldo Total (G17)</th>
                  <th className="text-right py-3 px-3">Resultado Final (G31)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {storesData.map(st => {
                  const calc = storesCalculated[st.store_id] || {
                    saldo_g13: 0,
                    dinheiro_mp_g14: 0,
                    a_receber_g15: 0,
                    na_loja_g16: 0,
                    saldo_total_g17: 0,
                    resultado_final_g31: 0
                  };

                  return (
                    <tr key={st.store_id} className="hover:bg-[var(--bg-surface)] transition-colors">
                      <td className="py-3 px-3 font-semibold text-[var(--text-primary)] font-display text-sm">
                        {st.store_name}
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--color-accent-light-blue)] font-bold">
                        R$ {calc.saldo_g13.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={manualDinheiroMp[st.store_id] !== undefined ? manualDinheiroMp[st.store_id] : (st.dinheiro_mp_manual || '')}
                          onChange={(e) => handleDinheiroMpChange(st.store_id, e.target.value)}
                          className="w-28 text-right bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--color-accent-teal)] font-bold focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--color-primary)]">
                        R$ {calc.a_receber_g15.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--color-accent-warning)]">
                        R$ {calc.na_loja_g16.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[var(--text-primary)]">
                        R$ {calc.saldo_total_g17.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[var(--color-accent-teal)] text-sm">
                        R$ {calc.resultado_final_g31.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
