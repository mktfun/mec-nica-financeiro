import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Building2, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronsUpDown, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Layers, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Cockpit360DiagnosticResponse, 
  CockpitStoreDetail, 
  CockpitBrandDetail, 
  CockpitKpis,
  SettlementStatusType,
  CockpitFilterState
} from '@/types/cockpit360';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';
import { DiagnosticActionCards } from './DiagnosticActionCards';
import { StoreDiagnosticRow, getBrandBadgeStyle } from './StoreDiagnosticRow';
import { MaquininhasDetailModal } from '@/components/conciliacao/MaquininhasDetailModal';
import { usePosTripleReconciliation } from '@/hooks/useBackendConciliacao';

interface PostMotorDiagnosticCockpitProps {
  targetDate: string;
  onRefreshParent?: () => void;
  className?: string;
}

export function PostMotorDiagnosticCockpit({
  targetDate,
  onRefreshParent,
  className = ''
}: PostMotorDiagnosticCockpitProps) {
  const [data, setData] = useState<Cockpit360DiagnosticResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | SettlementStatusType>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [onlyDivergent, setOnlyDivergent] = useState<boolean>(false);

  // Estados de expansão do accordion por loja
  const [expandedStoreIds, setExpandedStoreIds] = useState<Set<string>>(new Set());

  // Modal de detalhe de maquininhas por filial
  const [modalStoreId, setModalStoreId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Hook padrão existente para retrocompatibilidade e cache
  const { refetch: refetchTripleHook } = usePosTripleReconciliation(targetDate);

  const defaultKpis: CockpitKpis = useMemo(() => ({
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
  }), []);

  const normalizeCockpitResponse = (raw: any, date: string): Cockpit360DiagnosticResponse => {
    if (!raw || typeof raw !== 'object') {
      return {
        target_date: date,
        kpis: defaultKpis,
        stores: [],
        by_brand: [],
        flagged_transactions: [],
        total_rede_bruto: 0,
        total_rede_liquido: 0,
        total_rede_taxas: 0,
        total_rede_devolucoes: 0,
        total_ofx_maquininhas: 0,
        total_nao_entrou: 0
      };
    }

    const storesRaw = Array.isArray(raw.stores) ? raw.stores : [];
    
    const normalizedStores: CockpitStoreDetail[] = storesRaw.map((s: any) => {
      const rede_bruto = Number(s?.rede_bruto || 0);
      const rede_liquido = Number(s?.rede_liquido || s?.total_vendas_rede || 0);
      const rede_taxas = Number(s?.rede_taxas || 0);
      const rede_devolucoes = Number(s?.rede_devolucoes || 0);
      const ofx_maquininhas = Number(s?.ofx_maquininhas || 0);
      const a_compensar_valor = Number(s?.a_compensar_valor ?? (s?.status_compensacao === 'a_compensar' ? rede_liquido : 0));
      const entrou_valor = Number(s?.entrou_valor ?? (s?.status_compensacao === 'entrou' ? ofx_maquininhas : (s?.ofx_maquininhas || 0)));
      const nao_entrou_valor = Number(s?.nao_entrou_valor ?? (s?.status_compensacao === 'nao_entrou' ? rede_liquido : 0));
      const divergencia_valor = Number(s?.divergencia_valor ?? Math.abs(rede_liquido - (ofx_maquininhas + a_compensar_valor)));

      return {
        store_id: s?.store_id || s?.id || '',
        store_name: s?.store_name || s?.name || 'Filial',
        rede_bruto,
        rede_liquido,
        rede_taxas,
        rede_devolucoes,
        ofx_maquininhas,
        entrou_valor,
        nao_entrou_valor,
        a_compensar_valor,
        divergencia_valor,
        total_transacoes: Number(s?.total_transacoes || 0),
        transacoes_com_os: Number(s?.transacoes_com_os || 0),
        transacoes_sem_os: Number(s?.transacoes_sem_os || 0),
        status_compensacao: (s?.status_compensacao || 'sem_movimento') as SettlementStatusType,
        brands: Array.isArray(s?.brands) ? s.brands : [],
        ofx_transacoes: Array.isArray(s?.ofx_transacoes) ? s.ofx_transacoes : [],
        total_vendas_rede: Number(s?.total_vendas_rede ?? rede_liquido)
      };
    });

    const total_rede_bruto = Number(raw?.kpis?.total_rede_bruto ?? raw?.total_rede_bruto ?? normalizedStores.reduce((acc, s) => acc + s.rede_bruto, 0));
    const total_rede_liquido = Number(raw?.kpis?.total_rede_liquido ?? raw?.total_rede_liquido ?? normalizedStores.reduce((acc, s) => acc + s.rede_liquido, 0));
    const total_rede_taxas = Number(raw?.kpis?.total_rede_taxas ?? raw?.total_rede_taxas ?? normalizedStores.reduce((acc, s) => acc + s.rede_taxas, 0));
    const total_rede_devolucoes = Number(raw?.kpis?.total_rede_devolucoes ?? raw?.total_rede_devolucoes ?? raw?.total_devolucoes ?? normalizedStores.reduce((acc, s) => acc + s.rede_devolucoes, 0));
    const total_ofx_maquininhas = Number(raw?.kpis?.total_ofx_maquininhas ?? raw?.total_ofx_maquininhas ?? normalizedStores.reduce((acc, s) => acc + s.ofx_maquininhas, 0));
    const total_entrou = Number(raw?.kpis?.total_entrou ?? raw?.total_entrou ?? normalizedStores.reduce((acc, s) => acc + s.entrou_valor, 0));
    const total_nao_entrou = Number(raw?.kpis?.total_nao_entrou ?? raw?.total_nao_entrou ?? normalizedStores.reduce((acc, s) => acc + s.nao_entrou_valor, 0));
    const total_a_compensar = Number(raw?.kpis?.total_a_compensar ?? raw?.total_a_compensar ?? normalizedStores.reduce((acc, s) => acc + s.a_compensar_valor, 0));
    const total_divergente = Number(raw?.kpis?.total_divergente ?? raw?.total_divergente ?? normalizedStores.reduce((acc, s) => acc + s.divergencia_valor, 0));
    const taxa_efetiva_global_pct = Number(raw?.kpis?.taxa_efetiva_global_pct ?? raw?.taxa_efetiva_global_pct ?? (total_rede_bruto > 0 ? Number(((total_rede_taxas / total_rede_bruto) * 100).toFixed(2)) : 0));
    
    const status_geral: CockpitGlobalStatus = (raw?.kpis?.status_geral || raw?.status_geral || (total_divergente > 1.0 ? 'critico' : (total_nao_entrou > 0 ? 'atencao' : 'conforme'))) as CockpitGlobalStatus;

    const kpis: CockpitKpis = {
      total_rede_bruto,
      total_rede_liquido,
      total_rede_taxas,
      total_rede_devolucoes,
      total_ofx_maquininhas,
      total_entrou,
      total_nao_entrou,
      total_a_compensar,
      total_divergente,
      taxa_efetiva_global_pct,
      status_geral
    };

    return {
      target_date: raw?.target_date || date,
      kpis,
      stores: normalizedStores,
      by_brand: Array.isArray(raw?.by_brand) ? raw.by_brand : [],
      flagged_transactions: Array.isArray(raw?.flagged_transactions) ? raw.flagged_transactions : [],
      total_rede_bruto,
      total_rede_liquido,
      total_rede_taxas,
      total_rede_devolucoes,
      total_ofx_maquininhas,
      total_nao_entrou
    };
  };

  // Função para carregar os dados via RPC ou Fallback
  const loadDiagnosticData = async (showLoadingSpinner = true) => {
    if (!targetDate) return;
    if (showLoadingSpinner) setIsLoading(true);
    setError(null);

    try {
      // 1. Tenta chamar a RPC atualizada get_store_pos_triple_reconciliation
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_store_pos_triple_reconciliation', {
        p_target_date: targetDate
      });

      if (!rpcError && rpcData && typeof rpcData === 'object' && ('stores' in (rpcData as any))) {
        const resp = normalizeCockpitResponse(rpcData, targetDate);
        setData(resp);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // 2. Fallback de agregação direta para robustez e zero telas em branco
      console.warn('[Cockpit360] Utilizando fallback de agregação direta client-side:', rpcError?.message);
      
      const [storesRes, posRes, ofxRes] = await Promise.all([
        supabase.from('stores').select('id, name').eq('active', true).order('name'),
        supabase.from('pos_transactions')
          .select('*')
          .or(`target_date.eq.${targetDate},occurred_at.gte.${targetDate}T00:00:00,occurred_at.lte.${targetDate}T23:59:59`),
        supabase.from('ofx_transactions')
          .select('id, store_id, amount, fitid, counterpart_name, title')
          .eq('target_date', targetDate)
          .eq('type', 'in')
      ]);

      const storesList = storesRes.data || [];
      const posList = posRes.data || [];
      const ofxList = (ofxRes.data || []).filter(tx => {
        const str = `${tx.counterpart_name || ''} ${tx.title || ''} ${tx.fitid || ''}`.toLowerCase();
        return str.includes('rede') || str.includes('cielo') || str.includes('stone') || str.includes('pagseguro');
      });

      // Detecção de marcas nas transações
      const getBrandName = (tx: any): string => {
        if (tx.brand) return tx.brand;
        const text = `${tx.machine_name || ''} ${tx.payment_method || ''}`.toLowerCase();
        if (text.includes('visa')) return 'Visa';
        if (text.includes('mast')) return 'Mastercard';
        if (text.includes('elo')) return 'Elo';
        if (text.includes('hiper')) return 'Hipercard';
        if (text.includes('pix')) return 'PIX';
        return 'Outras';
      };

      // Mapeia por loja
      const storesAgg: CockpitStoreDetail[] = storesList.map(s => {
        const storePos = posList.filter(p => p.store_id === s.id);
        const storeOfx = ofxList.filter(o => o.store_id === s.id);

        let rede_bruto = 0;
        let rede_liquido = 0;
        let rede_taxas = 0;
        let rede_devolucoes = 0;
        let entrou_valor = 0;
        let nao_entrou_valor = 0;
        let a_compensar_valor = 0;

        const brandsMap: Record<string, CockpitBrandDetail> = {};

        storePos.forEach(p => {
          const isDevolucao = p.transaction_type === 'devolucao';
          const gross = Number(p.gross_amount || 0);
          const net = Number(p.net_amount || 0);
          const fee = Number(p.fee_amount || 0);
          const status = (p.settlement_status || 'a_compensar') as SettlementStatusType;
          const brand = getBrandName(p);

          if (isDevolucao) {
            rede_devolucoes += Math.abs(net);
          } else {
            rede_bruto += gross;
            rede_liquido += net;
            rede_taxas += fee;

            if (status === 'entrou') entrou_valor += net;
            else if (status === 'nao_entrou' || status === 'divergente') nao_entrou_valor += net;
            else a_compensar_valor += net;

            if (!brandsMap[brand]) {
              brandsMap[brand] = {
                brand,
                bruto: 0,
                liquido: 0,
                taxas: 0,
                entrou: 0,
                nao_entrou: 0,
                a_compensar: 0,
                tx_count: 0,
                status: 'a_compensar'
              };
            }

            brandsMap[brand].bruto += gross;
            brandsMap[brand].liquido += net;
            brandsMap[brand].taxas += fee;
            brandsMap[brand].tx_count += 1;
            if (status === 'entrou') brandsMap[brand].entrou += net;
            else if (status === 'nao_entrou' || status === 'divergente') brandsMap[brand].nao_entrou += net;
            else brandsMap[brand].a_compensar += net;
          }
        });

        const brandsArray = Object.values(brandsMap).map(b => {
          b.taxa_efetiva_pct = b.bruto > 0 ? Number(((b.taxas / b.bruto) * 100).toFixed(2)) : 0;
          if (b.liquido === 0) b.status = 'sem_movimento';
          else if (b.entrou >= b.liquido - 0.05) b.status = 'entrou';
          else if (b.a_compensar >= b.liquido - 0.05) b.status = 'a_compensar';
          else if (b.entrou > 0) b.status = 'parcial';
          else b.status = 'nao_entrou';
          return b;
        }).sort((a, b) => b.liquido - a.liquido);

        const ofx_maquininhas = storeOfx.reduce((acc, o) => acc + Number(o.amount || 0), 0);
        
        let status_compensacao: SettlementStatusType = 'sem_movimento';
        if (rede_liquido === 0 && ofx_maquininhas === 0) status_compensacao = 'sem_movimento';
        else if (Math.abs(rede_liquido - ofx_maquininhas) < 0.10) status_compensacao = 'entrou';
        else if (ofx_maquininhas > 0 && ofx_maquininhas < rede_liquido) status_compensacao = 'parcial';
        else if (ofx_maquininhas === 0 && rede_liquido > 0) status_compensacao = 'a_compensar';
        else status_compensacao = 'divergente';

        const total_transacoes = storePos.length;
        const transacoes_com_os = storePos.filter(p => p.matched_os_number).length;
        const transacoes_sem_os = total_transacoes - transacoes_com_os;
        const divergencia_valor = Math.abs(rede_liquido - (ofx_maquininhas + a_compensar_valor));

        return {
          store_id: s.id,
          store_name: s.name,
          rede_bruto,
          rede_liquido,
          rede_taxas,
          rede_devolucoes,
          total_vendas_rede: rede_liquido,
          ofx_maquininhas,
          entrou_valor,
          nao_entrou_valor,
          a_compensar_valor,
          divergencia_valor,
          total_transacoes,
          transacoes_com_os,
          transacoes_sem_os,
          status_compensacao,
          brands: brandsArray,
          ofx_transacoes: storeOfx.map(o => ({
            id: o.id,
            amount: Number(o.amount || 0),
            fitid: o.fitid || '',
            counterpart: o.counterpart_name || o.title || 'Crédito Rede'
          }))
        };
      });

      // KPIs Globais
      const total_rede_bruto = storesAgg.reduce((acc, s) => acc + s.rede_bruto, 0);
      const total_rede_liquido = storesAgg.reduce((acc, s) => acc + s.rede_liquido, 0);
      const total_rede_taxas = storesAgg.reduce((acc, s) => acc + s.rede_taxas, 0);
      const total_rede_devolucoes = storesAgg.reduce((acc, s) => acc + s.rede_devolucoes, 0);
      const total_ofx_maquininhas = storesAgg.reduce((acc, s) => acc + s.ofx_maquininhas, 0);
      const total_entrou = storesAgg.reduce((acc, s) => acc + s.entrou_valor, 0);
      const total_nao_entrou = storesAgg.reduce((acc, s) => acc + s.nao_entrou_valor, 0);
      const total_a_compensar = storesAgg.reduce((acc, s) => acc + s.a_compensar_valor, 0);
      const total_divergente = storesAgg.reduce((acc, s) => acc + s.divergencia_valor, 0);
      const taxa_efetiva_global_pct = total_rede_bruto > 0 ? Number(((total_rede_taxas / total_rede_bruto) * 100).toFixed(2)) : 0;

      const kpis: CockpitKpis = {
        total_rede_bruto,
        total_rede_liquido,
        total_rede_taxas,
        total_rede_devolucoes,
        total_ofx_maquininhas,
        total_entrou,
        total_nao_entrou,
        total_a_compensar,
        total_divergente,
        taxa_efetiva_global_pct,
        status_geral: total_divergente > 1.0 ? 'critico' : total_nao_entrou > 0 ? 'atencao' : 'conforme'
      };

      // Visão consolidada global por bandeira
      const globalBrandsMap: Record<string, CockpitBrandDetail> = {};
      storesAgg.forEach(st => {
        st.brands.forEach(b => {
          if (!globalBrandsMap[b.brand]) {
            globalBrandsMap[b.brand] = {
              brand: b.brand,
              bruto: 0,
              liquido: 0,
              taxas: 0,
              entrou: 0,
              nao_entrou: 0,
              a_compensar: 0,
              tx_count: 0,
              status: 'a_compensar'
            };
          }
          globalBrandsMap[b.brand].bruto += b.bruto;
          globalBrandsMap[b.brand].liquido += b.liquido;
          globalBrandsMap[b.brand].taxas += b.taxas;
          globalBrandsMap[b.brand].entrou += b.entrou;
          globalBrandsMap[b.brand].nao_entrou += b.nao_entrou;
          globalBrandsMap[b.brand].a_compensar += b.a_compensar;
          globalBrandsMap[b.brand].tx_count += b.tx_count;
        });
      });

      const by_brand = Object.values(globalBrandsMap).map(b => {
        b.taxa_efetiva_pct = b.bruto > 0 ? Number(((b.taxas / b.bruto) * 100).toFixed(2)) : 0;
        b.status = b.entrou >= b.liquido - 0.05 ? 'entrou' : b.a_compensar >= b.liquido - 0.05 ? 'a_compensar' : 'parcial';
        return b;
      }).sort((a, b) => b.liquido - a.liquido);

      setData({
        target_date: targetDate,
        kpis,
        by_brand,
        stores: storesAgg,
        flagged_transactions: [],
        total_rede_bruto,
        total_rede_liquido,
        total_rede_taxas,
        total_rede_devolucoes,
        total_devolucoes: total_rede_devolucoes,
        total_ofx_maquininhas,
        total_nao_entrou: total_a_compensar
      });

    } catch (err: any) {
      console.error('[Cockpit360] Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar conciliação tripla de maquininhas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDiagnosticData();
  }, [targetDate]);

  // Ação Rápida de Baixa de Aluguel POS
  const handleQuickSettlePosFee = async (store: CockpitStoreDetail, feeAmount: number) => {
    try {
      toast.loading(`Lançando aluguel de POS (R$ ${feeAmount.toFixed(2)}) para ${store.store_name}...`, { id: 'settle-fee' });

      // 1. Marca as vendas da loja como liquidadas (entrou)
      const { error: updatePosError } = await supabase
        .from('pos_transactions')
        .update({ 
          settlement_status: 'entrou', 
          settled_date: targetDate,
          settled_amount: store.ofx_maquininhas 
        })
        .eq('store_id', store.store_id)
        .eq('target_date', targetDate);

      if (updatePosError) {
        console.warn('Erro ao atualizar status pos_transactions:', updatePosError);
      }

      // 2. Insere a tarifa na tabela de contas manuais / extrato para fechar o caixa
      const { error: insertBillError } = await supabase
        .from('daily_manual_bills')
        .insert({
          date: targetDate,
          store_id: store.store_id,
          title: `Aluguel Maquininha Rede — ${store.store_name}`,
          description: `Retenção automática adquirente Rede detectada pelo Cockpit 360° (Diferença no depósito)`,
          amount: feeAmount,
          category: 'Taxa Maquininha / Aluguel',
          is_paid: true,
          payment_date: targetDate,
          contabilizar_no_subtotal: true
        });

      if (insertBillError) {
        console.warn('Aviso: Tabela daily_manual_bills não aceitou insert:', insertBillError.message);
      }

      toast.success(`⚡ Lote de ${store.store_name} liquidado com sucesso! Tarifa de R$ ${feeAmount.toFixed(2)} registrada.`, { id: 'settle-fee' });
      
      // Recarrega
      await loadDiagnosticData(false);
      refetchTripleHook();
      onRefreshParent?.();
    } catch (err: any) {
      toast.error(`Falha ao baixar lote: ${err.message}`, { id: 'settle-fee' });
    }
  };

  // Alternar expansão de uma loja
  const toggleStoreExpand = (storeId: string) => {
    setExpandedStoreIds(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      return next;
    });
  };

  // Expandir / Recolher Todas
  const handleToggleExpandAll = () => {
    if (!data?.stores) return;
    if (expandedStoreIds.size === data.stores.length) {
      setExpandedStoreIds(new Set());
    } else {
      setExpandedStoreIds(new Set(data.stores.map(s => s.store_id)));
    }
  };

  // Abertura do modal detalhado
  const handleOpenStoreModal = (storeId: string) => {
    setModalStoreId(storeId);
    setIsModalOpen(true);
  };

  // Filtragem de lojas na tabela
  const filteredStores = useMemo(() => {
    if (!data?.stores) return [];
    return data.stores.filter(st => {
      // Busca textual por nome da filial
      if (searchTerm.trim() && !st.store_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Filtro por status
      if (statusFilter !== 'all' && st.status_compensacao !== statusFilter) {
        return false;
      }
      // Filtro apenas divergentes
      if (onlyDivergent && st.status_compensacao !== 'divergente' && st.divergencia_valor <= 1.0) {
        return false;
      }
      // Filtro por bandeira
      if (selectedBrand !== 'all') {
        const hasBrand = (st.brands || []).some(b => (b?.brand || '').toLowerCase() === selectedBrand.toLowerCase());
        if (!hasBrand) return false;
      }
      return true;
    });
  }, [data?.stores, searchTerm, statusFilter, onlyDivergent, selectedBrand]);

  const allBrandNames = useMemo(() => {
    if (!data?.by_brand) return [];
    return data.by_brand.map(b => b.brand);
  }, [data?.by_brand]);

  if (isLoading) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center space-y-4 shadow-2xl">
        <LoadingSpinner text="Processando diagnóstico 360° pós-motor (Loja x Bandeira x Extrato)..." />
        <p className="text-xs text-zinc-500 font-mono">
          Verificando fitids bancários, retenções de MDR e datas previstas de compensação...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-zinc-950 border border-rose-900/50 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
        <AlertTriangle size={36} className="text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-zinc-100">Falha ao gerar Cockpit de Diagnóstico</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto font-mono">{error || 'Dados indisponíveis'}</p>
        <Button 
          variant="secondary"
          onClick={() => loadDiagnosticData(true)}
          className="inline-flex items-center gap-2"
        >
          <RefreshCw size={14} /> Tentar Novamente
        </Button>
      </div>
    );
  }

  const formattedDate = targetDate.split('-').reverse().join('/');

  return (
    <div className={`bg-zinc-950/95 border border-zinc-800/90 rounded-3xl p-5 sm:p-7 shadow-2xl text-zinc-100 backdrop-blur-xl ${className}`}>
      
      {/* Cabeçalho do Cockpit */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-zinc-100 flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <CreditCard size={18} />
              </span>
              Cockpit de Diagnóstico 360° Pós-Motor
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-900 text-zinc-300 border border-zinc-700">
              {formattedDate}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              (data?.kpis?.status_geral || 'conforme') === 'conforme' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              data?.kpis?.status_geral === 'atencao' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
              'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              ● {data?.kpis?.status_geral || 'conforme'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Batimento pericial: Vendas da Rede (Bruto/Líquido/MDR) × Depósitos Itaú (OFX) × Data de Crédito por Filial e Bandeira.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsRefreshing(true);
              loadDiagnosticData(false);
              refetchTripleHook();
            }}
            disabled={isRefreshing}
            className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs h-9 px-3 rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-400' : ''} />
            Atualizar
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setModalStoreId(null);
              setIsModalOpen(true);
            }}
            className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-9 px-3 rounded-xl flex items-center gap-1.5"
          >
            <ExternalLink size={13} />
            Modal 10 Filiais
          </Button>
        </div>
      </div>

      {/* 4 Action Cards de Topo */}
      <DiagnosticActionCards
        kpis={data?.kpis || defaultKpis}
        stores={data?.stores || []}
        onQuickSettlePosFee={handleQuickSettlePosFee}
        onFilterDivergent={() => {
          setOnlyDivergent(true);
          setStatusFilter('all');
        }}
        onFilterACompensar={() => {
          setOnlyDivergent(false);
          setStatusFilter('a_compensar');
        }}
        onOpenStoreModal={handleOpenStoreModal}
      />

      {/* Faixa Global de Bandeiras Consolidadas */}
      {data.by_brand && data.by_brand.length > 0 && (
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers size={14} className="text-purple-400" />
              Bandeiras Globais:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {data.by_brand.map((b, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedBrand(prev => prev === b.brand ? 'all' : b.brand)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-mono text-xs border transition-all ${
                  selectedBrand === b.brand 
                    ? 'ring-2 ring-blue-500 bg-zinc-800' 
                    : 'hover:bg-zinc-800/60'
                } ${getBrandBadgeStyle(b.brand)}`}
              >
                <span className="font-semibold">{b.brand}:</span>
                <span className="text-zinc-100 font-bold">{formatCurrency(b.liquido)}</span>
                <span className="text-[10px] opacity-70">(-{b.taxa_efetiva_pct}%)</span>
              </button>
            ))}
            {selectedBrand !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedBrand('all')}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 underline font-sans ml-1"
              >
                Limpar filtro
              </button>
            )}
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        
        {/* Chips de Status */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setOnlyDivergent(false); }}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'all' && !onlyDivergent
                ? 'bg-zinc-100 text-zinc-900 shadow'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            Todas ({data?.stores?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('entrou'); setOnlyDivergent(false); }}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'entrou'
                ? 'bg-emerald-500 text-zinc-950 font-bold shadow'
                : 'bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50 border border-emerald-900/40'
            }`}
          >
            <CheckCircle2 size={12} /> Entrou
          </button>

          <button
            type="button"
            onClick={() => { setStatusFilter('a_compensar'); setOnlyDivergent(false); }}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === 'a_compensar'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'bg-amber-950/30 text-amber-400 hover:bg-amber-950/50 border border-amber-900/40'
            }`}
          >
            <Clock size={12} /> A Compensar
          </button>

          <button
            type="button"
            onClick={() => { setOnlyDivergent(true); setStatusFilter('all'); }}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              onlyDivergent
                ? 'bg-rose-500 text-zinc-950 font-bold shadow'
                : 'bg-rose-950/30 text-rose-400 hover:bg-rose-950/50 border border-rose-900/40'
            }`}
          >
            <AlertTriangle size={12} /> Divergentes
          </button>
        </div>

        {/* Campo de Busca e Botão Expandir Todos */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar filial..."
              className="pl-8 text-xs bg-zinc-900/80 border-zinc-800 text-zinc-200 h-8 rounded-xl"
            />
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleToggleExpandAll}
            className="text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 h-8 px-2.5 rounded-xl shrink-0"
            title="Expandir ou recolher todos os accordions"
          >
            {expandedStoreIds.size === (data?.stores?.length || 0) ? (
              <span className="flex items-center gap-1"><ChevronUp size={13} /> Recolher</span>
            ) : (
              <span className="flex items-center gap-1"><ChevronDown size={13} /> Expandir</span>
            )}
          </Button>
        </div>

      </div>

      {/* Tabela Canônica de Alta Densidade */}
      <div className="border border-zinc-800/90 rounded-2xl overflow-hidden bg-zinc-950/80 shadow-inner">
        <div className="overflow-x-auto max-h-[550px] scrollbar-thin scrollbar-thumb-zinc-700">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-zinc-900/95 text-zinc-400 font-semibold border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="py-3 px-4 text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Filial</th>
                <th className="py-3 px-4 text-right text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Venda Rede (Líq)</th>
                <th className="py-3 px-4 text-right text-emerald-400 font-bold uppercase tracking-wider text-[10px]">Creditado OFX</th>
                <th className="py-3 px-4 text-right text-amber-400 font-bold uppercase tracking-wider text-[10px]">A Compensar</th>
                <th className="py-3 px-4 text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Bandeiras Identificadas</th>
                <th className="py-3 px-4 text-center text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Status</th>
                <th className="py-3 px-4 text-center text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-sans">
                    Nenhuma filial encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredStores.map(store => (
                  <StoreDiagnosticRow
                    key={store.store_id}
                    store={store}
                    isExpanded={expandedStoreIds.has(store.store_id)}
                    onToggleExpand={() => toggleStoreExpand(store.store_id)}
                    onOpenStoreModal={handleOpenStoreModal}
                    onQuickSettlePosFee={handleQuickSettlePosFee}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota de Regra Contábil dos 5 Pilares */}
      <div className="mt-5 p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl text-xs text-zinc-400 flex items-start gap-3">
        <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-zinc-200">Garantia Contábil de Fechamento:</strong> Os valores com status{' '}
          <span className="text-amber-300 font-semibold font-mono">A COMPENSAR</span> são integrados integralmente ao Saldo do Pilar 1 (Cartões a Compensar), garantindo que vendas de hoje em débito (D+1) ou crédito (D+30) não criem falsos furos de caixa. Quando entrarem no extrato nos dias subsequentes, a baixa ocorre automaticamente por amarra de lote, mantendo a consistência patrimonial centesimal.
        </div>
      </div>

      {/* Modal de Detalhe de Maquininhas Integrado */}
      <MaquininhasDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalStoreId(null);
        }}
        targetDate={targetDate}
        initialStoreId={modalStoreId}
        data={data as any}
      />

    </div>
  );
}
