import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { StoreCardData } from '@/hooks/useBackendConciliacao';

interface StoreCardModulo1Props {
  data: StoreCardData;
  date: string;
}

export const StoreCardModulo1: React.FC<StoreCardModulo1Props> = ({ data, date }) => {
  const isDiferencaOk = Math.abs(data.diferenca || 0) === 0 && (data.status === 'approved' || data.status === 'conciliado');
  const hasACompensar = (data.statusCompensacao === 'parcial' || data.statusCompensacao === 'nao_entrou' || data.statusCompensacao === 'a_compensar') && (data.naoEntrouValor || 0) > 0;
  const isSemMovimento = data.statusCompensacao === 'sem_movimento' && (data.maquininha || 0) === 0 && (data.pix || 0) === 0;

  // Cor da barra lateral
  let barColorClass = 'bg-[var(--color-accent-teal)]';
  if (hasACompensar) {
    barColorClass = 'bg-amber-500';
  } else if (!isDiferencaOk && !isSemMovimento) {
    barColorClass = 'bg-[var(--color-accent-danger)]';
  } else if (isSemMovimento) {
    barColorClass = 'bg-zinc-600';
  }

  return (
    <div className="relative group">
      <Link
        to="/conciliacao/$lojaId"
        params={{ lojaId: data.storeId }}
        search={{ date }}
        className="block transition-all hover:scale-[1.005] duration-200"
      >
        <Card className={`p-4 sm:p-5 border flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 transition-all shadow-md hover:shadow-xl cursor-pointer ${
          isDiferencaOk ? 'hover:border-[var(--color-accent-teal)]/40' : (hasACompensar ? 'hover:border-amber-500/40' : 'hover:border-[var(--color-accent-danger)]/40')
        }`}>
          {/* Nome da Loja & Badges */}
          <div className="w-full xl:w-64 shrink-0 flex items-center gap-4">
            <div className={`w-2 h-14 rounded-full ${barColorClass}`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-base sm:text-lg text-white leading-tight">{data.storeName}</p>
                {data.statusCompensacao === 'entrou' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    ENTROU
                  </span>
                )}
                {hasACompensar && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    A COMPENSAR (+ {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.naoEntrouValor || 0)})
                  </span>
                )}
                {!isDiferencaOk && !hasACompensar && !isSemMovimento && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    DIVERGÊNCIA
                  </span>
                )}
                {isSemMovimento && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                    SEM MOVIMENTO
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">ID: {data.storeId}</p>
            </div>
          </div>

          {/* Painel Único de Fundo Contínuo Envelopando as 6 Métricas */}
          <div className="bg-black/25 p-4 sm:p-5 rounded-2xl border border-white/5 flex-1 font-sans tabular-nums text-xs">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-6 xl:gap-8 items-center">
              {/* 1. SALDO TOTAL */}
              <div>
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  SALDO TOTAL
                </span>
                <p className={`font-bold text-sm sm:text-base font-mono ${(data.saldoBanco || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  <AnimatedNumber value={data.saldoBanco || 0} format="currency" />
                </p>
              </div>

              {/* 2. Maquininha */}
              <div>
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  Maquininha
                </span>
                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                  <AnimatedNumber value={data.maquininha || 0} format="currency" />
                </p>
              </div>

              {/* 3. PIX */}
              <div>
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  PIX
                </span>
                <p className="font-bold text-sm text-[var(--color-primary)] font-mono">
                  <AnimatedNumber value={data.pix || 0} format="currency" />
                </p>
              </div>

              {/* 4. Na Loja OS */}
              <div>
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  Na Loja OS
                </span>
                <p className="font-bold text-sm text-[var(--color-accent-warning)] font-mono">
                  <AnimatedNumber value={data.naLojaOs || 0} format="currency" />
                </p>
              </div>

              {/* 5. Previsto */}
              <div>
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-1">
                  Previsto
                </span>
                <p className="font-bold text-sm text-[var(--text-primary)] font-mono">
                  <AnimatedNumber value={data.previsto || 0} format="currency" />
                </p>
                <span className="text-[9px] text-[var(--text-tertiary)] block mt-0.5 font-medium">
                  Total Previsto
                </span>
              </div>

              {/* 6. Diferença */}
              <div className="xl:border-l xl:border-white/10 xl:pl-6">
                <span className={`text-[10px] uppercase font-bold tracking-wider block mb-1 ${
                  isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                }`}>
                  Diferença
                </span>
                <p className={`font-bold text-sm font-mono ${
                  isDiferencaOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                }`}>
                  <AnimatedNumber value={data.diferenca || 0} format="currency" />
                </p>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
};
