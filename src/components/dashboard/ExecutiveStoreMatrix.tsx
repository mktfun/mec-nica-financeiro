import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  ExternalLink, 
  TrendingUp, 
  Landmark, 
  Car, 
  ShieldCheck, 
  AlertCircle,
  ArrowUpDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { ExecutiveStoreData } from '@/hooks/useExecutiveDashboard';

interface ExecutiveStoreMatrixProps {
  stores: ExecutiveStoreData[];
  isLoading: boolean;
}

export function ExecutiveStoreMatrix({ stores = [], isLoading }: ExecutiveStoreMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'faturamento' | 'saldo' | 'patio' | 'nome'>('faturamento');
  const [sortAsc, setSortAsc] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-6 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-zinc-800 rounded" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Filtragem e Ordenação
  const filteredStores = stores
    .filter((s) => s.storeName.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let diff = 0;
      if (sortBy === 'faturamento') diff = b.faturamento - a.faturamento;
      else if (sortBy === 'saldo') diff = b.saldoBanco - a.saldoBanco;
      else if (sortBy === 'patio') diff = b.naLojaOs - a.naLojaOs;
      else if (sortBy === 'nome') diff = a.storeName.localeCompare(b.storeName);
      return sortAsc ? -diff : diff;
    });

  const toggleSort = (column: 'faturamento' | 'saldo' | 'patio' | 'nome') => {
    if (sortBy === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(column);
      setSortAsc(false);
    }
  };

  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 shadow-xl overflow-hidden backdrop-blur-sm">
      {/* ── HEADER DA TABELA ── */}
      <div className="p-5 border-b border-zinc-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/40">
        <div>
          <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <Building2 size={18} className="text-indigo-400" />
            <span>Matriz de Performance das 10 Filiais</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ranking financeiro, saldos bancários e conciliação por unidade
          </p>
        </div>

        {/* BUSCADOR */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar filial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ── TABELA EXECUTIVA ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400 select-none">
              <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-200" onClick={() => toggleSort('nome')}>
                <div className="flex items-center gap-1">
                  <span>Filial / Unidade</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-200" onClick={() => toggleSort('faturamento')}>
                <div className="flex items-center gap-1">
                  <span>Faturamento do Dia</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-200" onClick={() => toggleSort('saldo')}>
                <div className="flex items-center gap-1">
                  <span>Saldo Banco Itaú</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3.5 px-4 cursor-pointer hover:text-zinc-200" onClick={() => toggleSort('patio')}>
                <div className="flex items-center gap-1">
                  <span>Pátio OS Retido</span>
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-xs">
            {filteredStores.map((store, index) => {
              const isApproved = store.status === 'approved';

              return (
                <tr 
                  key={store.storeId || index}
                  className="hover:bg-zinc-800/30 transition-colors group"
                >
                  {/* Nome da Loja + Ranking */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 text-[10px] font-mono font-bold flex items-center justify-center text-zinc-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                          {store.storeName}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Faturamento + Barra Proporcional */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5 min-w-[140px]">
                      <p className="font-mono font-bold text-zinc-100">
                        {store.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${Math.max(store.faturamentoProporcao, 4)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Saldo Banco */}
                  <td className="py-3.5 px-4">
                    <p className={`font-mono font-bold ${
                      store.isNegativeBank ? 'text-rose-400' : 'text-zinc-200'
                    }`}>
                      {store.saldoBanco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    {store.isNegativeBank && (
                      <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                        <AlertCircle size={10} /> Cheque Especial
                      </span>
                    )}
                  </td>

                  {/* Pátio OS */}
                  <td className="py-3.5 px-4">
                    <p className="font-mono font-bold text-zinc-200">
                      {store.naLojaOs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    {store.naLojaOs > 0 && (
                      <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Car size={10} /> {store.veiculosPatioCount} carros
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                      isApproved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {isApproved ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
                      {isApproved ? 'Aprovado' : 'Em Análise'}
                    </span>
                  </td>

                  {/* Link para Conciliação */}
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to="/conciliacao/$lojaId"
                      params={{ lojaId: store.storeId }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-indigo-600 text-zinc-300 hover:text-white text-xs font-medium transition-all shadow-sm"
                    >
                      <span>Auditar</span>
                      <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
