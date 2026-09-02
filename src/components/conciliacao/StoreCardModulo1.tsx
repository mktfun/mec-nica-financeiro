import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/Card';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { StoreCardData } from '@/hooks/useBackendConciliacao';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface StoreCardModulo1Props {
  data: StoreCardData;
  date: string;
}

export const StoreCardModulo1: React.FC<StoreCardModulo1Props> = ({ data, date }) => {
  const isDiferencaOk = Math.abs(data.diferenca || 0) <= 0.05 && (data.status === 'approved' || data.status === 'conciliado');
  const hasACompensar = (data.statusCompensacao === 'parcial' || data.statusCompensacao === 'nao_entrou' || data.statusCompensacao === 'a_compensar') && (data.naoEntrouValor || 0) > 0;
  const isSemMovimento = data.statusCompensacao === 'sem_movimento' && (data.maquininha || 0) === 0 && (data.pix || 0) === 0;

  const isDifEntradasOk = Math.abs(data.diferencaEntradas || 0) <= 0.05;
  const isDifSaidasOk = Math.abs(data.diferencaSaidas || 0) <= 0.05;

  // Cor da barra lateral de status da filial
  let barColorClass = 'bg-[var(--color-accent-teal)]';
  if (data.isMissingData) {
    barColorClass = 'bg-red-600';
  } else if (hasACompensar) {
    barColorClass = 'bg-amber-500';
  } else if (!isDiferencaOk && !isSemMovimento) {
    barColorClass = 'bg-[var(--color-accent-danger)]';
  } else if (isSemMovimento) {
    barColorClass = 'bg-zinc-600';
  }

  // Consumo estrito das propriedades pré-calculadas da RPC (zero cálculo no JSX)
  const saldoBancoValor = data.saldoBanco ?? 0;
  const redeTotalValor = data.maquininha ?? 0;
  const patioOsValor = data.naLojaOs ?? 0;
  const naoEntrouValor = data.naoEntrouValor ?? 0;

  const entradasRealizadasValor = data.entradasRealizadas ?? 0;
  const entradasPrevistoValor = data.entradasPrevisto ?? 0;
  const diferencaEntradasValor = data.diferencaEntradas ?? 0;

  const saidasOfxValor = data.saidasOfx ?? 0;
  const contasLojaValor = data.contasLoja ?? 0;
  const diferencaSaidasValor = data.diferencaSaidas ?? 0;

  return (
    <div className="relative group">
      <Link
        to="/conciliacao/$lojaId"
        params={{ lojaId: data.storeId }}
        search={{ date }}
        className="block transition-all hover:scale-[1.003] duration-200"
      >
        <Card className={`p-4 sm:p-5 border flex flex-col xl:flex-row items-stretch justify-between gap-5 transition-all shadow-md hover:shadow-xl cursor-pointer ${
          data.isMissingData ? 'border-red-900/50 hover:border-red-500/50' :
          isDiferencaOk ? 'hover:border-[var(--color-accent-teal)]/40' : (hasACompensar ? 'hover:border-amber-500/40' : 'hover:border-[var(--color-accent-danger)]/40')
        }`}>
          {/* BLOCO ESQUERDO: Identidade da Filial & Balanço Base Empilhado (Vertical Stack) */}
          <div className="w-full xl:w-80 shrink-0 flex gap-3.5">
            <div className={`w-2 self-stretch rounded-full shrink-0 ${barColorClass}`} />
            
            <div className="flex-1 flex flex-col justify-between py-0.5">
              {/* Header da Filial */}
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <div>
                  <p className="font-bold text-base text-white leading-tight">{data.storeName}</p>
                  <span className="text-[10px] text-[var(--text-tertiary)] font-mono">ID: {data.storeId}</span>
                </div>

                {data.isMissingData ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-900/40 text-red-400 border border-red-500/30">
                    ⚠️ DADOS AUSENTES
                  </span>
                ) : (
                  <>
                    {!isDiferencaOk && !hasACompensar && !isSemMovimento && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        DIVERGÊNCIA
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Pilares Empilhados (Vertical Stack - Sem Truncar / Sem Ellipsis) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                {/* 1. SALDO TOTAL */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    SALDO TOTAL
                  </span>
                  <span className={`font-bold text-sm sm:text-base font-mono tabular-nums ${
                    data.isMissingData ? 'text-zinc-500' : saldoBancoValor < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={saldoBancoValor} format="currency" />}
                  </span>
                </div>

                {/* 2. REDE TOTAL (com badge de compensação ao lado) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    REDE TOTAL
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className={`font-bold text-sm font-mono tabular-nums ${data.isMissingData ? 'text-zinc-500' : 'text-cyan-400'}`}>
                      {data.isMissingData ? 'N/D' : <AnimatedNumber value={redeTotalValor} format="currency" />}
                    </span>
                    {!data.isMissingData && (
                      <>
                        {data.statusCompensacao === 'entrou' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            ENTROU
                          </span>
                        )}
                        {hasACompensar && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            A COMPENSAR (+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(naoEntrouValor)})
                          </span>
                        )}
                        {isSemMovimento && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            SEM MOV.
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* 3. SALDO EM PÁTIO (com valor total e legível) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    SALDO EM PÁTIO
                  </span>
                  <span className={`font-bold text-sm font-mono tabular-nums ${data.isMissingData ? 'text-zinc-500' : 'text-amber-400'}`}>
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={patioOsValor} format="currency" />}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BLOCO DIREITO: Split Dual de Diagnóstico (Linha 1: Entradas | Linha 2: Saídas) */}
          <div className="bg-black/30 p-3 sm:p-4 rounded-xl border border-white/5 flex-1 font-sans tabular-nums text-xs flex flex-col justify-between gap-2.5">
            
            {/* LINHA 1 (SUPERIOR): ENTRADAS (OFX Entradas - Créditos Conciliados = Dif. a Justificar) */}
            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                  <ArrowDownLeft size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                    ENTRADAS
                  </span>
                  <span className="text-[9px] text-zinc-500 block">Crédito Banco vs Conciliado</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 flex-1 max-w-lg items-center text-right sm:text-left">
                {/* OFX Entradas (Crédito Real no Banco) */}
                <div>
                  <span className="text-[9px] text-zinc-400 block font-medium">OFX Entradas</span>
                  <span className="text-[8px] text-zinc-500 block truncate" title={data.ofxMaquininhas ? `Lote Rede D-1: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.ofxMaquininhas)}` : 'Crédito no Banco'}>
                    {data.ofxMaquininhas && data.ofxMaquininhas > 0 
                      ? `Rede D-1: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.ofxMaquininhas)}`
                      : 'Crédito no Banco'}
                  </span>
                  <p className="font-mono font-bold text-xs sm:text-sm text-emerald-400 mt-0.5">
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={entradasRealizadasValor} format="currency" />}
                  </p>
                </div>

                {/* Créditos Conciliados (Lotes Rede D-1 + PIX OS Identificados + Justificados) */}
                <div>
                  <span className="text-[9px] text-zinc-400 block font-medium">Conciliado</span>
                  <span className="text-[8px] text-zinc-500 block">Lotes Identificados</span>
                  <p className="font-mono font-bold text-xs sm:text-sm text-zinc-300 mt-0.5">
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={entradasPrevistoValor} format="currency" />}
                  </p>
                </div>

                {/* Dif. a Justificar */}
                <div className="text-right">
                  <span className="text-[9px] text-zinc-400 block font-medium">Dif. a Justificar</span>
                  <span className="text-[8px] text-zinc-500 block">
                    {isDifEntradasOk ? '100% Conciliado' : 'Crédito Órfão'}
                  </span>
                  <p className={`font-mono font-bold text-xs sm:text-sm mt-0.5 ${
                    data.isMissingData ? 'text-zinc-500' : isDifEntradasOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                  }`}>
                    {data.isMissingData ? 'N/D' : (
                      <>
                        {diferencaEntradasValor > 0.05 ? '+' : ''}
                        <AnimatedNumber value={diferencaEntradasValor} format="currency" />
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* LINHA 2 (INFERIOR): SAÍDAS (Saídas OFX - Contas Conciliadas = Dif. a Justificar) */}
            <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-1 rounded bg-rose-500/10 text-rose-400">
                  <ArrowUpRight size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                    SAÍDAS
                  </span>
                  <span className="text-[9px] text-zinc-500 block">Débito Banco vs Despesas</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 flex-1 max-w-lg items-center text-right sm:text-left">
                {/* Saídas OFX (Débito Real no Banco) */}
                <div>
                  <span className="text-[9px] text-zinc-400 block font-medium">Saídas OFX</span>
                  <span className="text-[8px] text-zinc-500 block">Débito no Banco</span>
                  <p className="font-mono font-bold text-xs sm:text-sm text-rose-400 mt-0.5">
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={saidasOfxValor} format="currency" />}
                  </p>
                </div>

                {/* Contas Conciliadas (Boletos da Filial + Despesas Justificadas) */}
                <div>
                  <span className="text-[9px] text-zinc-400 block font-medium">Contas / Boletos</span>
                  <span className="text-[8px] text-zinc-500 block">Despesas da Loja</span>
                  <p className="font-mono font-bold text-xs sm:text-sm text-zinc-300 mt-0.5">
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={contasLojaValor} format="currency" />}
                  </p>
                </div>

                {/* Dif. Saídas */}
                <div className="text-right">
                  <span className="text-[9px] text-zinc-400 block font-medium">Dif. a Justificar</span>
                  <span className="text-[8px] text-zinc-500 block">
                    {isDifSaidasOk ? '100% Conciliado' : 'Débito Órfão'}
                  </span>
                  <p className={`font-mono font-bold text-xs sm:text-sm mt-0.5 ${
                    data.isMissingData ? 'text-zinc-500' : isDifSaidasOk ? 'text-[var(--color-accent-teal)]' : 'text-[var(--color-accent-danger)]'
                  }`}>
                    {data.isMissingData ? 'N/D' : (
                      <>
                        {diferencaSaidasValor > 0.05 ? '-' : ''}
                        <AnimatedNumber value={diferencaSaidasValor} format="currency" />
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </Card>
      </Link>
    </div>
  );
};
