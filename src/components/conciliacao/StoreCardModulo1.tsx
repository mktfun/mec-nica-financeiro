import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { StoreCardData } from '@/hooks/useBackendConciliacao';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export interface StoreCardModulo1Props {
  data: StoreCardData;
  date: string;
  disableLink?: boolean;
  className?: string;
}

export const StoreCardModulo1: React.FC<StoreCardModulo1Props> = ({ data, date, disableLink = false, className = '' }) => {
  const isSemMovimento = data.status === 'sem_movimento' || (
    (data.statusCompensacao === 'sem_movimento' || !data.statusCompensacao) &&
    (data.maquininha || 0) === 0 &&
    (data.pix || 0) === 0 &&
    (data.entradasRealizadas || 0) === 0 &&
    (data.saidasOfx || 0) === 0 &&
    (data.contasLoja || 0) === 0
  );
  const isDiferencaOk = !isSemMovimento && Math.abs(data.diferenca || 0) <= 0.05 && (data.status === 'approved' || data.status === 'conciliado');
  const hasACompensar = (data.statusCompensacao === 'parcial' || data.statusCompensacao === 'nao_entrou' || data.statusCompensacao === 'a_compensar') && (data.naoEntrouValor || 0) > 0;

  const isDifEntradasOk = Math.abs(data.diferencaEntradas || 0) <= 0.05;
  const isDifSaidasOk = Math.abs(data.diferencaSaidas || 0) <= 0.05;

  // Diagnóstico unitário de vínculos (Spec 467 / 477)
  const verificacao = data.verificacaoVinculos;
  const pendingCount = verificacao?.pending_count ?? 0;

  const tooltipVerificacao = verificacao?.groups ? [
    `OS: ${verificacao.groups.os_payments.covered}/${verificacao.groups.os_payments.total} ${verificacao.groups.os_payments.pending > 0 ? '⚠' : '✓'}`,
    `Rede → OS: ${verificacao.groups.rede_os.covered}/${verificacao.groups.rede_os.total} ${verificacao.groups.rede_os.pending > 0 ? '⚠' : '✓'}`,
    `Entradas OFX: ${verificacao.groups.entradas_ofx.covered}/${verificacao.groups.entradas_ofx.total} ${verificacao.groups.entradas_ofx.pending > 0 ? '⚠' : '✓'}`,
    `Saídas OFX: ${verificacao.groups.saidas_ofx.covered}/${verificacao.groups.saidas_ofx.total} ${verificacao.groups.saidas_ofx.pending > 0 ? '⚠' : '✓'}`,
  ].join(' | ') : undefined;

  // Cor da barra lateral de status da filial
  let barColorClass = 'bg-[var(--color-accent-teal)]';
  if (data.isMissingData) {
    barColorClass = 'bg-red-600';
  } else if (isSemMovimento) {
    barColorClass = 'bg-zinc-600';
  } else if (hasACompensar) {
    barColorClass = 'bg-amber-500';
  } else if (!isDiferencaOk) {
    barColorClass = 'bg-[var(--color-accent-danger)]';
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

  const cardElement = (
    <Card className={`p-4 sm:p-5 border flex flex-col xl:flex-row items-stretch justify-between gap-5 transition-all shadow-md ${
      disableLink ? '' : 'hover:shadow-xl cursor-pointer'
    } ${
      data.isMissingData ? 'border-red-900/50 hover:border-red-500/50' :
      isDiferencaOk ? 'hover:border-[var(--color-accent-teal)]/40' : (hasACompensar ? 'hover:border-amber-500/40' : 'hover:border-[var(--color-accent-danger)]/40')
    } ${className}`}>
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

                <div className="flex items-center gap-1.5 flex-wrap">
                  {data.isMissingData ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-900/40 text-red-400 border border-red-500/30">
                      ⚠️ DADOS AUSENTES
                    </span>
                  ) : isSemMovimento ? (
                    <Badge size="sm" variant="neutral">
                      SEM MOVIMENTO
                    </Badge>
                  ) : (
                    <>
                      {/* 1. Status Principal Contábil da Filial */}
                      {isDiferencaOk ? (
                        <Badge size="sm" variant="success">
                          CONCILIADO
                        </Badge>
                      ) : (
                        <Badge 
                          size="sm" 
                          variant="danger" 
                          title={`Diferença contábil: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.diferenca || 0)}`}
                        >
                          DIVERGÊNCIA {data.diferenca ? `(${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(data.diferenca))})` : ''}
                        </Badge>
                      )}

                      {/* 2. Badge de Liquidação Futura de Cartões */}
                      {hasACompensar && (
                        <Badge size="sm" variant="warning" title="Vendas de cartão capturadas aguardando crédito bancário">
                          A COMPENSAR
                        </Badge>
                      )}

                      {/* 3. Diagnóstico Unitário de Vínculos (Apenas se houver pendência real comprovada) */}
                      {pendingCount > 0 ? (
                        <Badge size="sm" variant="warning" dot={false} title={tooltipVerificacao}>
                          {pendingCount === 1 ? '1 item a vincular' : `${pendingCount} itens a vincular`}
                        </Badge>
                      ) : verificacao?.status === 'incomplete' ? (
                        <Badge size="sm" variant="warning" dot={false} title={tooltipVerificacao}>
                          Verificação incompleta
                        </Badge>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {/* Pilares Empilhados (Vertical Stack - Sem Truncar / Sem Ellipsis) */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                {/* 1. SALDO BANCO (OFX) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    SALDO BANCO (OFX)
                  </span>
                  <span className={`font-bold text-sm sm:text-base font-mono tabular-nums ${
                    data.isMissingData ? 'text-zinc-500' : saldoBancoValor < 0 ? 'text-rose-400' : 'text-white'
                  }`}>
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={saldoBancoValor} format="currency" />}
                  </span>
                </div>

                {/* 2. REDE LÍQUIDO (com badge de compensação ao lado) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider" title="Vendas líquidas na adquirente Rede">
                    REDE LÍQUIDO
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className={`font-bold text-sm font-mono tabular-nums ${data.isMissingData ? 'text-zinc-500' : 'text-white'}`}>
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
                  <span className={`font-bold text-sm font-mono tabular-nums ${data.isMissingData ? 'text-zinc-500' : 'text-white'}`}>
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
                  <p className="font-mono font-bold text-xs sm:text-sm text-white mt-0.5">
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
                    {isSemMovimento || (entradasRealizadasValor === 0 && entradasPrevistoValor === 0)
                      ? 'Sem Mov. Entradas'
                      : isDifEntradasOk ? '100% Conciliado' : 'Crédito Órfão'}
                  </span>
                  <p className={`font-mono font-bold text-xs sm:text-sm mt-0.5 ${
                    data.isMissingData ? 'text-zinc-500' : isDifEntradasOk ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {data.isMissingData || data.diferencaEntradas === null || data.diferencaEntradas === undefined ? 'N/D' : (
                      <AnimatedNumber value={isDifEntradasOk ? 0 : diferencaEntradasValor} format="currency" />
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
                  <p className="font-mono font-bold text-xs sm:text-sm text-white mt-0.5">
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={saidasOfxValor} format="currency" />}
                  </p>
                </div>

                {/* Contas Conciliadas (Boletos da Filial + Despesas Justificadas) */}
                <div>
                  <span className="text-[9px] text-zinc-400 block font-medium">Contas / Boletos</span>
                  <span className="text-[8px] text-zinc-500 block truncate" title={data.contasCentralizadas && data.contasCentralizadas > 0 ? `Despesas Locais (C6 Centralizado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.contasCentralizadas)})` : 'Despesas da Loja'}>
                    {data.contasCentralizadas && data.contasCentralizadas > 0 
                      ? (contasLojaValor === 0 ? 'Centralizado C6' : 'Locais (+ C6)') 
                      : (saidasOfxValor === 0 && contasLojaValor > 0 ? 'A Pagar / Sem Débito' : 'Despesas da Loja')}
                  </span>
                  <p className="font-mono font-bold text-xs sm:text-sm text-zinc-300 mt-0.5">
                    {data.isMissingData ? 'N/D' : <AnimatedNumber value={contasLojaValor} format="currency" />}
                  </p>
                </div>

                {/* Dif. Saídas */}
                <div className="text-right">
                  <span className="text-[9px] text-zinc-400 block font-medium">Dif. a Justificar</span>
                  <span className="text-[8px] text-zinc-500 block">
                    {isSemMovimento || (saidasOfxValor === 0 && contasLojaValor === 0)
                      ? 'Sem Mov. Saídas'
                      : saidasOfxValor === 0 && contasLojaValor > 0
                      ? 'Sem Débito no Banco'
                      : isDifSaidasOk ? '100% Conciliado' : 'Débito Órfão'}
                  </span>
                  <p className={`font-mono font-bold text-xs sm:text-sm mt-0.5 ${
                    data.isMissingData ? 'text-zinc-500' : (isDifSaidasOk || saidasOfxValor === 0) ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {data.isMissingData || data.diferencaSaidas === null || data.diferencaSaidas === undefined ? 'N/D' : (
                      <AnimatedNumber value={(isDifSaidasOk || saidasOfxValor === 0) ? 0 : diferencaSaidasValor} format="currency" />
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
  );

  if (disableLink) {
    return <div className="relative group">{cardElement}</div>;
  }

  return (
    <div className="relative group">
      <Link
        to="/conciliacao/$lojaId"
        params={{ lojaId: data.storeId }}
        search={{ date }}
        className="block transition-all hover:scale-[1.003] duration-200"
      >
        {cardElement}
      </Link>
    </div>
  );
};
