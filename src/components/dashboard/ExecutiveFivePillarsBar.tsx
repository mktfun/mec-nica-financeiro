import React from 'react';
import { Landmark, Vault, Clock, Car, AlertTriangle, Equal, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { ExecutiveDashboardData } from '@/hooks/useExecutiveDashboard';

interface ExecutiveFivePillarsBarProps {
  data?: ExecutiveDashboardData;
  isLoading: boolean;
}

export function ExecutiveFivePillarsBar({ data, isLoading }: ExecutiveFivePillarsBarProps) {
  if (isLoading || !data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 shadow-lg backdrop-blur-sm"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <span>Equação Oficial dos 5 Pilares de Caixa</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Auditado 1:1
            </span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Composição canônica da liquidez e ativos de curto prazo
          </p>
        </div>

        <div className="text-xs text-zinc-400 font-mono">
          (=) Caixa Atual: <span className="text-white font-bold">{data.caixaAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
        {/* PILAR 1: BANCOS POSITIVOS */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider">1. Bancos Positivos</span>
            <Landmark size={14} className="text-blue-400" />
          </div>
          <p className="font-mono font-bold text-sm sm:text-base text-blue-400 truncate">
            {data.saldoBancosPositivo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[9px] text-zinc-500 mt-1">10 contas Itaú</span>
        </div>

        {/* PILAR 2: DINHEIRO MP (COFRE) */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider">2. Dinheiro MP</span>
            <Vault size={14} className="text-emerald-400" />
          </div>
          <p className="font-mono font-bold text-sm sm:text-base text-emerald-400 truncate">
            {data.dinheiroMp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[9px] text-zinc-500 mt-1">Cofres & Dinheiro</span>
        </div>

        {/* PILAR 3: A RECEBER */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider">3. A Receber</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <p className="font-mono font-bold text-sm sm:text-base text-amber-400 truncate">
            {data.aReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[9px] text-zinc-500 mt-1">Gestauto & Orion</span>
        </div>

        {/* PILAR 4: NA LOJA OS (PÁTIO) */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider">4. Na Loja OS</span>
            <Car size={14} className="text-violet-400" />
          </div>
          <p className="font-mono font-bold text-sm sm:text-base text-violet-300 truncate">
            {data.naLojaOs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[9px] text-zinc-500 mt-1">{data.totalVeiculosPatio} veículos em pátio</span>
        </div>

        {/* PILAR 5: CHEQUE ESPECIAL (-) */}
        <div className="bg-zinc-950/80 border border-rose-950/40 p-3.5 rounded-xl flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-zinc-400 mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">(-) Cheque Especial</span>
            <AlertTriangle size={14} className="text-rose-400" />
          </div>
          <p className="font-mono font-bold text-sm sm:text-base text-rose-400 truncate">
            -{data.saldoNegativoItau.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
          <span className="text-[9px] text-zinc-500 mt-1">
            {data.lojasEmChequeEspecial.length > 0 ? `${data.lojasEmChequeEspecial.length} loja(s)` : 'Sem saldo negativo'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
