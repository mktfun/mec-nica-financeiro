import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { CockpitKpis, CockpitStoreDetail } from '@/types/cockpit360';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface DiagnosticActionCardsProps {
  kpis: CockpitKpis;
  stores: CockpitStoreDetail[];
  onQuickSettlePosFee?: (store: CockpitStoreDetail, feeAmount: number) => void;
  onFilterDivergent?: () => void;
  onFilterACompensar?: () => void;
  onOpenStoreModal?: (storeId: string) => void;
}

export function DiagnosticActionCards({
  kpis,
  stores = [],
  onQuickSettlePosFee,
  onFilterDivergent,
  onFilterACompensar,
  onOpenStoreModal
}: DiagnosticActionCardsProps) {
  const safeKpis: CockpitKpis = kpis || {
    total_rede_bruto: 0,
    total_rede_liquido: 0,
    total_rede_taxas: 0,
    total_rede_devolucoes: 0,
    total_ofx_maquininhas: 0,
    total_entrou: 0,
    total_nao_entrou: 0,
    total_a_compensar: 0,
    total_divergente: 0,
    taxa_efetiva_global_pct: 0,
    status_geral: 'conforme'
  };

  const safeStores = stores || [];

  // Lojas conformes (entrou ou sem movimento)
  const conformStores = safeStores.filter(s => s.status_compensacao === 'entrou' || s.status_compensacao === 'sem_movimento');
  const aCompensarStores = safeStores.filter(s => s.status_compensacao === 'a_compensar' || s.status_compensacao === 'parcial');
  const divergentStores = safeStores.filter(s => s.status_compensacao === 'divergente' || s.divergencia_valor > 1.00);

  // Identifica candidato a aluguel de maquininha (diferença entre R$ 118 e R$ 242)
  const posFeeCandidate = safeStores.find(s => {
    const diff = Math.abs((s.rede_liquido || 0) - (s.ofx_maquininhas || 0));
    return (
      (diff >= 118.5 && diff <= 120.5) ||
      (diff >= 238.0 && diff <= 241.0) ||
      (diff >= 357.0 && diff <= 360.0)
    );
  });

  const candidateFee = posFeeCandidate ? Math.abs((posFeeCandidate.rede_liquido || 0) - (posFeeCandidate.ofx_maquininhas || 0)) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      
      {/* Card 1: Lojas 100% Batidas */}
      <div className="bg-zinc-900/90 border border-emerald-900/40 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-emerald-700/60 transition-colors">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-400" />
              Lojas Batidas
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {conformStores.length} de {stores.length}
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
            {formatCurrency(safeKpis.total_entrou)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Crédito bancário 100% conferido e liquidado
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex justify-between items-center">
          <span className="text-zinc-500">Taxa Média:</span>
          <span className="text-zinc-300 font-mono font-medium">{(safeKpis.taxa_efetiva_global_pct || 0).toFixed(2)}% MDR</span>
        </div>
      </div>

      {/* Card 2: Cartões a Compensar */}
      <div 
        onClick={onFilterACompensar}
        className="bg-zinc-900/90 border border-amber-900/40 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-amber-700/60 transition-colors cursor-pointer"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={15} className="text-amber-400" />
              Cartões a Compensar
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {aCompensarStores.length} Filiais
            </span>
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
            {formatCurrency(safeKpis.total_a_compensar || safeKpis.total_nao_entrou)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            Vendas do dia em trânsito legítimo para D+1/D+30
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex justify-between items-center">
          <span className="text-zinc-500">Impacto Caixa:</span>
          <span className="text-amber-300 font-medium text-[11px]">Soma no Pilar 1</span>
        </div>
      </div>

      {/* Card 3: Divergências & Órfãos */}
      <div 
        onClick={onFilterDivergent}
        className={`bg-zinc-900/90 border ${divergentStores.length > 0 ? 'border-rose-900/50 hover:border-rose-700/70' : 'border-zinc-800'} rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden transition-colors cursor-pointer`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className={`text-[11px] font-bold ${divergentStores.length > 0 ? 'text-rose-400' : 'text-zinc-400'} uppercase tracking-wider flex items-center gap-1.5`}>
              <AlertTriangle size={15} className={divergentStores.length > 0 ? 'text-rose-400' : 'text-zinc-500'} />
              Divergências
            </span>
            {divergentStores.length > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 animate-pulse">
                {divergentStores.length} {divergentStores.length === 1 ? 'Loja' : 'Lojas'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                0 Falhas
              </span>
            )}
          </div>
          <p className={`text-2xl font-bold font-mono tracking-tight ${divergentStores.length > 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
            {formatCurrency(safeKpis.total_divergente)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {divergentStores.length > 0 ? 'Diferença não explicada entre Rede e Banco' : 'Todos os lotes possuem batimento consistente'}
          </p>
        </div>
        <div className="pt-3 mt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex justify-between items-center">
          <span className="text-zinc-500">Status Geral:</span>
          <span className={`font-semibold capitalize ${safeKpis.status_geral === 'conforme' ? 'text-emerald-400' : safeKpis.status_geral === 'atencao' ? 'text-amber-400' : 'text-rose-400'}`}>
            {safeKpis.status_geral}
          </span>
        </div>
      </div>

      {/* Card 4: Ação Rápida de Resolução */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-blue-900/40 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={15} className="text-amber-400" />
              Ação Rápida
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
              1-Clique
            </span>
          </div>

          {posFeeCandidate ? (
            <div>
              <p className="text-xs font-semibold text-zinc-200 mb-1 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" />
                Aluguel POS Detectado
              </p>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Filial <strong className="text-zinc-200">{posFeeCandidate.store_name}</strong> retém{' '}
                <span className="text-rose-300 font-mono font-bold">{formatCurrency(candidateFee)}</span> no crédito.
              </p>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => onQuickSettlePosFee?.(posFeeCandidate, candidateFee)}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-1.5 h-auto rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/30"
                >
                  <Zap size={13} className="text-amber-300" />
                  Baixar & Lançar Tarifa ({formatCurrency(candidateFee)})
                </Button>
              </div>
            </div>
          ) : divergentStores.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-zinc-200 mb-1">
                Auditar Loja Divergente
              </p>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Inspecione o detalhamento de <strong className="text-zinc-200">{divergentStores[0].store_name}</strong>.
              </p>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => onOpenStoreModal?.(divergentStores[0].store_id)}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs py-1.5 h-auto rounded-xl flex items-center justify-center gap-1.5 border border-zinc-700"
                >
                  Auditar {divergentStores[0].store_name}
                  <ArrowRight size={13} />
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                <ShieldCheck size={16} />
                Lotes 100% Conciliados
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Nenhuma pendência ou retenção não classificada encontrada para esta data.
              </p>
              <div className="mt-3">
                <div className="text-[11px] font-mono text-emerald-400/90 bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-2.5 py-1.5 text-center font-bold">
                  ✓ Sistema em Conformidade
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="pt-2 mt-2 text-[10px] text-zinc-500 flex justify-between items-center">
          <span>Inteligência Ativa</span>
          <span className="font-mono text-zinc-400">Pós-Motor v6</span>
        </div>
      </div>

    </div>
  );
}
