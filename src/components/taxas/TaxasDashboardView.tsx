import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  Percent, 
  CreditCard, 
  DollarSign, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Download, 
  Filter, 
  Building2, 
  Layers, 
  Calendar, 
  Search, 
  Settings, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { useMdrAudit, TransactionMdrItem } from '@/hooks/useMdrAudit';
import { useStores } from '@/hooks/useStores';
import { formatCurrency } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend, 
  LineChart, 
  Line, 
  AreaChart, 
  Area 
} from 'recharts';
import { ContractFeeEditorModal } from './ContractFeeEditorModal';

interface TaxasDashboardViewProps {
  initialStoreId?: string | null;
}

export function TaxasDashboardView({ initialStoreId }: TaxasDashboardViewProps) {
  const { stores } = useStores();
  const [selectedStore, setSelectedStore] = useState<string | null>(initialStoreId || null);
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [divergenceOnly, setDivergenceOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dia' | 'transacao' | 'loja' | 'bandeira'>('dia');
  const [isContractModalOpen, setIsContractModalOpen] = useState<boolean>(false);

  // Paginação da tabela de transações
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 25;

  const { data: auditData, isLoading, refetch } = useMdrAudit({
    storeId: selectedStore,
    startDate,
    endDate,
    brand: selectedBrand,
    divergenceOnly,
  });

  const totals = auditData?.totals || {
    total_gross: 0,
    total_net: 0,
    total_fees: 0,
    total_overcharge: 0,
    avg_effective_rate_pct: 0,
    divergent_count: 0,
    total_count: 0,
  };

  // Transações filtradas por busca
  const filteredTransactions = useMemo(() => {
    if (!auditData?.transactions) return [];
    let list = auditData.transactions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.store_name.toLowerCase().includes(q) ||
        t.brand.toLowerCase().includes(q) ||
        t.payment_method.toLowerCase().includes(q) ||
        t.machine_name.toLowerCase().includes(q) ||
        (t.id && t.id.toLowerCase().includes(q))
      );
    }
    return list;
  }, [auditData?.transactions, searchQuery]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Exportar CSV de Contestação
  const handleExportDisputeCsv = () => {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      alert('Nenhuma transação disponível para exportar.');
      return;
    }

    const headers = [
      'ID_Transacao',
      'Data_Venda',
      'Loja',
      'Adquirente_Maquininha',
      'Bandeira',
      'Modalidade',
      'Valor_Bruto_R$',
      'Valor_Liquido_R$',
      'Taxa_Cobrada_R$',
      'MDR_Efetivo_%',
      'MDR_Contrato_%',
      'Desvio_%',
      'Cobranca_A_Maior_R$',
      'Status_Auditoria'
    ];

    const rows = filteredTransactions.map(t => [
      t.id,
      t.target_date || t.occurred_at,
      `"${t.store_name}"`,
      `"${t.machine_name}"`,
      t.brand,
      `"${t.payment_method}"`,
      t.gross_amount.toFixed(2),
      t.net_amount.toFixed(2),
      t.fee_amount.toFixed(2),
      t.effective_rate_pct.toFixed(2),
      t.contracted_rate_pct.toFixed(2),
      t.divergence_pct.toFixed(2),
      t.overcharge_amount.toFixed(2),
      t.audit_status.toUpperCase()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_taxas_mdr_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-500">
      
      {/* CABEÇALHO E FILTROS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Percent size={24} />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-zinc-100 flex items-center gap-2">
                Auditoria de Taxas, MDR & Juros
              </h1>
              <p className="text-xs text-zinc-400">
                Conferência diária e transacional do faturamento bruto, líquido e conformidade contratual de maquininhas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsContractModalOpen(true)}
            className="border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-2"
          >
            <Settings size={15} />
            Gerenciar Taxas do Contrato
          </Button>

          <Button 
            onClick={handleExportDisputeCsv}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40"
          >
            <Download size={15} />
            Exportar Contestação (CSV)
          </Button>
        </div>
      </div>

      {/* BARRA DE FILTROS RÁPIDOS */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Loja */}
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-zinc-500" />
            <select
              value={selectedStore || ''}
              onChange={(e) => setSelectedStore(e.target.value || null)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas as 10 Lojas</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-zinc-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
            <span className="text-zinc-500 text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Seletor de Bandeira */}
          <div className="flex items-center gap-2">
            <CreditCard size={16} className="text-zinc-500" />
            <select
              value={selectedBrand || ''}
              onChange={(e) => setSelectedBrand(e.target.value || null)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Todas as Bandeiras</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Visa">Visa</option>
              <option value="Elo">Elo</option>
              <option value="Hipercard">Hipercard</option>
              <option value="PIX">PIX Maquininha</option>
            </select>
          </div>
        </div>

        {/* Toggle Somente Divergentes */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl hover:border-zinc-700">
            <input
              type="checkbox"
              checked={divergenceOnly}
              onChange={(e) => setDivergenceOnly(e.target.checked)}
              className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900"
            />
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Apenas Cobranças a Maior ({totals.divergent_count})
            </span>
          </label>
        </div>
      </div>

      {/* TOP 5 KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Faturamento Bruto */}
        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Faturamento Bruto</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-mono text-zinc-100">{formatCurrency(totals.total_gross)}</h3>
            <p className="text-[11px] text-zinc-500 mt-1">{totals.total_count} vendas processadas</p>
          </div>
        </div>

        {/* Card 2: Líquido Creditado */}
        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Líquido em Conta</span>
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-mono text-blue-400">{formatCurrency(totals.total_net)}</h3>
            <p className="text-[11px] text-zinc-500 mt-1">Líquido a ser depositado</p>
          </div>
        </div>

        {/* Card 3: Total Retido em Taxas */}
        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Custo de Taxas</span>
            <div className="p-2 bg-zinc-800 rounded-xl text-zinc-300">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-mono text-zinc-300">{formatCurrency(totals.total_fees)}</h3>
            <p className="text-[11px] text-zinc-500 mt-1">MDR + Custos Adquirente</p>
          </div>
        </div>

        {/* Card 4: Taxa MDR Média Global */}
        <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">MDR Médio Efetivo</span>
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
              <Percent size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-mono text-purple-300">
              {totals.avg_effective_rate_pct.toFixed(2)}%
            </h3>
            <p className="text-[11px] text-zinc-500 mt-1">Média ponderada cobrada</p>
          </div>
        </div>

        {/* Card 5: Cobrança a Maior / Desvio */}
        <div className={`p-4 rounded-2xl border relative overflow-hidden ${
          totals.total_overcharge > 0 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-zinc-900 border-zinc-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Cobrado a Maior</span>
            <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold font-mono text-red-400">
              {formatCurrency(totals.total_overcharge)}
            </h3>
            <p className="text-[11px] text-red-400/80 mt-1">
              {totals.divergent_count} transações divergentes
            </p>
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS DE VISUALIZAÇÃO */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('dia')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'dia'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Calendar size={16} />
          Por Dia (Evolução Diária)
        </button>

        <button
          onClick={() => setActiveTab('transacao')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transacao'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Search size={16} />
          Por Transação (Linha a Linha)
        </button>

        <button
          onClick={() => setActiveTab('loja')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'loja'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <Building2 size={16} />
          Por Loja ({auditData?.by_store.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('bandeira')}
          className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'bandeira'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
        >
          <CreditCard size={16} />
          Por Bandeira ({auditData?.by_brand.length || 0})
        </button>
      </div>

      {/* ABA 1: VISÃO POR DIA */}
      {activeTab === 'dia' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Gráfico de Evolução Diária */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h3 className="font-display text-base font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-400" />
              Evolução Diária de Faturamento Bruto vs Líquido vs Taxas
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={auditData?.by_day || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem' }}
                    formatter={(value: any) => [formatCurrency(Number(value)), '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="gross" name="Bruto Maquininha" stroke="#10b981" fillOpacity={1} fill="url(#grossGradient)" />
                  <Area type="monotone" dataKey="net" name="Líquido Creditado" stroke="#3b82f6" fillOpacity={1} fill="url(#netGradient)" />
                  <Line type="monotone" dataKey="fees" name="Taxa Retida (R$)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela de Consolidação Diária */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-zinc-100">
                Consolidação Diária de Taxas
              </h3>
              <span className="text-xs text-zinc-400">
                {(auditData?.by_day || []).length} dias no período
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5 text-center">Vendas</th>
                    <th className="p-3.5 text-right">Faturamento Bruto (R$)</th>
                    <th className="p-3.5 text-right">Líquido Creditado (R$)</th>
                    <th className="p-3.5 text-right">Taxas Retidas (R$)</th>
                    <th className="p-3.5 text-right">MDR Médio (%)</th>
                    <th className="p-3.5 text-right">Cobrado a Maior (R$)</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40 font-mono">
                  {(auditData?.by_day || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500 font-sans">
                        Nenhum registro encontrado no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    (auditData?.by_day || []).map((day) => (
                      <tr key={day.date} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3.5 font-bold text-zinc-200 font-sans">
                          {day.date.split('-').reverse().join('/')}
                        </td>
                        <td className="p-3.5 text-center text-zinc-400">{day.count}</td>
                        <td className="p-3.5 text-right font-bold text-emerald-400">{formatCurrency(day.gross)}</td>
                        <td className="p-3.5 text-right font-bold text-blue-400">{formatCurrency(day.net)}</td>
                        <td className="p-3.5 text-right text-zinc-300">{formatCurrency(day.fees)}</td>
                        <td className="p-3.5 text-right font-bold text-purple-300">{day.effective_rate_pct.toFixed(2)}%</td>
                        <td className={`p-3.5 text-right font-bold ${day.overcharge > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                          {day.overcharge > 0 ? formatCurrency(day.overcharge) : 'R$ 0,00'}
                        </td>
                        <td className="p-3.5 text-center font-sans">
                          {day.divergent_count > 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              {day.divergent_count} divergências
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Conforme
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: VISÃO POR TRANSAÇÃO (LINHA A LINHA) */}
      {activeTab === 'transacao' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por Loja, Bandeira, Modalidade..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="text-xs text-zinc-400">
                Mostrando {paginatedTransactions.length} de {filteredTransactions.length} transações
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Loja</th>
                    <th className="p-3">Bandeira</th>
                    <th className="p-3">Modalidade</th>
                    <th className="p-3 text-right">Bruto (R$)</th>
                    <th className="p-3 text-right">Líquido (R$)</th>
                    <th className="p-3 text-right">Taxa Retida (R$)</th>
                    <th className="p-3 text-right">Taxa Real (%)</th>
                    <th className="p-3 text-right">Contrato (%)</th>
                    <th className="p-3 text-right">Desvio (%)</th>
                    <th className="p-3 text-right">Prejuízo (R$)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40 font-mono">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-zinc-500 font-sans">
                        Nenhuma transação localizada com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3 text-zinc-400 font-sans text-[11px]">
                          {(tx.target_date || tx.occurred_at).split('T')[0].split('-').reverse().join('/')}
                        </td>
                        <td className="p-3 font-sans font-medium text-zinc-200 max-w-[140px] truncate">
                          {tx.store_name}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {tx.brand}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-zinc-400 text-[11px] max-w-[140px] truncate">
                          {tx.payment_method}
                        </td>
                        <td className="p-3 text-right font-bold text-zinc-200">{formatCurrency(tx.gross_amount)}</td>
                        <td className="p-3 text-right font-bold text-blue-400">{formatCurrency(tx.net_amount)}</td>
                        <td className="p-3 text-right text-zinc-400">{formatCurrency(tx.fee_amount)}</td>
                        <td className="p-3 text-right font-bold text-purple-300">{tx.effective_rate_pct.toFixed(2)}%</td>
                        <td className="p-3 text-right text-zinc-400">{tx.contracted_rate_pct.toFixed(2)}%</td>
                        <td className={`p-3 text-right font-bold ${tx.divergence_pct > 0.3 ? 'text-red-400' : tx.divergence_pct > 0.1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {tx.divergence_pct > 0 ? `+${tx.divergence_pct.toFixed(2)}%` : `${tx.divergence_pct.toFixed(2)}%`}
                        </td>
                        <td className={`p-3 text-right font-bold ${tx.overcharge_amount > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                          {tx.overcharge_amount > 0 ? formatCurrency(tx.overcharge_amount) : '-'}
                        </td>
                        <td className="p-3 text-center font-sans">
                          {tx.audit_status === 'divergente' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                              Divergente
                            </span>
                          ) : tx.audit_status === 'atencao' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Atenção
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Conforme
                            </span>
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
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
                <Button 
                  variant="outline" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="text-xs border-zinc-700 text-zinc-300"
                >
                  ← Anterior
                </Button>
                <span className="text-xs text-zinc-400">
                  Página {currentPage} de {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="text-xs border-zinc-700 text-zinc-300"
                >
                  Próxima →
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: VISÃO POR LOJA */}
      {activeTab === 'loja' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-zinc-100">
              Ranking de Desvio e Taxas por Filial (Multi-Loja 1:N)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Filial / Loja</th>
                  <th className="p-3.5 text-right">Faturamento Bruto (R$)</th>
                  <th className="p-3.5 text-right">Líquido Depositado (R$)</th>
                  <th className="p-3.5 text-right">Taxas Retidas (R$)</th>
                  <th className="p-3.5 text-right">Taxa Média Efetiva (%)</th>
                  <th className="p-3.5 text-right">Cobrança a Maior (R$)</th>
                  <th className="p-3.5 text-center">Transações Divergentes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40 font-mono">
                {(auditData?.by_store || []).map((store) => (
                  <tr key={store.store_id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3.5 font-bold font-sans text-zinc-200">{store.store_name}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-400">{formatCurrency(store.gross)}</td>
                    <td className="p-3.5 text-right font-bold text-blue-400">{formatCurrency(store.net)}</td>
                    <td className="p-3.5 text-right text-zinc-300">{formatCurrency(store.fees)}</td>
                    <td className="p-3.5 text-right font-bold text-purple-300">{store.effective_rate_pct.toFixed(2)}%</td>
                    <td className={`p-3.5 text-right font-bold ${store.overcharge > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                      {store.overcharge > 0 ? formatCurrency(store.overcharge) : 'R$ 0,00'}
                    </td>
                    <td className="p-3.5 text-center font-sans">
                      {store.divergent_count > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                          {store.divergent_count} divergências
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          100% Conforme
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: VISÃO POR BANDEIRA */}
      {activeTab === 'bandeira' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
            <h3 className="font-display text-base font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-purple-400" />
              Comparativo de Taxa Real Cobrada vs Contratada por Bandeira
            </h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={auditData?.by_brand || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="brand" stroke="#71717a" fontSize={11} />
                  <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem' }}
                    formatter={(v: any) => [`${Number(v).toFixed(2)}%`, '']}
                  />
                  <Legend />
                  <Bar dataKey="effective_rate_pct" name="Taxa Efetiva Cobrada (%)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="contracted_rate_pct" name="Taxa Contratada (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="font-display font-bold text-base text-zinc-100">
                Detalhamento Financeiro por Bandeira
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Bandeira</th>
                    <th className="p-3.5 text-right">Volume Bruto (R$)</th>
                    <th className="p-3.5 text-right">Líquido (R$)</th>
                    <th className="p-3.5 text-right">Taxa Cobrada (R$)</th>
                    <th className="p-3.5 text-right">MDR Cobrado (%)</th>
                    <th className="p-3.5 text-right">MDR Contrato (%)</th>
                    <th className="p-3.5 text-right">Prejuízo a Maior (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40 font-mono">
                  {(auditData?.by_brand || []).map((b) => (
                    <tr key={b.brand} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3.5 font-bold font-sans text-zinc-200">{b.brand}</td>
                      <td className="p-3.5 text-right font-bold text-emerald-400">{formatCurrency(b.gross)}</td>
                      <td className="p-3.5 text-right font-bold text-blue-400">{formatCurrency(b.net)}</td>
                      <td className="p-3.5 text-right text-zinc-300">{formatCurrency(b.fees)}</td>
                      <td className="p-3.5 text-right font-bold text-purple-300">{b.effective_rate_pct.toFixed(2)}%</td>
                      <td className="p-3.5 text-right text-emerald-400">{b.contracted_rate_pct.toFixed(2)}%</td>
                      <td className={`p-3.5 text-right font-bold ${b.overcharge > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                        {b.overcharge > 0 ? formatCurrency(b.overcharge) : 'R$ 0,00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE CONTRATOS */}
      <ContractFeeEditorModal
        isOpen={isContractModalOpen}
        onClose={() => {
          setIsContractModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
