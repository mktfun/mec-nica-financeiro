import React from 'react';
import { 
  CalendarCheck2, 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  AlertTriangle, 
  Car, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ExecutiveDashboardData } from '@/hooks/useExecutiveDashboard';

interface ExecutiveHeaderProps {
  data?: ExecutiveDashboardData;
  isLoading: boolean;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  availableDates: string[];
}

export function ExecutiveHeader({
  data,
  isLoading,
  selectedDate,
  onSelectDate,
  availableDates = []
}: ExecutiveHeaderProps) {
  const currentIndex = availableDates.indexOf(selectedDate);
  const isFirstDate = currentIndex === 0 && availableDates.length > 0;
  const isLastDate = currentIndex === availableDates.length - 1 && availableDates.length > 0;

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (availableDates.length === 0) return;
    if (currentIndex === -1) {
      onSelectDate(availableDates[availableDates.length - 1]);
      return;
    }
    const nextIdx = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (nextIdx >= 0 && nextIdx < availableDates.length) {
      onSelectDate(availableDates[nextIdx]);
    }
  };

  const formatDateDisplay = (d: string) => {
    if (!d) return '';
    const [year, month, day] = d.split('-');
    return `${day}/${month}/${year}`;
  };

  const isApproved = data?.statusGeral === 'approved';

  return (
    <div className="space-y-4">
      {/* ── BARRA SUPERIOR: TÍTULO + CONTROLES DE DATA ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-zinc-900/60 border border-zinc-800/80 p-4 sm:p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-zinc-100 tracking-tight">
              Visão Geral Executiva
            </h1>
            {!isLoading && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isApproved 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {isApproved ? <ShieldCheck size={13} /> : <Sparkles size={13} />}
                {isApproved ? 'Fechamento Aprovado' : 'Conciliação em Andamento'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Posição consolidada de caixa, DRE do dia e performance das 10 filiais
          </p>
        </div>

        {/* CONTROLE TEMPORAL PROFISSIONAL */}
        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {/* Atalhos Rápidos dos Últimos Fechamentos */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800/80">
            {availableDates.slice(-4).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onSelectDate(d)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer ${
                  selectedDate === d
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {d.split('-').reverse().slice(0, 2).join('/')}
              </button>
            ))}
          </div>

          {/* Seletor com Setas */}
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-xl shadow-inner">
            <button
              type="button"
              onClick={() => handleNavigate('prev')}
              disabled={isLoading || isFirstDate || availableDates.length === 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Fechamento anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1">
              <CalendarCheck2 size={15} className="text-indigo-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onSelectDate(e.target.value)}
                className="bg-transparent border-none outline-none text-xs sm:text-sm text-zinc-100 font-mono font-semibold w-[125px] p-0 focus:ring-0 [&::-webkit-calendar-picker-indicator]:invert-[0.6] cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => handleNavigate('next')}
              disabled={isLoading || isLastDate || availableDates.length === 0}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Próximo fechamento"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── BARRA DE INSIGHTS DA DIRETORIA (EXECUTIVE STRIP) ── */}
      {!isLoading && data && (
        <motion.div 
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          {/* Loja Campeã */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Trophy size={16} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block truncate">
                Campeã de Vendas
              </span>
              <p className="text-xs font-semibold text-zinc-100 truncate">
                {data.lojaLider.name} — <span className="font-mono text-emerald-400">{data.lojaLider.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </p>
            </div>
          </div>

          {/* Cheque Especial Itaú */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 shadow-sm">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              data.saldoNegativoItau > 0 
                ? 'bg-rose-500/10 border-rose-500/20' 
                : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              {data.saldoNegativoItau > 0 ? (
                <AlertTriangle size={16} className="text-rose-400" />
              ) : (
                <ShieldCheck size={16} className="text-emerald-400" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block truncate">
                Cheque Especial Itaú
              </span>
              <p className={`text-xs font-semibold truncate ${
                data.saldoNegativoItau > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {data.saldoNegativoItau > 0 
                  ? `${data.lojasEmChequeEspecial.length} filial(is): -${data.saldoNegativoItau.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                  : 'Nenhuma conta em Cheque Especial'
                }
              </p>
            </div>
          </div>

          {/* Pátio de Veículos Retido */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <Car size={16} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block truncate">
                Veículos em Pátio (OSs)
              </span>
              <p className="text-xs font-semibold text-zinc-100 truncate">
                {data.totalVeiculosPatio} veículos — <span className="font-mono text-indigo-300">{data.naLojaOs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
