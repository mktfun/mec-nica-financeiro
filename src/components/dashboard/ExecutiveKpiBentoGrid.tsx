import React from 'react';
import { 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  ArrowRightLeft, 
  Landmark, 
  Car, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ExecutiveDashboardData } from '@/hooks/useExecutiveDashboard';

interface ExecutiveKpiBentoGridProps {
  data?: ExecutiveDashboardData;
  isLoading: boolean;
}

export function ExecutiveKpiBentoGrid({ data, isLoading }: ExecutiveKpiBentoGridProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5 animate-pulse flex flex-col justify-between">
            <div className="h-4 w-24 bg-zinc-800 rounded" />
            <div className="h-8 w-36 bg-zinc-800 rounded" />
            <div className="h-3 w-28 bg-zinc-800/60 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const isFluxoPositivo = data.fluxoCaixa >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      
      {/* 1. CAIXA ATUAL CONSOLIDADO (HERO CARD) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="sm:col-span-2 xl:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/40 border border-indigo-500/30 p-5 shadow-xl flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Wallet size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Caixa Atual Consolidado
              </span>
              <span className="text-[10px] text-zinc-500">Posição oficial dos 5 Pilares</span>
            </div>
          </div>

          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold border ${
            isFluxoPositivo 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {isFluxoPositivo ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {data.variacaoCaixaPerc >= 0 ? '+' : ''}{data.variacaoCaixaPerc}%
          </span>
        </div>

        <div className="my-3">
          <div className="font-mono font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            <AnimatedNumber value={data.caixaAtual} format="currency" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2.5">
          <span>Caixa Anterior:</span>
          <span className="font-mono font-medium text-zinc-300">
            {data.caixaAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </motion.div>

      {/* 2. FATURAMENTO TOTAL */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sm:col-span-2 xl:col-span-2 relative overflow-hidden rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-lg flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={18} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Faturamento Total
              </span>
              <span className="text-[10px] text-zinc-500">OI Base + Ajustes / Aportes</span>
            </div>
          </div>

          {data.odometroHoje > 0 && (
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              Odômetro: {(data.odometroHoje / 1000).toFixed(0)}k
            </span>
          )}
        </div>

        <div className="my-3">
          <div className="font-mono font-extrabold text-2xl sm:text-3xl text-emerald-400 tracking-tight">
            <AnimatedNumber value={data.faturamentoTotal} format="currency" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2.5">
          <span>Ajustes / Aportes:</span>
          <span className="font-mono font-medium text-zinc-300">
            +{data.faturamentoAjustes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </motion.div>

      {/* 3. CONTAS A PAGAR */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-lg flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Contas a Pagar</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <CreditCard size={14} />
          </div>
        </div>

        <div className="my-2">
          <div className="font-mono font-bold text-xl sm:text-2xl text-amber-400 tracking-tight">
            <AnimatedNumber value={data.contasSubtotal} format="currency" />
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2 flex justify-between">
          <span>Juros REDE:</span>
          <span className="font-mono text-zinc-400">{data.jurosRede.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </motion.div>

      {/* 4. FLUXO DE CAIXA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-lg flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Fluxo Líquido</span>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
            isFluxoPositivo ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <ArrowRightLeft size={14} />
          </div>
        </div>

        <div className="my-2">
          <div className={`font-mono font-bold text-xl sm:text-2xl tracking-tight ${
            isFluxoPositivo ? 'text-teal-400' : 'text-rose-400'
          }`}>
            <AnimatedNumber value={data.fluxoCaixa} format="currency" />
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2 flex justify-between">
          <span>Geração Líquida</span>
          <span className="font-mono text-zinc-400">{isFluxoPositivo ? 'Superávit' : 'Déficit'}</span>
        </div>
      </motion.div>

      {/* 5. SALDO BANCOS LÍQUIDO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-lg flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Saldo Bancos</span>
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Landmark size={14} />
          </div>
        </div>

        <div className="my-2">
          <div className="font-mono font-bold text-xl sm:text-2xl text-blue-400 tracking-tight">
            <AnimatedNumber value={data.saldoBancosPositivo} format="currency" />
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2 flex justify-between">
          <span>(-) Cheque Espec.:</span>
          <span className="font-mono text-rose-400">-{data.saldoNegativoItau.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </motion.div>

      {/* 6. PÁTIO DE VEÍCULOS RETIDO */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-lg flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Pátio em Loja</span>
          <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Car size={14} />
          </div>
        </div>

        <div className="my-2">
          <div className="font-mono font-bold text-xl sm:text-2xl text-violet-300 tracking-tight">
            <AnimatedNumber value={data.naLojaOs} format="currency" />
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2 flex justify-between">
          <span>Veículos:</span>
          <span className="font-mono text-zinc-300">{data.totalVeiculosPatio} carros</span>
        </div>
      </motion.div>

    </div>
  );
}
