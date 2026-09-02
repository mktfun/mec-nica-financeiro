import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Calculator, 
  HelpCircle, 
  Lock, 
  Unlock, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AssistedRevenueCalculatorProps {
  previousOdometro: number;
  initialFaturamentoMesAnterior?: number;
  initialMapaMetasFaturamento?: number;
  odometroHoje: number;
  onApplyCalculatedValue: (value: number) => void;
  isLocked: boolean;
  onToggleLock: () => void;
  onChangeOdometro: (value: number) => void;
  deltaFaturamento: number;
  onChangeFaturamentoMesAnterior?: (value: number) => void;
}

export const AssistedRevenueCalculator: React.FC<AssistedRevenueCalculatorProps> = ({
  previousOdometro,
  initialFaturamentoMesAnterior = 0,
  initialMapaMetasFaturamento = 0,
  odometroHoje,
  onApplyCalculatedValue,
  isLocked,
  onToggleLock,
  onChangeOdometro,
  deltaFaturamento,
  onChangeFaturamentoMesAnterior,
}) => {
  const [faturamentoMesAnterior, setFaturamentoMesAnterior] = useState<number | ''>(
    initialFaturamentoMesAnterior || (previousOdometro > 100000 ? Math.floor(previousOdometro / 100000) * 100000 : '')
  );
  const [mapaMetasFaturamento, setMapaMetasFaturamento] = useState<number | ''>(
    initialMapaMetasFaturamento || ''
  );

  useEffect(() => {
    if (initialFaturamentoMesAnterior > 0 && (faturamentoMesAnterior === '' || faturamentoMesAnterior === 0)) {
      setFaturamentoMesAnterior(initialFaturamentoMesAnterior);
    }
  }, [initialFaturamentoMesAnterior]);

  // Sincronizar se prop mudar
  useEffect(() => {
    if (initialMapaMetasFaturamento > 0 && (mapaMetasFaturamento === '' || mapaMetasFaturamento === 0)) {
      setMapaMetasFaturamento(initialMapaMetasFaturamento);
    }
  }, [initialMapaMetasFaturamento]);

  // Cálculo da Fórmula: (Faturamento Conciliação Anterior - Faturamento Mês Anterior) + Faturamento Mapa de Metas
  const calculatedResult = useMemo(() => {
    const fAnt = Number(previousOdometro) || 0;
    const fMesAnt = Number(faturamentoMesAnterior) || 0;
    const fMetas = Number(mapaMetasFaturamento) || 0;

    const baseMesAnterior = Math.max(0, fAnt - fMesAnt);
    const sugeridoAcumulado = baseMesAnterior + fMetas;
    const faturamentoDia = fMetas > 0 ? fMetas : (sugeridoAcumulado > fAnt ? sugeridoAcumulado - fAnt : 0);

    return {
      fAnt,
      fMesAnt,
      fMetas,
      baseMesAnterior,
      sugeridoAcumulado,
      faturamentoDia
    };
  }, [previousOdometro, faturamentoMesAnterior, mapaMetasFaturamento]);

  const handleApply = () => {
    // Se o valor calculado for relevante, aplica no odômetro
    const valueToSet = calculatedResult.sugeridoAcumulado > 0 
      ? calculatedResult.sugeridoAcumulado 
      : (calculatedResult.fAnt + calculatedResult.fMetas);
    
    if (valueToSet > 0) {
      onApplyCalculatedValue(valueToSet);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-zinc-950 p-5 space-y-4 shadow-xl relative overflow-hidden">
      {/* Glow Superior */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />

      {/* Header do Card Assistido */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Calculator size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Faturamento Assistido (Sem Arquivos de OS)
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border-amber-500/30 px-2 py-0.5">
                Modo Mapa de Metas
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Fórmula: <code className="text-amber-300/90 font-mono">(Conciliação Anterior - Mês Anterior) + Mapa de Metas = Faturamento Atual</code>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleLock}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 bg-zinc-900 transition-colors w-fit"
        >
          {isLocked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-emerald-400" />}
          {isLocked ? 'Travado' : 'Destravado'}
        </button>
      </div>

      {/* Grid com os 3 Componentes da Equação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Conciliação Anterior */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase text-zinc-500 block">
            1. Concil. Anterior (Acumulado)
          </span>
          <p className="text-sm font-bold font-mono text-zinc-200 tabular-nums">
            R$ {calculatedResult.fAnt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-zinc-500">Último snapshot consolidado</span>
        </div>

        {/* 2. Mês Anterior */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-zinc-400 block">
            2. Faturamento Mês Anterior (R$)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            disabled={isLocked}
            value={faturamentoMesAnterior}
            onChange={e => {
              const val = e.target.value === '' ? '' : Number(e.target.value);
              setFaturamentoMesAnterior(val);
              if (typeof val === 'number' && onChangeFaturamentoMesAnterior) {
                onChangeFaturamentoMesAnterior(val);
              }
            }}
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <span className="text-[10px] text-zinc-500 block">Base de encadeamento</span>
        </div>

        {/* 3. Mapa de Metas de Hoje */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1">
          <label className="text-[10px] font-mono uppercase text-zinc-400 block">
            3. Faturamento Mapa de Metas (R$)
          </label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            disabled={isLocked}
            value={mapaMetasFaturamento}
            onChange={e => setMapaMetasFaturamento(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-zinc-950 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <span className="text-[10px] text-zinc-500 block">Movimento do dia</span>
        </div>
      </div>

      {/* Caixa de Resultado & Aplicação */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="text-left">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">
              Faturamento Acumulado Calculado:
            </span>
            <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
              R$ {calculatedResult.sugeridoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="h-8 w-[1px] bg-zinc-800 hidden sm:block" />

          <div className="text-left">
            <span className="text-[10px] font-mono uppercase text-zinc-400 block">
              Delta Faturamento do Dia:
            </span>
            <span className="text-sm font-semibold font-mono text-teal-300 tabular-nums">
              + R$ {calculatedResult.faturamentoDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleApply}
          disabled={isLocked || calculatedResult.sugeridoAcumulado <= 0}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
        >
          <Zap size={14} className="text-zinc-950 fill-zinc-950" />
          Aplicar ao Faturamento do Dia
        </Button>
      </div>

      {/* Input Real do Odômetro (Controlado) */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs">
        <span className="text-zinc-400">
          Valor Efetivo no Input de Faturamento:
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            disabled={isLocked}
            value={odometroHoje || ''}
            onChange={e => onChangeOdometro(Number(e.target.value))}
            placeholder="0.00"
            className="w-36 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-emerald-400 text-right focus:outline-none focus:border-emerald-500 disabled:opacity-50"
          />
          <span className="text-zinc-400 font-mono text-[11px]">
            (&Delta; R$ {deltaFaturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </span>
        </div>
      </div>
    </div>
  );
};
