import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Download,
  Filter,
  Layers,
  Store,
  UploadCloud,
  FileSpreadsheet,
  Search,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useMdrAudit } from '@/hooks/useMdrAudit';
import { useStores } from '@/hooks/useStores';
import { parseRedeSalesFile, MdrAuditParsedResult } from '@/lib/parsers/redeSalesParser';

export function MdrAuditView() {
  const { data: stores = [] } = useStores();
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('2026-08-13');
  const [endDate, setEndDate] = useState<string>('2026-08-14');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'divergente' | 'conforme'>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Estado para upload de arquivo sob demanda
  const [uploadedResult, setUploadedResult] = useState<MdrAuditParsedResult | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const { data: auditData, isLoading, refetch } = useMdrAudit({
    storeId: selectedStore === 'all' ? null : selectedStore,
    startDate,
    endDate,
  });

  // Handler de upload de arquivo da Rede para auditoria instantânea
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsing(true);
      const result = await parseRedeSalesFile(file);
      if (!result.success) {
        alert(result.error || 'Erro ao processar arquivo.');
      } else {
        setUploadedResult(result);
        setPage(1);
      }
    } catch (err: any) {
      alert('Erro na leitura do arquivo: ' + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  // Consolidação de dados (arquivo recém-upado OU banco de dados)
  const isViewingUploaded = uploadedResult !== null;

  const totals = useMemo(() => {
    if (isViewingUploaded && uploadedResult) {
      return {
        total_gross: uploadedResult.totalGross,
        total_net: uploadedResult.totalNet,
        total_fees: uploadedResult.totalFees,
        total_overcharge: uploadedResult.totalOvercharge,
        avg_effective_rate_pct: uploadedResult.avgEffectiveRatePct,
        divergent_count: uploadedResult.divergentCount,
        total_count: uploadedResult.transactions.length,
      };
    }
    return auditData?.totals || {
      total_gross: 0,
      total_net: 0,
      total_fees: 0,
      total_overcharge: 0,
      avg_effective_rate_pct: 0,
      divergent_count: 0,
      total_count: 0,
    };
  }, [isViewingUploaded, uploadedResult, auditData]);

  const brandChartData = useMemo(() => {
    if (isViewingUploaded && uploadedResult) {
      return uploadedResult.byBrand.map(b => ({
        brand: b.brand,
        efetiva: b.effectiveRatePct,
        contrato: b.contractedRatePct,
        prejuizo: b.overcharge,
        bruto: b.gross,
      }));
    }
    return (auditData?.by_brand || []).map(b => ({
      brand: b.brand,
      efetiva: b.effective_rate_pct,
      contrato: b.contracted_rate_pct,
      prejuizo: b.overcharge,
      bruto: b.gross,
    }));
  }, [isViewingUploaded, uploadedResult, auditData]);

  const storeBreakdown = useMemo(() => {
    if (isViewingUploaded && uploadedResult) {
      return uploadedResult.byStore;
    }
    return (auditData?.by_store || []).map(s => ({
      storeName: s.store_name,
      gross: s.gross,
      net: s.net,
      fees: s.fees,
      overcharge: s.overcharge,
      effectiveRatePct: s.effective_rate_pct,
      divergentCount: s.divergent_count,
    }));
  }, [isViewingUploaded, uploadedResult, auditData]);

  const rawTransactions = useMemo(() => {
    if (isViewingUploaded && uploadedResult) {
      return uploadedResult.transactions.map((t, idx) => ({
        id: `upl-${idx}`,
        store_name: t.storeName,
        machine_name: t.acquirer,
        payment_method: t.method,
        brand: t.brand,
        gross_amount: t.grossAmount,
        net_amount: t.netAmount,
        fee_amount: t.feeAmount,
        effective_rate_pct: t.effectiveRatePct,
        contracted_rate_pct: t.contractedRatePct,
        divergence_pct: t.divergencePct,
        overcharge_amount: t.overchargeAmount,
        audit_status: t.status,
        occurred_at: t.date,
        target_date: t.date,
      }));
    }
    return auditData?.transactions || [];
  }, [isViewingUploaded, uploadedResult, auditData]);

  // Filtragem da tabela
  const filteredTransactions = useMemo(() => {
    let list = rawTransactions;

    if (statusFilter === 'divergente') {
      list = list.filter(t => t.audit_status === 'divergente' || t.audit_status === 'atencao');
    } else if (statusFilter === 'conforme') {
      list = list.filter(t => t.audit_status === 'conforme');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t => {
        const store = (t.store_name || '').toLowerCase();
        const brand = (t.brand || '').toLowerCase();
        const method = (t.payment_method || '').toLowerCase();
        return store.includes(q) || brand.includes(q) || method.includes(q);
      });
    }

    return list;
  }, [rawTransactions, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // Exportação para contestação bancária
  const handleExportDisputeCsv = () => {
    const divergentOnly = rawTransactions.filter(t => t.overcharge_amount > 0);
    if (divergentOnly.length === 0) {
      return alert('Nenhuma divergência identificada para exportação.');
    }

    const headers = ['Data', 'Loja', 'Bandeira', 'Modalidade', 'Valor Bruto', 'Valor Liquido', 'Taxas Descontadas', 'Taxa Efetiva (%)', 'Taxa Contratada (%)', 'Diferenca (%)', 'Cobrado a Maior (R$)'];
    const rows = divergentOnly.map(t => [
      t.target_date || t.occurred_at,
      `"${t.store_name}"`,
      t.brand,
      `"${t.payment_method}"`,
      t.gross_amount.toFixed(2),
      t.net_amount.toFixed(2),
      t.fee_amount.toFixed(2),
      t.effective_rate_pct.toFixed(2),
      t.contracted_rate_pct.toFixed(2),
      t.divergence_pct.toFixed(2),
      t.overcharge_amount.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `contestacao_taxas_rede_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header com Filtros e Upload */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="text-[var(--color-primary)]" size={22} />
            <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Auditoria de Taxas e MDR de Maquininhas
            </h2>
            {isViewingUploaded && (
              <Badge variant="outline" className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/30 text-xs">
                Arquivo: {uploadedResult?.fileName}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Comparativo entre a MDR efetiva descontada pela adquirente e a taxa acordada em contrato por bandeira e filial.
          </p>
        </div>

        {/* Controles de Filtros e Upload */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Loja */}
          <div className="flex items-center gap-2 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl text-xs">
            <Store size={14} className="text-[var(--text-tertiary)]" />
            <select
              value={selectedStore}
              onChange={e => { setSelectedStore(e.target.value); setPage(1); }}
              className="bg-transparent text-[var(--text-primary)] focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-zinc-900 text-zinc-100">Todas as Lojas</option>
              {stores.map(s => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seletores de Data */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-1.5 rounded-xl text-xs">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">De</span>
            <input
              type="date"
              min="2026-08-13"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] ml-2">Até</span>
            <input
              type="date"
              min="2026-08-13"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none cursor-pointer"
            />
          </div>

          {/* Upload de Relatório de Vendas (CSV/XLSX) */}
          <label className="flex items-center gap-1.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/20 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm">
            <UploadCloud size={14} />
            <span>{isParsing ? 'Processando...' : 'Auditar Novo CSV/XLSX'}</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isParsing}
            />
          </label>

          {isViewingUploaded && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setUploadedResult(null); refetch(); }}
              className="text-xs h-8"
            >
              Voltar ao Banco
            </Button>
          )}
        </div>
      </div>

      {/* 4 KPIs de Auditoria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Volume Bruto */}
        <Card className="p-5 border-l-4 border-l-[var(--color-primary)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Volume Bruto Vendido
            </span>
            <CreditCard size={18} className="text-[var(--color-primary)]" />
          </div>
          <div className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            <AnimatedNumber value={totals.total_gross} format="currency" />
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-subtle)]">
            {totals.total_count} transações auditadas
          </p>
        </Card>

        {/* KPI 2: Total Líquido */}
        <Card className="p-5 border-l-4 border-l-[var(--color-success)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Valor Líquido Creditado
            </span>
            <CheckCircle2 size={18} className="text-[var(--color-success)]" />
          </div>
          <div className="font-display text-2xl font-bold tracking-tight text-[var(--color-success)]">
            <AnimatedNumber value={totals.total_net} format="currency" />
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-subtle)]">
            Disponível em conta
          </p>
        </Card>

        {/* KPI 3: MDR Efetiva Média */}
        <Card className="p-5 border-l-4 border-l-[var(--color-accent-teal)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              MDR Efetiva Global
            </span>
            <TrendingDown size={18} className="text-[var(--color-accent-teal)]" />
          </div>
          <div className="font-display text-2xl font-bold tracking-tight text-[var(--color-accent-teal)]">
            {totals.avg_effective_rate_pct.toFixed(2)}%
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] pt-2 border-t border-[var(--border-subtle)]">
            Total taxas: R$ {totals.total_fees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </Card>

        {/* KPI 4: Prejuízo / Cobrança a Maior */}
        <Card className={`p-5 border-l-4 ${totals.total_overcharge > 0 ? 'border-l-[var(--color-accent-danger)] bg-[var(--color-accent-danger)]/5' : 'border-l-[var(--color-success)]'} space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Cobrança Acima do Contrato
            </span>
            <ShieldAlert size={18} className={totals.total_overcharge > 0 ? 'text-[var(--color-accent-danger)]' : 'text-[var(--color-success)]'} />
          </div>
          <div className={`font-display text-2xl font-bold tracking-tight ${totals.total_overcharge > 0 ? 'text-[var(--color-accent-danger)]' : 'text-[var(--color-success)]'}`}>
            <AnimatedNumber value={totals.total_overcharge} format="currency" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-[11px]">
            <span className="text-[var(--text-tertiary)]">{totals.divergent_count} divergências</span>
            {totals.total_overcharge > 0 && (
              <span className="text-[var(--color-accent-danger)] font-bold text-[10px] bg-[var(--color-accent-danger)]/10 px-1.5 py-0.5 rounded">
                Contestável
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Painel Central: Gráfico Comparativo + Distribuição por Loja */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico Comparativo de Taxas por Bandeira */}
        <Card className="lg:col-span-7 p-5 border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-[var(--color-primary)]" />
              <h4 className="font-display font-semibold text-base text-[var(--text-primary)]">
                Taxa MDR Efetiva vs Contratada por Bandeira
              </h4>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
                Taxa Efetiva Real (%)
              </span>
              <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                Contrato (%)
              </span>
            </div>
          </div>

          {brandChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-tertiary)]">
              <CreditCard size={32} className="opacity-20 mb-2" />
              <p className="text-xs">Nenhuma transação de cartão registrada no período.</p>
            </div>
          ) : (
            <div className="h-[240px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brandChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="brand" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#27272a' }} />
                  <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Tooltip
                    formatter={(val: number, name: string) => [`${Number(val).toFixed(2)}%`, name === 'efetiva' ? 'Taxa Efetiva' : 'Taxa Contratada']}
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '8px',
                      color: '#fafafa',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="efetiva" name="efetiva" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="contrato" name="contrato" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Resumo de Desvios por Loja */}
        <Card className="lg:col-span-5 p-5 border-[var(--border-subtle)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Store size={18} className="text-[var(--color-primary)]" />
              <h4 className="font-display font-semibold text-base text-[var(--text-primary)]">
                Cobrança a Maior por Filial
              </h4>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
              Ranking de Desvio
            </span>
          </div>

          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {storeBreakdown.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-8">Nenhuma filial com dados no período.</p>
            ) : (
              storeBreakdown.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-xs text-[var(--text-primary)]">{s.storeName}</span>
                      {s.divergentCount > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-rose-500/10 text-rose-400 border-rose-500/20">
                          {s.divergentCount}x desvio
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      Bruto: R$ {s.gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • MDR Real: {s.effectiveRatePct.toFixed(2)}%
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`font-display font-bold text-xs ${s.overcharge > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {s.overcharge > 0 ? `+ R$ ${s.overcharge.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Em conformidade'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Tabela de Transações e Contestação */}
      <Card className="p-5 border-[var(--border-subtle)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-[var(--color-primary)]" />
            <h4 className="font-display font-semibold text-base text-[var(--text-primary)]">
              Detalhamento de Transações Auditadas
            </h4>
            <Badge variant="outline" className="text-xs bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
              {filteredTransactions.length} registros
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Campo de Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Buscar por loja, bandeira..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-8 pr-3 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] w-48"
              />
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center gap-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-1 rounded-lg text-xs">
              <button
                onClick={() => { setStatusFilter('all'); setPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${statusFilter === 'all' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'}`}
              >
                Todas
              </button>
              <button
                onClick={() => { setStatusFilter('divergente'); setPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${statusFilter === 'divergente' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-[var(--text-tertiary)]'}`}
              >
                🚨 Divergentes ({totals.divergent_count})
              </button>
              <button
                onClick={() => { setStatusFilter('conforme'); setPage(1); }}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${statusFilter === 'conforme' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm' : 'text-[var(--text-tertiary)]'}`}
              >
                ✅ Conformes
              </button>
            </div>

            {/* Botão de Exportação para Contestação */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDisputeCsv}
              className="text-xs h-8 flex items-center gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            >
              <Download size={14} />
              Exportar Contestação CSV
            </Button>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-tertiary)] uppercase text-[10px] tracking-wider bg-[var(--bg-canvas)]/50">
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Loja</th>
                <th className="py-2.5 px-3">Bandeira / Modalidade</th>
                <th className="py-2.5 px-3 text-right">Valor Bruto</th>
                <th className="py-2.5 px-3 text-right">Líquido</th>
                <th className="py-2.5 px-3 text-right">Taxa Real</th>
                <th className="py-2.5 px-3 text-right">Contrato</th>
                <th className="py-2.5 px-3 text-right">Cobrança a Maior</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-[var(--text-tertiary)]">
                    Nenhuma transação encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx, idx) => (
                  <tr key={tx.id || idx} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-2.5 px-3 text-[var(--text-secondary)] font-mono text-[11px]">
                      {tx.target_date || tx.occurred_at?.substring(0, 10)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)]">
                      {tx.store_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-[var(--bg-canvas)] text-[var(--text-secondary)]">
                          {tx.brand}
                        </Badge>
                        <span className="text-[11px] text-[var(--text-secondary)] truncate max-w-[140px]">
                          {tx.payment_method}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-medium text-[var(--text-primary)]">
                      R$ {tx.gross_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-display text-[var(--color-success)]">
                      R$ {tx.net_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-display font-bold text-[var(--text-primary)]">
                      {tx.effective_rate_pct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-[var(--text-tertiary)]">
                      {tx.contracted_rate_pct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {tx.overcharge_amount > 0 ? (
                        <span className="font-display font-bold text-rose-400">
                          + R$ {tx.overcharge_amount.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {tx.audit_status === 'divergente' ? (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]">
                          🚨 Divergente (+{tx.divergence_pct.toFixed(2)}%)
                        </Badge>
                      ) : tx.audit_status === 'atencao' ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
                          ⚠️ Atenção
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                          ✅ Conforme
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
            <span>
              Página {page} de {totalPages} ({filteredTransactions.length} registros)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 text-xs px-2"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-7 text-xs px-2"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
