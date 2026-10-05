import { useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AmountCell } from '@/components/finance/AmountCell';
import { Store, ArrowLeft, CreditCard, Landmark, Car, AlertTriangle, CheckCircle2, Check } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import { StoreCartaoMaquininhaView } from '@/components/conciliacao/StoreCartaoMaquininhaView';
import { StoreExtratoBancarioView } from '@/components/conciliacao/StoreExtratoBancarioView';
import { StoreOrdensServicoView } from '@/components/conciliacao/StoreOrdensServicoView';
import { StoreCardModulo1 } from '@/components/conciliacao/StoreCardModulo1';

import { useTransactionsPorDataELoja } from '@/hooks/useTransactions';
import { useDailySnapshot } from '@/hooks/useDailySnapshot';
import { useDailyReconciliationSummary, StoreCardData } from '@/hooks/useBackendConciliacao';
import { LegacyOsTable } from '@/components/conciliacao/LegacyOsTable';
import { formatCurrency } from '@/lib/utils';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

export const Route = createFileRoute('/conciliacao/$lojaId')({
  component: ConciliacaoLojaPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      date: search.date as string || undefined,
    };
  },
});

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

type TabType = 'cartao' | 'extrato' | 'os';

function TabBtn({ 
  active, 
  onClick, 
  icon: Icon, 
  pendingCount = 0, 
  pendingLabel, 
  tooltip, 
  isVerified,
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon?: any; 
  pendingCount?: number; 
  pendingLabel?: string; 
  tooltip?: string; 
  isVerified?: boolean;
  children: React.ReactNode 
}) {
  return (
    <button 
      onClick={onClick} 
      title={tooltip}
      className={`px-4 py-2.5 border-b-2 text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer relative ${
        active 
          ? 'border-emerald-500 text-white' 
          : 'border-transparent text-[var(--text-tertiary)] hover:text-white hover:border-zinc-700'
      }`}
    >
      {Icon && <Icon size={14} className={active ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'} />}
      <span>{children}</span>
      {pendingCount > 0 ? (
        <span className="flex items-center gap-1.5 ml-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 tabular-nums">
            {pendingLabel || pendingCount}
          </span>
        </span>
      ) : isVerified ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 ml-1" title="Aba conferida sem pendências">
          <Check size={12} className="stroke-[3]" />
        </span>
      ) : null}
    </button>
  );
}

function ConciliacaoLojaPage() {
  const [activeTab, setActiveTab] = useState<TabType>('cartao');
  const { lojaId } = useParams({ from: '/conciliacao/$lojaId' });
  const { date } = Route.useSearch();
  
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data: stores = [] } = useStores();
  const store = stores.find(s => s.id === lojaId);
  const { data: transactions = [] } = useTransactionsPorDataELoja(targetDate, lojaId);
  const { data: currentSnapshot } = useDailySnapshot(targetDate);
  const { data: dailySummary, isLoading: isLoadingSummary } = useDailyReconciliationSummary(targetDate);
  const storesList = dailySummary?.stores || dailySummary?.stores_detail || [];
  const storeRecon = storesList.find(s => s.store_id === lojaId || s.store_id === store?.id || s.store_name?.toLowerCase() === store?.name?.toLowerCase());
  
  const isMarcoZero = (currentSnapshot?.metadata as any)?.is_marco_zero === true;

  const rawLog: any = storeRecon;
  const isMissing = !isLoadingSummary && !rawLog;

  const ofxEntradas = isMissing ? null : Number(rawLog?.ofx_entradas_total ?? rawLog?.entradas_realizadas ?? 0);
  const concEntradas = isMissing ? null : Number(rawLog?.entradas_conciliadas ?? rawLog?.entradas_previsto ?? 0);
  const difEntradas = isMissing ? null : Number(rawLog?.dif_entradas ?? rawLog?.diferenca_entradas ?? 0);

  const ofxSaidas = isMissing ? null : Number(rawLog?.ofx_saidas_total ?? rawLog?.saidas_ofx ?? 0);
  const concSaidas = isMissing ? null : Number(rawLog?.contas_conciliadas ?? rawLog?.contas_loja ?? 0);
  const difSaidas = isMissing ? null : Number(rawLog?.dif_saidas ?? rawLog?.diferenca_saidas ?? 0);

  const cardData: StoreCardData = {
    storeId: lojaId,
    storeName: store?.name || '',
    avatarUrl: store?.avatar_url,
    saldoBanco: isMissing ? null : Number(rawLog?.saldo_banco ?? rawLog?.saldo_banco_ofx ?? 0),
    maquininha: isMissing ? null : Number(rawLog?.maquininha ?? rawLog?.rede_liquido ?? 0),
    pix: isMissing ? null : Number(rawLog?.pix ?? rawLog?.pix_os ?? rawLog?.pix_total ?? 0),
    naLojaOs: isMissing ? null : Number(rawLog?.na_loja_os ?? rawLog?.patio_os ?? 0),
    previsto: isMissing ? null : Number(rawLog?.previsto_ofx ?? concEntradas ?? 0),
    diferenca: isMissing ? null : Number(rawLog?.diferenca ?? rawLog?.diferenca_total ?? 0),
    entradasRealizadas: ofxEntradas,
    entradasPrevisto: concEntradas,
    diferencaEntradas: difEntradas,
    saidasOfx: ofxSaidas,
    contasLoja: concSaidas,
    contasCentralizadas: isMissing ? null : Number(rawLog?.contas_centralizadas ?? 0),
    contasLocais: isMissing ? null : Number(rawLog?.contas_locais ?? 0),
    diferencaSaidas: difSaidas,
    dinheiroLoja: isMissing ? null : Number(rawLog?.dinheiro_loja ?? 0),
    ofxMaquininhas: isMissing ? null : Number(rawLog?.ofx_maquininhas ?? 0),
    pixTotal: isMissing ? null : Number(rawLog?.pix ?? 0),
    statusCompensacao: (rawLog?.status_compensacao || 'sem_movimento'),
    naoEntrouValor: isMissing ? null : Number(rawLog?.nao_entrou_valor ?? 0),
    status: (rawLog?.status || 'pending'),
    isMissingData: isMissing,
    verificacaoVinculos: rawLog?.verificacao_vinculos,
  };

  const verificacaoGroups = rawLog?.verificacao_vinculos?.groups;
  const redePending = verificacaoGroups?.rede_os?.pending ?? 0;
  const extratoPending = (verificacaoGroups?.entradas_ofx?.pending ?? 0) + (verificacaoGroups?.saidas_ofx?.pending ?? 0);
  const osPending = verificacaoGroups?.os_payments?.pending ?? 0;

  if (!store) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
          <Store size={48} className="mb-4 opacity-20" />
          <h2 className="text-xl font-display">Loja não encontrada</h2>
          <Link to="/conciliacao" search={{ date: targetDate }} className="mt-4 text-emerald-400 hover:underline">Voltar para a conciliação</Link>
        </div>
      </AppShell>
    );
  }

  const totalJuros = transactions.filter(t => (t as any).source === 'rede_taxa').reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const isDiferencaOk = !isMissing && Math.abs(cardData.diferenca || 0) <= 0.05 && (cardData.status === 'approved' || cardData.status === 'conciliado');
  const isSemMovimento = !isMissing && (
    (cardData.statusCompensacao === 'sem_movimento' || !cardData.statusCompensacao) &&
    (cardData.maquininha || 0) === 0 &&
    (cardData.pix || 0) === 0 &&
    (cardData.entradasRealizadas || 0) === 0 &&
    (cardData.saidasOfx || 0) === 0 &&
    (cardData.contasLoja || 0) === 0
  );

  return (
    <AppShell>
      <PageContainer variant="finance" className="space-y-6 pb-20 pt-2">
        <div>
          <Link to="/conciliacao" search={{ date: targetDate }} className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-3">
            <ArrowLeft size={14} /> Voltar para Fechamento
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {store.avatar_url ? (
                <img src={store.avatar_url} alt={store.name} className="w-14 h-14 rounded-2xl border border-zinc-800 bg-zinc-900 object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-emerald-400 flex items-center justify-center font-bold text-lg font-mono">
                  {store.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="font-display font-bold text-2xl text-zinc-100">Conciliação: {store.name}</h1>
                <div className="flex items-center gap-3 mt-0.5">
                  <p className="text-xs text-zinc-400 font-mono">Data alvo: {formatDate(targetDate)}</p>
                  {totalJuros > 0 && (
                    <Badge variant="danger" className="flex items-center gap-1 font-medium bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
                      Taxas MDR: {formatCurrency(totalJuros)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {!isLoadingSummary && !storeRecon && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="text-red-400 mt-0.5 shrink-0" size={18} />
            <div>
              <h3 className="text-red-400 font-semibold text-sm">Dados Ausentes na Agregação</h3>
              <p className="text-red-300/80 text-xs mt-1 leading-relaxed">
                A rotina de conciliação do dia não retornou os dados estruturais para esta filial. 
                Isso pode ocorrer se a filial não possui transações (extrato bancário, OS ou maquininha) nesta data,
                ou devido a uma falha na consolidação do sistema. Os cards abaixo exibirão "N/D" (Não Disponível).
              </p>
            </div>
          </div>
        )}

        {/* Banner Executivo de Fechamento Contábil */}
        {!isMissing && !isSemMovimento && (
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            isDiferencaOk 
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
              : 'bg-red-950/20 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              {isDiferencaOk ? (
                <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle size={24} className="text-red-400 shrink-0" />
              )}
              <div>
                <h3 className="font-semibold text-sm">
                  {isDiferencaOk ? 'Fechamento Contábil 100% Conciliado' : `Divergência Contábil de ${formatCurrency(Math.abs(cardData.diferenca || 0))}`}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isDiferencaOk 
                    ? 'Todas as entradas e saídas foram conferidas e validadas sem divergências para esta data.' 
                    : 'Existem pendências de valor entre o extrato bancário e os lançamentos do sistema.'}
                </p>
              </div>
            </div>
            {isDiferencaOk ? (
              <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1 text-xs shrink-0">
                CONCILIADO
              </Badge>
            ) : (
              <Badge variant="danger" className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1 text-xs shrink-0">
                DIVERGÊNCIA
              </Badge>
            )}
          </div>
        )}

        {/* Card Oficial de Fechamento da Filial — Layout Dual-Split com Pilares e Entradas/Saídas */}
        <StoreCardModulo1
          data={cardData}
          date={targetDate}
          disableLink={true}
        />

        {isMarcoZero ? (
          <div className="min-h-[400px]">
            <LegacyOsTable storeId={lojaId} date={targetDate} />
          </div>
        ) : (
          <>
            {/* Navegação entre as 3 Abas Canônicas com Diagnóstico de Pendências */}
            <div className="flex border-b border-[var(--border-subtle)] pb-px overflow-x-auto gap-1">
              <TabBtn 
                active={activeTab === 'cartao'} 
                onClick={() => setActiveTab('cartao')} 
                icon={CreditCard}
                pendingCount={redePending}
                pendingLabel={`${redePending} sem OS`}
                isVerified={verificacaoGroups?.rede_os?.status === 'verified'}
                tooltip={redePending > 0 ? `${redePending} venda(s) de cartão não vinculada(s) a OS` : 'Vendas da Rede conferidas'}
              >
                1. Cartão / Maquininha
              </TabBtn>
              <TabBtn 
                active={activeTab === 'extrato'} 
                onClick={() => setActiveTab('extrato')} 
                icon={Landmark}
                pendingCount={extratoPending}
                pendingLabel={`${extratoPending} a justificar`}
                isVerified={verificacaoGroups?.entradas_ofx?.status === 'verified' && verificacaoGroups?.saidas_ofx?.status === 'verified'}
                tooltip={extratoPending > 0 ? `${extratoPending} lançamento(s) bancário(s) a justificar no extrato (Entradas: ${verificacaoGroups?.entradas_ofx?.pending ?? 0}, Saídas: ${verificacaoGroups?.saidas_ofx?.pending ?? 0})` : 'Extrato 100% conferido'}
              >
                2. Extrato Bancário (OFX & PIX)
              </TabBtn>
              <TabBtn 
                active={activeTab === 'os'} 
                onClick={() => setActiveTab('os')} 
                icon={Car}
                pendingCount={osPending}
                pendingLabel={`${osPending} sem cobertura`}
                isVerified={verificacaoGroups?.os_payments?.status === 'verified'}
                tooltip={osPending > 0 ? `${osPending} pagamento(s) de OS sem cobertura identificada no caixa/cartões` : 'OSs conferidas'}
              >
                3. Ordens de Serviço (OS & Pátio)
              </TabBtn>
            </div>

            {/* Conteúdo das Abas com Banners Contextuais de Diagnóstico */}
            <div className="min-h-[400px] pt-3">
              {activeTab === 'cartao' && redePending > 0 && (
                <div className="mb-4 bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                    <p className="text-rose-200">
                      <strong className="text-rose-400 font-semibold">{redePending} {redePending === 1 ? 'venda' : 'vendas'} de cartão da Rede</strong> nesta filial ainda não {redePending === 1 ? 'foi vinculada' : 'foram vinculadas'} a uma Ordem de Serviço.
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">Vincule a uma OS abaixo ou dê baixa avulsa</span>
                </div>
              )}

              {activeTab === 'extrato' && extratoPending > 0 && (
                <div className="mb-4 bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                    <p className="text-rose-200">
                      <strong className="text-rose-400 font-semibold">{extratoPending} {extratoPending === 1 ? 'lançamento' : 'lançamentos'} bancários</strong> pendentes de justificativa contábil ou vínculo no extrato (Entradas: {verificacaoGroups?.entradas_ofx?.pending ?? 0}, Saídas: {verificacaoGroups?.saidas_ofx?.pending ?? 0}).
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">Classifique a despesa ou vincule à conta a pagar</span>
                </div>
              )}

              {activeTab === 'os' && osPending > 0 && (
                <div className="mb-4 bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                    <p className="text-rose-200">
                      <strong className="text-rose-400 font-semibold">{osPending} {osPending === 1 ? 'pagamento' : 'pagamentos'} de OS</strong> registrados no sistema sem cobertura de cartão, PIX ou dinheiro identificada na conciliação.
                    </p>
                  </div>
                  <span className="text-[11px] text-zinc-400 hidden sm:inline">Confira se o valor entrou no banco ou maquininha</span>
                </div>
              )}

              {activeTab === 'cartao' && <StoreCartaoMaquininhaView storeId={lojaId} date={targetDate} />}
              {activeTab === 'extrato' && <StoreExtratoBancarioView storeId={lojaId} date={targetDate} />}
              {activeTab === 'os' && <StoreOrdensServicoView storeId={lojaId} date={targetDate} />}
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
